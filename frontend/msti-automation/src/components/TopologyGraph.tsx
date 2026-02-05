import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useCdpStore from '../store/cdpStore';
import cdpService from '../services/cdpService';

type ArpEntry = { ip: string; mac?: string; iface?: string; phys_iface?: string };
type NodeRole = 'source' | 'destination' | 'gateway';
type Node = {
  id: string;
  label: string;
  mgmtIp?: string;
  type?: string;
  arp?: ArpEntry[];
  role?: NodeRole;
  chips?: string[]; // additional small pills (e.g., ports or interfaces)
};
type Link = { id: string; source: string; target: string; linkType?: string; srcIfName?: string; dstIfName?: string };

interface TopologyGraphProps {
  nodes: Node[];
  links: Link[];
  discoveryId?: string; // For backend export
}

// Force-directed layout algorithm to prevent node overlap
function computeForceDirectedLayout(
  nodes: Node[],
  links: Link[],
  canvasW: number,
  canvasH: number,
  cardW: number,
  cardH: number
): Record<string, { x: number; y: number }> {
  if (nodes.length === 0) return {};
  
  const margin = 120;
  const minSpacing = Math.max(cardW, cardH) + 120; // Minimum distance between nodes to avoid interface label collision
  
  // Build adjacency for connected nodes
  const adjacency: Record<string, Set<string>> = {};
  nodes.forEach(n => { adjacency[n.id] = new Set(); });
  links.forEach(l => {
    if (adjacency[l.source]) adjacency[l.source].add(l.target);
    if (adjacency[l.target]) adjacency[l.target].add(l.source);
  });
  
  // Find the node with most connections (hub)
  let hubId = nodes[0].id;
  let maxConnections = 0;
  nodes.forEach(n => {
    const count = adjacency[n.id]?.size || 0;
    if (count > maxConnections) {
      maxConnections = count;
      hubId = n.id;
    }
  });
  
  // Initialize positions - hub in center, others in a spiral pattern
  const pos: Record<string, { x: number; y: number }> = {};
  const cx = canvasW / 2;
  const cy = canvasH / 2;
  
  // Place hub at center
  pos[hubId] = { x: cx, y: cy };
  
  // Group nodes by distance from hub (BFS)
  const visited = new Set<string>([hubId]);
  const levels: string[][] = [[hubId]];
  let currentLevel = [hubId];
  
  while (visited.size < nodes.length) {
    const nextLevel: string[] = [];
    currentLevel.forEach(nodeId => {
      adjacency[nodeId]?.forEach(neighborId => {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          nextLevel.push(neighborId);
        }
      });
    });
    
    // Add unconnected nodes if we can't progress
    if (nextLevel.length === 0) {
      nodes.forEach(n => {
        if (!visited.has(n.id)) {
          visited.add(n.id);
          nextLevel.push(n.id);
        }
      });
    }
    
    if (nextLevel.length > 0) {
      levels.push(nextLevel);
      currentLevel = nextLevel;
    }
  }
  
  // Place nodes in concentric rings based on their level
  levels.forEach((levelNodes, levelIdx) => {
    if (levelIdx === 0) return; // Hub already placed
    
    const radius = minSpacing * levelIdx * 1.2;
    const angleStep = (2 * Math.PI) / Math.max(levelNodes.length, 1);
    const startAngle = Math.random() * Math.PI * 0.5; // Slight randomization to avoid overlap between levels
    
    levelNodes.forEach((nodeId, i) => {
      const angle = startAngle + angleStep * i;
      let x = cx + radius * Math.cos(angle);
      let y = cy + radius * Math.sin(angle);
      
      // Clamp to canvas bounds
      x = Math.max(margin + cardW/2, Math.min(canvasW - margin - cardW/2, x));
      y = Math.max(margin + cardH/2, Math.min(canvasH - margin - cardH/2, y));
      
      pos[nodeId] = { x, y };
    });
  });
  
  // Apply force simulation iterations to reduce overlap
  const iterations = 50;
  const repulsionForce = minSpacing * 2;
  const attractionForce = 0.1;
  
  for (let iter = 0; iter < iterations; iter++) {
    const forces: Record<string, { fx: number; fy: number }> = {};
    nodes.forEach(n => { forces[n.id] = { fx: 0, fy: 0 }; });
    
    // Repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const n1 = nodes[i];
        const n2 = nodes[j];
        const p1 = pos[n1.id];
        const p2 = pos[n2.id];
        
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        
        if (dist < minSpacing) {
          const force = (minSpacing - dist) / dist * repulsionForce / iterations;
          const fx = dx * force / dist;
          const fy = dy * force / dist;
          
          forces[n1.id].fx -= fx;
          forces[n1.id].fy -= fy;
          forces[n2.id].fx += fx;
          forces[n2.id].fy += fy;
        }
      }
    }
    
    // Attraction for connected nodes
    links.forEach(link => {
      const p1 = pos[link.source];
      const p2 = pos[link.target];
      if (!p1 || !p2) return;
      
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.hypot(dx, dy);
      
      if (dist > minSpacing * 1.5) {
        const force = (dist - minSpacing) * attractionForce / iterations;
        const fx = dx * force / dist;
        const fy = dy * force / dist;
        
        forces[link.source].fx += fx;
        forces[link.source].fy += fy;
        forces[link.target].fx -= fx;
        forces[link.target].fy -= fy;
      }
    });
    
    // Apply forces
    nodes.forEach(n => {
      const f = forces[n.id];
      pos[n.id].x += f.fx;
      pos[n.id].y += f.fy;
      
      // Clamp to bounds
      pos[n.id].x = Math.max(margin + cardW/2, Math.min(canvasW - margin - cardW/2, pos[n.id].x));
      pos[n.id].y = Math.max(margin + cardH/2, Math.min(canvasH - margin - cardH/2, pos[n.id].y));
    });
  }
  
  return pos;
}

