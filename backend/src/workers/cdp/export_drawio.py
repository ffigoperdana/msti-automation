#!/usr/bin/env python3
"""
Draw.io Export Worker

Generates Draw.io compatible XML from network topology data using drawio_network_plot library.

Usage:
    Reads JSON from stdin with structure:
    {
        "nodes": [{"id": "...", "label": "...", "type": "router|switch|...", "mgmtIp": "..."}],
        "links": [{"source": "...", "target": "...", "srcIfName": "...", "dstIfName": "..."}]
    }

    Outputs Draw.io XML to stdout
"""

import sys
import json
import math

from drawio_network_plot import NetPlot


# Node type to drawio_network_plot node type mapping
NETPLOT_TYPE_MAP = {
    'router': 'router',
    'switch': 'l3_switch',
    'l3_switch': 'l3_switch',
    'l2_switch': 'l2_switch',
    'firewall': 'firewall',
    'server': 'server',
    'wireless': 'wireless_router',
    'workstation': 'workstation',
    'cloud': 'cloud',
    'unknown': 'generic_appliance',
    'vm': 'virtual_machine',
}


def compute_hierarchical_positions(nodes, links, width=1800, height=1200):
    """Compute hierarchical layout positions to avoid overlap"""
    if not nodes:
        return {}
    
    # Build adjacency list
    adjacency = {n['id']: set() for n in nodes}
    for link in links:
        src, dst = link.get('source'), link.get('target')
        if src in adjacency:
            adjacency[src].add(dst)
        if dst in adjacency:
            adjacency[dst].add(src)
    
    # Find hub (most connected node)
    hub_id = max(adjacency.keys(), key=lambda x: len(adjacency[x]))
    
    # BFS to group nodes by level
    visited = {hub_id}
    levels = [[hub_id]]
    current_level = [hub_id]
    
    while len(visited) < len(nodes):
        next_level = []
        for node_id in current_level:
            for neighbor in adjacency.get(node_id, []):
                if neighbor not in visited:
                    visited.add(neighbor)
                    next_level.append(neighbor)
        
        # Add unconnected nodes
        if not next_level:
            for n in nodes:
                if n['id'] not in visited:
                    visited.add(n['id'])
                    next_level.append(n['id'])
        
        if next_level:
            levels.append(next_level)
            current_level = next_level
    
    # Compute positions based on levels
    positions = {}
    margin = 150
    spacing = 200
    cx = width / 2
    cy = height / 2
    
    for level_idx, level_nodes in enumerate(levels):
        if level_idx == 0:
            # Hub at center
            positions[level_nodes[0]] = {'x': cx, 'y': cy}
        else:
            # Arrange in circle around center
            radius = spacing * level_idx
            angle_step = 2 * math.pi / max(len(level_nodes), 1)
            start_angle = (level_idx * 0.3)  # Offset each level
            
            for i, node_id in enumerate(level_nodes):
                angle = start_angle + angle_step * i
                x = cx + radius * math.cos(angle)
                y = cy + radius * math.sin(angle)
                
                # Clamp to bounds
                x = max(margin, min(width - margin, x))
                y = max(margin, min(height - margin, y))
                
                positions[node_id] = {'x': x, 'y': y}
    
    return positions


def generate_drawio_xml(nodes, links):
    """Generate Draw.io XML using drawio_network_plot library"""
    plot = NetPlot()
    
    # Check if nodes already have positions from canvas
    has_positions = all(
        isinstance(n.get('x'), (int, float)) and isinstance(n.get('y'), (int, float))
        for n in nodes
    )
    
    if has_positions:
        # Use existing positions from canvas (scaled up for better Draw.io spacing)
        positions = {n['id']: {'x': n['x'] * 1.5, 'y': n['y'] * 1.5} for n in nodes}
    else:
        # Compute positions if not available
        positions = compute_hierarchical_positions(nodes, links)
    
    # Build device list with positions
    device_list = []
    for node in nodes:
        node_type = (node.get('type') or node.get('deviceType') or 'unknown').lower()
        netplot_type = NETPLOT_TYPE_MAP.get(node_type, 'generic_appliance')
        
        pos = positions.get(node['id'], {'x': 400, 'y': 300})
        
        device_list.append({
            'nodeName': node['id'],
            'nodeType': netplot_type,
            'hostname': node.get('label') or node.get('hostname') or node['id'],
            'model': node.get('model') or node.get('platform') or '',
            'role': node.get('role') or node_type.title(),
            'x': pos['x'],
            'y': pos['y'],
        })
    
    # Build connection list
    connection_list = []
    for link in links:
        src_if = link.get('srcIfName') or link.get('sourceInterface') or ''
        dst_if = link.get('dstIfName') or link.get('targetInterface') or ''
        
        connection_list.append({
            'sourceNodeID': link.get('source'),
            'destinationNodeID': link.get('target'),
            'source_label': src_if,
            'target_label': dst_if,
        })
    
    # Add nodes and links to plot
    plot.addNodeList(device_list)
    plot.addLinkList(connection_list)
    
    # Return XML string
    return plot.display_xml()


def main():
    try:
        # Read input from stdin
        input_data = sys.stdin.read()
        if not input_data.strip():
            raise ValueError("No input data provided")
        
        data = json.loads(input_data)
        nodes = data.get('nodes', [])
        links = data.get('links', [])
        
        if not nodes:
            raise ValueError("No nodes provided")
        
        # Generate XML using drawio_network_plot
        xml = generate_drawio_xml(nodes, links)
        
        # Output XML
        print(xml)
        
    except Exception as e:
        sys.stderr.write(f"Error: {str(e)}\n")
        sys.exit(1)


if __name__ == '__main__':
    main()
