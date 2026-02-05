import sys
import json
import os
import paramiko
import sys

# Import the discovery class from the colocated file
from network_topology_testing import NetworkTopologyDiscovery


def main():
    raw = sys.stdin.read()
    try:
      payload = json.loads(raw)
    except Exception as e:
      print(f"worker_entry: failed to parse stdin: {e}; raw=<{raw[:200]}>", file=sys.stderr, flush=True)
      raise
    seeds = payload.get("seedIps", [])
    username = payload.get("username") or os.environ.get("CDP_USERNAME") or "cisco"
    password = payload.get("password") or os.environ.get("CDP_PASSWORD") or "cisco"
    protocol = payload.get("protocol", "cdp")  # default to CDP for backward compatibility
    post_auth_steps = payload.get("postAuthSteps", [])  # list of {type: 'command'|'password', value: string}

    print(f"worker_entry: received seeds={seeds}, protocol={protocol}, postAuthSteps={len(post_auth_steps)}", file=sys.stderr, flush=True)

    discovery = NetworkTopologyDiscovery(username, password, post_auth_steps=post_auth_steps)
    topologies = discovery.discover_all_topologies(seeds, protocol)

    # Convert to simple nodes/links
    nodes_map = {}
    nodes = []
    for topo in topologies:
        for entry in topo:
            dev = entry.get("device", {})
            ip = dev.get("ip")
            if not ip:
                continue
            node = {
                "id": ip,
                "label": dev.get("hostname") or ip,
                "mgmtIp": ip,
                "type": dev.get("device_type") or "device",
                "arp": dev.get("arp_entries") or [],
            }
            if ip not in nodes_map:
                nodes_map[ip] = True
                nodes.append(node)

    # Build links with appropriate linkType based on protocol used
    links = []
    for c in discovery.connections:
        fr = c.get("from")
        to = c.get("to")
        if fr and to:
            # Determine linkType based on protocol parameter
            # If 'both' was used, we can't determine which protocol discovered this link
            # For simplicity, use the protocol parameter value
            link_type = protocol if protocol in ['cdp', 'lldp'] else 'cdp'
            links.append({
                "id": f"{fr}->{to}",
                "source": fr,
                "target": to,
                "linkType": link_type,
                "srcIfName": c.get("from_if"),
                "dstIfName": c.get("to_if"),
            })

    print(json.dumps({"nodes": nodes, "links": links}), flush=True)


if __name__ == "__main__":
    main()