// Simple, dependency-free topology canvas inspired by the provided HTML
const TopologyGraph: React.FC<TopologyGraphProps> = ({ nodes, links, discoveryId }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const positionsRef = useRef<Record<string, { x: number; y: number }>>({}); // Ref for stable closure access
  const { updatePositions } = useCdpStore();
  const [connectionsVisible, setConnectionsVisible] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [zoom, setZoom] = useState(1);
  
  // Canvas panning state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  // Dynamic canvas size based on node count
  const CARD_W = 140;
  const CARD_H = 110;
  const CANVAS_W = Math.max(1600, Math.min(3500, nodes.length * 200));
  const CANVAS_H = Math.max(900, Math.min(2500, nodes.length * 120));
  
  // Helper to truncate long text
  const truncateText = (text: string, maxLen: number = 15): string => {
    if (!text) return '';
    return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
  };

  const computedPositions = useMemo(() => {
    if (!nodes.length) return {} as Record<string, { x: number; y: number }>;
    
    // Use persisted layout if available on ALL nodes
    const pos: Record<string, { x: number; y: number }> = {};
    let allPersisted = true;
    nodes.forEach((node) => {
      if (typeof (node as any).x === 'number' && typeof (node as any).y === 'number') {
        pos[node.id] = { x: (node as any).x, y: (node as any).y };
      } else {
        allPersisted = false;
      }
    });
    
    // Only use persisted positions if ALL nodes have them
    if (allPersisted && Object.keys(pos).length === nodes.length) {
      return pos;
    }
    
    // Use force-directed layout for automatic positioning
    return computeForceDirectedLayout(nodes, links, CANVAS_W, CANVAS_H, CARD_W, CARD_H);
  }, [nodes, links, CANVAS_W, CANVAS_H]);

  // Only set positions from computed on initial load, not on every change
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current && Object.keys(computedPositions).length > 0) {
      setPositions(computedPositions);
      positionsRef.current = computedPositions;
      initializedRef.current = true;
    }
  }, [computedPositions]);

  // Color mapping - light gray/white for all nodes like in the reference image
  const getNodeColor = () => {
    return '#e5e7eb'; // light gray border color
  };
  
  const getNodeBgColor = () => {
    return '#f3f4f6'; // very light gray background
  };

  const resetView = () => {
    // Re-compute layout fresh
    const freshPos = computeForceDirectedLayout(nodes, links, CANVAS_W, CANVAS_H, CARD_W, CARD_H);
    setPositions(freshPos);
    positionsRef.current = freshPos;
    setZoom(1);
    // Reset scroll position
    if (containerRef.current) {
      containerRef.current.scrollLeft = 0;
      containerRef.current.scrollTop = 0;
    }
  };
  const toggleConnections = () => setConnectionsVisible(v => !v);
  const spreadDevices = () => {
    // Re-run force layout to spread devices
    const newPos = computeForceDirectedLayout(nodes, links, CANVAS_W, CANVAS_H, CARD_W, CARD_H);
    setPositions(newPos);
    positionsRef.current = newPos;
  };
  const zoomIn = () => setZoom(z => Math.min(2, z + 0.2));
  const zoomOut = () => setZoom(z => Math.max(0.3, z - 0.2));
  const exportData = () => {
    const data = { nodes, links, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cdp-topology-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export to Draw.io using backend Python library (drawio_network_plot)
  const { saveGraphLayout } = useCdpStore();
  
  const exportToDrawio = async () => {
    if (!discoveryId) {
      alert('Discovery ID not available for export');
      return;
    }
    setExporting(true);
    try {
      // First, sync current canvas positions to store
      updatePositions(positionsRef.current);
      
      // Then save to backend so export uses current layout
      await saveGraphLayout(discoveryId);
      
      // Now export with correct positions
      const blob = await cdpService.exportToDrawioBackend(discoveryId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `topology-${discoveryId}.drawio`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export to Draw.io:', error);
      alert('Failed to export to Draw.io. Check console for details.');
    } finally {
      setExporting(false);
    }
  };

  // Drag and drop for nodes
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  
  const onMouseDownNode = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation(); // Prevent canvas panning
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const p = positions[nodeId] || { x: 0, y: 0 };
    // Adjust for zoom
    const mouseX = (e.clientX - rect.left) / zoom;
    const mouseY = (e.clientY - rect.top) / zoom;
    setDraggingId(nodeId);
    setDragOffset({ dx: mouseX - p.x, dy: mouseY - p.y });
  };
  
  const onMouseMoveWindow = useCallback((e: MouseEvent) => {
    if (!draggingId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    // Adjust for zoom
    const mouseX = (e.clientX - rect.left) / zoom;
    const mouseY = (e.clientY - rect.top) / zoom;
    const minX = CARD_W / 2;
    const maxX = CANVAS_W - CARD_W / 2;
    const minY = CARD_H / 2;
    const maxY = CANVAS_H - CARD_H / 2;
    const x = Math.max(minX, Math.min(maxX, mouseX - dragOffset.dx));
    const y = Math.max(minY, Math.min(maxY, mouseY - dragOffset.dy));
    setPositions((prev) => {
      const updated = { ...prev, [draggingId]: { x, y } };
      positionsRef.current = updated;
      return updated;
    });
  }, [draggingId, dragOffset.dx, dragOffset.dy, zoom, CANVAS_W, CANVAS_H, CARD_W, CARD_H]);
  
  const onMouseUpWindow = useCallback(() => {
    if (draggingId) {
      // Update store with ALL positions to keep them in sync
      // This prevents partial updates that cause nodes to disappear
      updatePositions(positionsRef.current);
    }
    setDraggingId(null);
  }, [draggingId, updatePositions]);
  
  // Canvas panning handlers
  const onCanvasMouseDown = (e: React.MouseEvent) => {
    // Only pan if clicking on canvas background, not on a node
    if ((e.target as HTMLElement).closest('.node-card')) return;
    if (!containerRef.current) return;
    
    setIsPanning(true);
    setPanStart({
      x: e.clientX,
      y: e.clientY,
      scrollLeft: containerRef.current.scrollLeft,
      scrollTop: containerRef.current.scrollTop,
    });
    e.preventDefault();
  };
  
  const onCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning && containerRef.current) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      containerRef.current.scrollLeft = panStart.scrollLeft - dx;
      containerRef.current.scrollTop = panStart.scrollTop - dy;
    }
  };
  
  const onCanvasMouseUp = () => {
    setIsPanning(false);
  };

  useEffect(() => {
    if (draggingId) {
      window.addEventListener('mousemove', onMouseMoveWindow);
      window.addEventListener('mouseup', onMouseUpWindow);
      return () => {
        window.removeEventListener('mousemove', onMouseMoveWindow);
        window.removeEventListener('mouseup', onMouseUpWindow);
      };
    }
  }, [draggingId, onMouseMoveWindow, onMouseUpWindow]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={resetView} className="control-btn px-3 py-2 bg-blue-600 text-white rounded text-sm">Reset View</button>
        <button onClick={toggleConnections} className="control-btn px-3 py-2 bg-blue-600 text-white rounded text-sm">Toggle Connections</button>
        <button onClick={exportData} className="control-btn px-3 py-2 bg-blue-600 text-white rounded text-sm">Export JSON</button>
        <button onClick={spreadDevices} className="control-btn px-3 py-2 bg-blue-600 text-white rounded text-sm">Spread Devices</button>
        
        {/* Zoom controls */}
        <div className="flex items-center gap-1 ml-2 border-l pl-2">
          <button onClick={zoomOut} className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm font-bold">−</button>
          <span className="text-sm text-gray-600 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={zoomIn} className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm font-bold">+</button>
        </div>
        
        {/* Draw.io Export Button */}
        <button 
          onClick={exportToDrawio} 
          disabled={exporting || !discoveryId}
          className="control-btn px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm ml-auto"
        >
          {exporting ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Exporting...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export to Draw.io
            </>
          )}
        </button>
      </div>
      
      {/* Scrollable container with pan support */}
      <div 
        ref={containerRef}
        onMouseDown={onCanvasMouseDown}
        onMouseMove={onCanvasMouseMove}
        onMouseUp={onCanvasMouseUp}
        onMouseLeave={onCanvasMouseUp}
        className={`overflow-auto border-2 border-gray-200 rounded-lg bg-gray-100 ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ maxHeight: '70vh', maxWidth: '100%' }}
      >
        <div
          ref={canvasRef}
          className="network-canvas relative select-none"
          style={{ 
            width: CANVAS_W,
            height: CANVAS_H,
            background: '#f8f9fa', 
            borderRadius: 10,
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
          }}
        >
          <svg width={CANVAS_W} height={CANVAS_H} style={{ position: 'absolute', top: 0, left: 0, zIndex: 1, pointerEvents: 'none' }}>
          {connectionsVisible && links.map((l) => {
            const s = positions[l.source];
            const t = positions[l.target];
            if (!s || !t) return null;

            // Perpendicular offset so labels tidak tertutup card
            const dx = t.x - s.x;
            const dy = t.y - s.y;
            const len = Math.max(1, Math.hypot(dx, dy));
            const nx = -dy / len;
            const ny = dx / len;
            const off = 14; // px offset

            // 35% dari source dan 65% mendekati target
            const sx = s.x + dx * 0.35 + nx * off;
            const sy = s.y + dy * 0.35 + ny * off;
            const tx = s.x + dx * 0.65 - nx * off;
            const ty = s.y + dy * 0.65 - ny * off;

            const labelStyle: React.CSSProperties = {
              fontSize: 10,
              fill: '#4b5563',
              paintOrder: 'stroke',
              stroke: '#ffffff',
              strokeWidth: 3,
            } as any;

            return (
              <g key={l.id}>
                <line x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="#007acc" strokeWidth={3} strokeDasharray="5,5" />
                {l.srcIfName && (
                  <text x={sx} y={sy} style={labelStyle} textAnchor="middle" dominantBaseline="central">{l.srcIfName}</text>
                )}
                {l.dstIfName && (
                  <text x={tx} y={ty} style={labelStyle} textAnchor="middle" dominantBaseline="central">{l.dstIfName}</text>
                )}
              </g>
            );
          })}
        </svg>
        {nodes.map((n) => {
          const p = positions[n.id] || { x: 100, y: 100 };
          const nodeColor = getNodeColor();
          const nodeBgColor = getNodeBgColor();
          return (
            <div key={n.id} className="absolute flex flex-col items-center cursor-move group" style={{ left: p.x - 60, top: p.y - 90, userSelect: 'none', zIndex: 3 }} onMouseDown={(e) => onMouseDownNode(e, n.id)}>
              {/* IP Address on top */}
              <div className="device-ip text-xs text-gray-700 font-medium mb-1" title={n.mgmtIp || n.id}>{truncateText(n.mgmtIp || n.id, 18)}</div>
              
              {/* Hostname above circle */}
              <div className="device-hostname font-bold text-sm mb-2" title={n.label}>{truncateText(n.label, 15)}</div>
              
              {/* Main circle node - slightly smaller for dense topologies */}
              <div className="rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all border-4" style={{ width: 56, height: 56, borderColor: nodeColor, backgroundColor: 'white' }}>
                <div className="rounded-full" style={{ width: 40, height: 40, backgroundColor: nodeBgColor, border: '3px solid ' + nodeColor }}>
                </div>
              </div>
              
              {/* Role badge below circle */}
              {n.role && (
                <div className={`text-[10px] inline-block px-3 py-1 rounded-full mt-2 uppercase font-semibold ${n.role==='source' ? 'bg-green-600 text-white' : n.role==='destination' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-white'}`}>{n.role}</div>
              )}
              
              {/* Chips/interfaces below role */}
              {n.chips && n.chips.length > 0 && (
                <div className="mt-1 flex flex-wrap items-center justify-center gap-1 max-w-[120px]">
                  {n.chips.map((c, i) => (
                    <span key={i} className="text-[9px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">{c}</span>
                  ))}
                </div>
              )}
              {n.arp && n.arp.length > 0 && (
                <div className="absolute left-1/2 -translate-x-1/2 mt-2 bg-black/90 text-white text-[10px] rounded p-2 opacity-0 group-hover:opacity-100 pointer-events-none shadow-lg" style={{ top: '100%', minWidth: 220 }}>
                  <div className="font-semibold text-[11px] mb-1">ARP Entries</div>
                  <div className="space-y-1 max-h-32 overflow-auto">
                    {n.arp.slice(0,5).map((a, idx) => (
                      <div key={idx} className="flex flex-col">
                        <div><span className="text-gray-300">IP:</span> {a.ip}</div>
                        {a.mac && <div><span className="text-gray-300">MAC:</span> {a.mac}</div>}
                        <div><span className="text-gray-300">IF:</span> {a.phys_iface || a.iface}</div>
                      </div>
                    ))}
                    {n.arp.length > 5 && <div className="text-gray-300">(+{n.arp.length - 5} more)</div>}
                  </div>
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0" style={{ borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: '6px solid rgba(0,0,0,0.9)' }} />
                </div>
              )}
            </div>
          );
        })}
        </div>
      </div>
      <div className="legend flex gap-4 items-center text-sm text-gray-600">
        <div className="flex items-center gap-2"><span className="inline-block w-5 h-5 rounded-full border-2" style={{ borderColor: '#e5e7eb', backgroundColor: '#f3f4f6' }} /> Network Device</div>
        <div className="flex items-center gap-2"><span className="inline-block" style={{ background: '#007acc', width: 30, height: 3 }} /> Connection</div>
        <div className="text-xs text-gray-400 ml-auto">Nodes: {nodes.length} | Links: {links.length} | Scroll to pan, use zoom controls</div>
      </div>
    </div>
  );
};

export default TopologyGraph;


