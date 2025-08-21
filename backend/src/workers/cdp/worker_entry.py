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

    print(f"worker_entry: received seeds={seeds}", file=sys.stderr, flush=True)

    discovery = NetworkTopologyDiscovery(username, password)
    topologies = discovery.discover_all_topologies(seeds)

    # Convert to simple nodes/links
    nodes_map = {}
    nodes = []
    for topo in topologies:
        for entry in topo:
            dev = entry.get("device", {})
            ip = dev.get("ip")
            if not ip or ip in nodes_map:
                continue
            node = {
                "id": ip,
                "label": dev.get("hostname") or ip,
                "mgmtIp": ip,
                "type": dev.get("device_type") or "device",
            }
            nodes_map[ip] = True
            nodes.append(node)

    links = []
    for c in discovery.connections:
        fr = c.get("from")
        to = c.get("to")
        if fr and to:
            links.append({
                "id": f"{fr}->{to}",
                "source": fr,
                "target": to,
                "linkType": "cdp",
            })

    print(json.dumps({"nodes": nodes, "links": links}), flush=True)


if __name__ == "__main__":
    main()


