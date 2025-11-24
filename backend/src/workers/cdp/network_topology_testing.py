from time import sleep
import paramiko
import re
import json
from collections import defaultdict, deque
import os
import urllib.request
import math     # used inside calculate_device_positions
import sys

def log(msg: str):
    try:
        print(msg, file=sys.stderr, flush=True)
    except Exception:
        pass

# ================================================================
#  CORE DISCOVERY CLASS
# ================================================================
class NetworkTopologyDiscovery:
    def __init__(self, username, password):
        self.username = username
        self.password = password
        self.discovered_devices = {}   # ip -> device_info
        self.topologies = []           # list of topology dicts
        self.visited_ips = set()
        self.connections = []          # {from,to,from_hostname,to_hostname}
        self.covered_seed_ips = set()  # IP yang sudah tercakup sebagai neighbor dari seed sebelumnya

    # ----------------------------------------------------------------
    #  HELPERS
    # ----------------------------------------------------------------
    def get_device_icon(self, device_type):
        icon_mapping = {
            "router": "router.jpg",
            "switch": "server switch.jpg",
            "firewall": "router w firewall.jpg",
            "server": "www server.jpg",
            "workstation": "workstation.jpg",
            "wireless": "wireless.jpg"
        }
        return f"doc_jpg/{icon_mapping.get(device_type, 'router.jpg')}"

    def ssh_connect(self, ip):
        try:
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            ssh.connect(ip, username=self.username, password=self.password,
                        banner_timeout=200, timeout=10, look_for_keys=False, allow_agent=False)
            return ssh
        except Exception as e:
            log(f"SSH failed to {ip}: {e}")
            return None
        

    def send_command(self, connection, command):
        try:
            connection.send(command + "\n")
            sleep(1)
            connection.send("\n")
            sleep(1)
            output = ""
            timeout = 0
            while timeout < 10:
                if connection.recv_ready():
                    output += connection.recv(65535).decode()
                    timeout = 0
                else:
                    sleep(0.5)
                    timeout += 0.5
            return output
        except Exception as e:
            log(f"Command error: {e}")
            return ""

    # ----------------------------------------------------------------
    #  DEVICE INFO HELPERS
    # ----------------------------------------------------------------
    def detect_hostname(self, connection=None, ssh=None, ip: str = "") -> str:
        """Ambil hostname dengan beberapa fallback yang robust."""
        # 1) show running-config | include ^hostname
        try:
            if connection is not None:
                out = self.send_command(connection, "show running-config | include ^hostname")
            elif ssh is not None:
                stdin, stdout, stderr = ssh.exec_command("show running-config | include ^hostname")
                out = stdout.read().decode()
            else:
                out = ""
            m = re.search(r"^hostname\s+(\S+)", out, re.MULTILINE)
            if m:
                return m.group(1)
        except Exception:
            pass
        # 2) show version | include uptime
        try:
            if connection is not None:
                out = self.send_command(connection, "show version | include uptime")
            elif ssh is not None:
                stdin, stdout, stderr = ssh.exec_command("show version | include uptime")
                out = stdout.read().decode()
            else:
                out = ""
            m = re.search(r"^(\S+)\s+uptime is ", out, re.MULTILINE)
            if m:
                return m.group(1)
        except Exception:
            pass
        # 3) fallback
        return f"Router-{ip.split('.')[-1]}" if ip else "Unknown"
    def _classify_device_type(self, text: str) -> str:
        """Heuristik klasifikasi device berdasarkan string platform/versi/model."""
        if not text:
            return "router"
        t = text.upper()
        # Explicit exceptions first
        if "CSR 1000V" in t or "CLOUD SERVICES ROUTER" in t:
            return "router"
        # VM / Hypervisor (tandai sebagai VM sesuai permintaan)
        if any(k in t for k in [
            "ESXI", "VMWARE ESXI", "VMNIC", "HYPER-V", "KVM", "PROXMOX",
            "VSPHERE", "VIRTUAL MACHINE", "GUEST OS", "VMWARE"
        ]):
            return "vm"
        # Data center & campus switches
        if any(k in t for k in [
            "NEXUS", "N9K", "N7K", "N3K", "N5K", "N2K",
            "WS-C", "C9200", "C9300", "C9400", "C9500", "C9600", "C2960", "C3560", "C3750", "CATALYST SWITCH", "CATALYST 9" 
        ]):
            return "switch"
        # Security appliances
        if any(k in t for k in ["ASA", "FIREPOWER", "FTD", "NGFW"]):
            return "firewall"
        # Wireless (AP/WLC)
        if any(k in t for k in ["AIRONET", "MR", "MERAKI MR", "CATALYST 910", "WLC", "WIRELESS LAN CONTROLLER"]):
            return "wireless"
        # Servers / UCS
        if any(k in t for k in ["UCS", "B-SERIES", "C-SERIES", "HYPERFLEX", "HX-", "UCS-SERVER"]):
            return "server"
        # Meraki Switches
        if any(k in t for k in ["MERAKI MS", " MS1", " MS2", " MS3", " MS4"]):
            return "switch"
        # Meraki Routers (MX)
        if " MERAKI MX" in t or re.search(r"\bMX\d+\b", t):
            return "router"
        # WAN Edge Routers (ISR/ASR/CSR/Catalyst 8k)
        if any(k in t for k in ["ISR", "ASR", "CSR 1000V", "C8K", "C8300", "C8500", "C8200", "ROUTER"]):
            return "router"
        return "router"

    def _guess_type_from_platform(self, platform_text: str) -> str:
        return self._classify_device_type(platform_text)

    def _neighbor_identifier(self, neighbor: dict) -> str:
        """Identifier stabil untuk node neighbor; gunakan IP jika ada, tambahkan suffix interface agar unik."""
        ip = neighbor.get("ip")
        suffix = neighbor.get("port_id") or neighbor.get("local_interface")
        if ip:
            return f"{ip}#{suffix}" if suffix else ip
        hostname = neighbor.get("hostname", "Unknown")
        return f"HOST:{hostname}#{suffix}" if suffix else f"HOST:{hostname}"
    def _detect_type_from_pid(self, text: str) -> str:
        """Map PID string to device type."""
        pid = text.upper()
        if any(k in pid for k in ["WS-C", "C9200", "C9300", "C9400", "C9500", "NEXUS", "CATALYST", "C2960", "C3560", "C3850"]):
            return "switch"
        if any(k in pid for k in ["ASA", "FPR", "FIREPOWER", "FIREWALL"]):
            return "firewall"
        if any(k in pid for k in ["ISR", "ASR", "ROUTER"]):
            return "router"
        return "router"

    def detect_device_type_from_inventory(self, connection) -> str:
        """Prefer deteksi tipe dari PID di show inventory (chassis). Fallback ke show version."""
        try:
            inv = self.send_command(connection, "show inventory")
            # Cari blok Chassis terlebih dahulu
            # Format umum: NAME: "Chassis", ...\nPID: <PID>, VID: ..., SN: ...
            pid_match = re.search(r"PID:\s*([\w-]+)", inv, re.IGNORECASE)
            if pid_match:
                return self._classify_device_type(pid_match.group(1))
            # Fallback kuat ke versi
            ver = self.send_command(connection, "show version")
            return self._classify_device_type(ver)
        except Exception:
            return "router"

    def get_arp_detail(self, ssh):
        """Parse `show ip arp detail` → list of {ip, mac, iface, phys_iface}"""
        entries = []
        try:
            stdin, stdout, stderr = ssh.exec_command("show ip arp detail")
            out = stdout.read().decode()
            for line in out.splitlines():
                line = line.strip()
                # Example row:
                # 11.11.11.11  00:00:18  000c.29b8.afe0  Ethernet1/2  Ethernet1/2  ...
                m = re.match(r"^(\d+\.\d+\.\d+\.\d+)\s+\S+\s+(\S+)\s+(\S+)\s+(\S+)", line)
                if m:
                    ip, mac, iface, phys = m.group(1), m.group(2), m.group(3), m.group(4)
                    if mac.upper() == 'INCOMPLETE':
                        mac = None
                    entries.append({
                        "ip": ip,
                        "mac": mac,
                        "iface": iface,
                        "phys_iface": phys,
                    })
        except Exception as e:
            log(f"Error getting ARP detail: {e}")
        return entries

    def get_device_info(self, ssh, ip):
        """Return hostname and device-type without invoke_shell()"""
        try:
            stdin, stdout, stderr = ssh.exec_command("show running-config | include hostname")
            hostname_line = stdout.read().decode()
            m = re.search(r"hostname (\S+)", hostname_line)
            hostname = m.group(1) if m else f"Router-{ip.split('.')[-1]}"

            stdin, stdout, stderr = ssh.exec_command("show version")
            ver_out = stdout.read().decode()
            dtype = self._classify_device_type(ver_out)
            return {"ip": ip, "hostname": hostname, "device_type": dtype}
        except Exception as e:
            log(f"Error getting device info for {ip}: {e}")
            return {"ip": ip, "hostname": f"Unknown-{ip.split('.')[-1]}", "device_type": "router"}

    def get_cdp_neighbors(self, ssh):
        """Return list of CDP neighbors without invoke_shell()"""
        try:
            stdin, stdout, stderr = ssh.exec_command("show cdp neighbor detail")
            out = stdout.read().decode()
            neighbors = []
            cur = {}
            for line in out.splitlines():
                line = line.strip()
                if line.startswith("Device ID:"):
                    if cur:
                        neighbors.append(cur)
                    cur = {"hostname": line.split(":", 1)[1].strip()}
                else:
                    # Local Interface and remote Port ID
                    if line.startswith("Interface:"):
                        # Examples:
                        # Interface: mgmt0, Port ID (outgoing port): GigabitEthernet0/28
                        m = re.search(r"Interface:\s*([^,]+),\s*Port ID.*?:\s*(.+)$", line, re.IGNORECASE)
                        if m:
                            cur["local_interface"] = m.group(1).strip()
                            cur["port_id"] = m.group(2).strip()
                        else:
                            # Fallback: only local interface
                            m2 = re.search(r"Interface:\s*(.+)$", line, re.IGNORECASE)
                            if m2:
                                cur["local_interface"] = m2.group(1).strip()
                    # Tangkap IP dari berbagai format baris (IP address / IPv4 address / dsb.)
                    if "address" in line.lower():
                        ipm = re.search(r"(\d+\.\d+\.\d+\.\d+)", line)
                        if ipm and "ip" not in cur:
                            cur["ip"] = ipm.group(1)
                if line.startswith("Platform:"):
                    plat = re.search(r"Platform: ([^,]+)", line)
                    if plat:
                        cur["platform"] = plat.group(1).strip()
            if cur:
                neighbors.append(cur)
            return neighbors
        except Exception as e:
            log(f"Error getting CDP neighbors: {e}")
            return []

    def get_lldp_neighbors(self, ssh):
        """Return list of LLDP neighbors
        
        LLDP output format example:
        System Name: switch-01
        Port id: Gi0/1
        Port Description: GigabitEthernet0/1
        System Name: router-02
        
        Local Intf: Gi0/2
        Port id: Gi0/3
        Port Description: GigabitEthernet0/3
        System Name: switch-03
        System Description: Cisco IOS Software, C3750 ...
        Management Addresses:
            IP: 192.168.1.10
        """
        try:
            stdin, stdout, stderr = ssh.exec_command("show lldp neighbor detail")
            out = stdout.read().decode()
            neighbors = []
            cur = {}
            current_section = None
            
            for line in out.splitlines():
                line = line.strip()
                
                # Start of new neighbor entry
                if line.startswith("Local Intf:") or line.startswith("Local Interface:"):
                    # Save previous neighbor if exists
                    if cur:
                        neighbors.append(cur)
                    # Extract local interface
                    m = re.search(r"Local (?:Intf|Interface):\s*(.+?)(?:\s|$)", line)
                    if m:
                        cur = {"local_interface": m.group(1).strip()}
                    else:
                        cur = {}
                    current_section = None
                    
                elif line.startswith("Chassis id:"):
                    # Optional: capture MAC address
                    m = re.search(r"Chassis id:\s*(.+)$", line)
                    if m:
                        cur["chassis_id"] = m.group(1).strip()
                        
                elif line.startswith("Port id:"):
                    # Remote port interface
                    m = re.search(r"Port id:\s*(.+)$", line)
                    if m:
                        cur["port_id"] = m.group(1).strip()
                        
                elif line.startswith("Port Description:"):
                    # Optional: more detail about remote port
                    m = re.search(r"Port Description:\s*(.+)$", line)
                    if m:
                        cur["port_description"] = m.group(1).strip()
                        
                elif line.startswith("System Name:"):
                    # Hostname of remote device
                    m = re.search(r"System Name:\s*(.+)$", line)
                    if m:
                        cur["hostname"] = m.group(1).strip()
                        
                elif line.startswith("System Description:"):
                    # Platform/version info
                    m = re.search(r"System Description:\s*(.+)$", line)
                    if m:
                        cur["platform"] = m.group(1).strip()
                        
                elif line.startswith("Management Addresses:"):
                    # Next lines will contain IP addresses
                    current_section = "mgmt_addresses"
                    
                elif current_section == "mgmt_addresses":
                    # Look for IP addresses
                    ipm = re.search(r"(?:IP|IPv4):\s*(\d+\.\d+\.\d+\.\d+)", line)
                    if ipm and "ip" not in cur:
                        cur["ip"] = ipm.group(1)
                    # Exit management section on empty line or new field
                    if not line or line.startswith(("Chassis", "Port", "System", "Local")):
                        current_section = None
                        
            # Add last neighbor
            if cur:
                neighbors.append(cur)
                
            return neighbors
            
        except Exception as e:
            log(f"Error getting LLDP neighbors: {e}")
            return []

    # ----------------------------------------------------------------
    #  FLOW 1  – immediate topology (no SSH to neighbours)
    # ----------------------------------------------------------------
    def build_flow1_topology(self, start_ip, protocol='cdp'):
        ssh = self.ssh_connect(start_ip)
        if not ssh:
            log(f"No SSH to {start_ip}, skipping discovery for this seed")
            return []

        # Gunakan invoke_shell agar bisa deteksi PID dari show inventory
        try:
            connection = ssh.invoke_shell()
            self.send_command(connection, "term length 0")
            hostname = self.detect_hostname(connection=connection, ip=start_ip)
            dtype = self.detect_device_type_from_inventory(connection)
            device_info = {"ip": start_ip, "hostname": hostname, "device_type": dtype}
        except Exception:
            # Fallback: exec_command
            hostname = self.detect_hostname(ssh=ssh, ip=start_ip)
            base = self.get_device_info(ssh, start_ip)
            base["hostname"] = hostname
            device_info = base

        # Get neighbors based on protocol
        neighbors = []
        if protocol in ['cdp', 'both']:
            cdp_neighbors = self.get_cdp_neighbors(ssh)
            log(f"CDP neighbors found for {start_ip}: {len(cdp_neighbors)}")
            neighbors.extend(cdp_neighbors)
        
        if protocol in ['lldp', 'both']:
            lldp_neighbors = self.get_lldp_neighbors(ssh)
            log(f"LLDP neighbors found for {start_ip}: {len(lldp_neighbors)}")
            neighbors.extend(lldp_neighbors)
        
        log(f"Total neighbors found for {start_ip}: {len(neighbors)}")

        # Topologi dasar: device utama + setiap neighbor sebagai node placeholder
        device_info["arp_entries"] = self.get_arp_detail(ssh)
        topology = [{"device": device_info, "neighbors": neighbors}]

        for n in neighbors:
            nid = self._neighbor_identifier(n)
            nip = n.get("ip")
            if nip:
                self.covered_seed_ips.add(nip)
            # tambahkan koneksi utama->neighbor (pakai identifier)
            self.connections.append({
                "from": start_ip,
                "to": nid,
                "from_if": n.get("local_interface"),
                "to_if": n.get("port_id"),
                "from_hostname": device_info["hostname"],
                "to_hostname": n.get("hostname", "Unknown")
            })
            # buat node placeholder neighbor jika belum ada
            placeholder_type = self._guess_type_from_platform(n.get("platform", ""))
            exists = any(d['device'].get('ip') == nid for d in topology)
            if not exists:
                display_ip = nip if nip else "-"
                topology.append({
                    "device": {
                        "ip": nid,
                        "hostname": n.get("hostname", f"Unknown"),
                        "device_type": placeholder_type,
                        "display_ip": display_ip
                    },
                    "neighbors": []
                })
        try:
            ssh.close()
        except Exception:
            pass
        return topology

    # ----------------------------------------------------------------
    #  FLOW 2  – epidemic expansion only if SSH succeeds
    # ----------------------------------------------------------------
    def epidemic_discovery(self, start_ip, protocol='cdp'):
        # ---- Flow 1 ----
        log(f"[Flow 1] Building base topology for {start_ip} with protocol: {protocol}")
        topology = self.build_flow1_topology(start_ip, protocol)
        self.visited_ips.add(start_ip)

        # ---- Flow 2 ----
        log("[Flow 2] Epidemic expansion (only if SSH works)")
        queue = deque()
        for d in topology:
            for n in d["neighbors"]:
                if "ip" in n and n["ip"] not in self.visited_ips:
                    queue.append(n["ip"])

        while queue:
            ip = queue.popleft()
            if ip in self.visited_ips:
                continue
            ssh = self.ssh_connect(ip)
            if not ssh:
                continue

            log(f"SSH OK – expanding from {ip}")
            self.visited_ips.add(ip)
            # Create single interactive shell to reuse and detect PID type
            try:
                connection = ssh.invoke_shell()
                self.send_command(connection, "term length 0")
                hostname = self.detect_hostname(connection=connection, ip=ip)
                dtype = self.detect_device_type_from_inventory(connection)
                info = {"ip": ip, "hostname": hostname, "device_type": dtype}
            except Exception:
                base = self.get_device_info(ssh, ip)
                base["hostname"] = self.detect_hostname(ssh=ssh, ip=ip)
                info = base
            
            # Get neighbors based on protocol
            neighbors = []
            if protocol in ['cdp', 'both']:
                cdp_neighbors = self.get_cdp_neighbors(ssh)
                neighbors.extend(cdp_neighbors)
            
            if protocol in ['lldp', 'both']:
                lldp_neighbors = self.get_lldp_neighbors(ssh)
                neighbors.extend(lldp_neighbors)
            
            info["arp_entries"] = self.get_arp_detail(ssh)
            # update atau tambah node untuk ip ini
            found_idx = next((i for i, d in enumerate(topology) if d['device'].get('ip') == ip), None)
            if found_idx is not None:
                topology[found_idx] = {"device": info, "neighbors": neighbors}
            else:
                topology.append({"device": info, "neighbors": neighbors})

            for n in neighbors:
                nip = n.get("ip")
                if not nip:
                    continue
                # simpan koneksi dari device saat ini ke neighbor
                self.connections.append({
                    "from": ip,
                    "to": nip,
                    "from_if": n.get("local_interface"),
                    "to_if": n.get("port_id"),
                    "from_hostname": info["hostname"],
                    "to_hostname": n.get("hostname", "Unknown")
                })
                # tambahkan node placeholder untuk neighbor baru jika belum ada
                if not any(d['device'].get('ip') == nip for d in topology):
                    placeholder_type = self._guess_type_from_platform(n.get("platform", ""))
                    topology.append({
                        "device": {
                            "ip": nip,
                            "hostname": n.get("hostname", f"Unknown-{nip.split('.')[-1]}"),
                            "device_type": placeholder_type
                        },
                        "neighbors": []
                    })
                # masukkan ke antrian untuk dicoba jumpshot (epidemic)
                if nip not in self.visited_ips:
                    queue.append(nip)
            try:
                ssh.close()
            except Exception:
                pass

        return topology

    # ----------------------------------------------------------------
    #  TOP-LEVEL DRIVER
    # ----------------------------------------------------------------
    def discover_all_topologies(self, seed_ips, protocol='cdp'):
        """Discover one topology per seed IP (Flow 1 + optional Flow 2)
        
        Args:
            seed_ips: List of IP addresses to start discovery from
            protocol: 'cdp', 'lldp', or 'both' - which neighbor discovery protocol(s) to use
        """
        for ip in seed_ips:
            # Skip seed jika sudah tercakup sebagai neighbor dari seed sebelumnya
            if ip in self.covered_seed_ips:
                print(f"Seed {ip} skipped (already covered by previous topology)")
                continue
            if ip not in self.visited_ips:
                topo = self.epidemic_discovery(ip, protocol)
                if topo:
                    self.topologies.append(topo)
        return self.topologies

    # ----------------------------------------------------------------
    #  HTML OUTPUT via TEMPLATE (separate frontend)
    # ----------------------------------------------------------------
    def _build_topology_sections_html(self) -> str:
        sections = ""
        for i, topology in enumerate(self.topologies, 1):
            positions = self.calculate_device_positions(topology)
            sections += f"""
    <div class=\"topology-container\">"""
        return sections

    def generate_html_from_template(self, template_path="templates/advanced_base.html", output_file="network_topology_advanced.html"):
        try:
            with open(template_path, 'r', encoding='utf-8') as f:
                template = f.read()
        except Exception as e:
            print(f"Failed to read template {template_path}: {e}. Falling back to inline generation.")
            return self.generate_advanced_html(output_file)

        sections_html = self._build_topology_sections_html()
        html = template.replace("<!--TOPOLOGY_SECTIONS-->", sections_html)
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"Advanced HTML topology (template-based) saved to {output_file}")

    # ----------------------------------------------------------------
    #  DEVICE POSITIONING
    # ----------------------------------------------------------------
    def calculate_device_positions(self, topology):
        positions = {}
        canvas_w, canvas_h, margin = 800, 400, 100
        n = len(topology)
        if n == 1:
            positions[topology[0]['device']['ip']] = {'x': canvas_w // 2, 'y': canvas_h // 2}
        elif n == 2:
            positions[topology[0]['device']['ip']] = {'x': canvas_w // 3, 'y': canvas_h // 2}
            positions[topology[1]['device']['ip']] = {'x': 2 * canvas_w // 3, 'y': canvas_h // 2}
        else:
            cx, cy = canvas_w // 2, canvas_h // 2
            radius = min(canvas_w, canvas_h) // 3 - margin
            for i, d in enumerate(topology):
                angle = 2 * math.pi * i / n
                x = cx + radius * math.cos(angle)
                y = cy + radius * math.sin(angle)
                positions[d['device']['ip']] = {'x': int(x), 'y': int(y)}
        return positions


# No top-level execution; this module is intended to be imported by worker_entry.py