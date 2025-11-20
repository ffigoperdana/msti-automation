import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useCdpStore from '../store/cdpStore';

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
}

// Simple, dependency-free topology canvas inspired by the provided HTML
const TopologyGraph: React.FC<TopologyGraphProps> = ({ nodes, links }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const { updatePositions } = useCdpStore();
  const [connectionsVisible, setConnectionsVisible] = useState(true);

  // Canvas and card dimensions
  const CANVAS_W = 1000;
  const CANVAS_H = 500;
  const CARD_W = 180;
  const CARD_H = 130;

  const computedPositions = useMemo(() => {
    if (!nodes.length) return {} as Record<string, { x: number; y: number }>;
    const rectW = CANVAS_W;
    const rectH = CANVAS_H;
    const margin = 100;
    const n = nodes.length;
    const pos: Record<string, { x: number; y: number }> = {};
    // Use persisted layout if available on node
    let anyPersisted = false;
    nodes.forEach((node) => {
      if (typeof (node as any).x === 'number' && typeof (node as any).y === 'number') {
        pos[node.id] = { x: (node as any).x, y: (node as any).y };
        anyPersisted = true;
      }
    });
    if (!anyPersisted) {
      if (n === 1) {
        pos[nodes[0].id] = { x: rectW / 2, y: rectH / 2 };
      } else if (n === 2) {
        pos[nodes[0].id] = { x: rectW / 3, y: rectH / 2 };
        pos[nodes[1].id] = { x: (2 * rectW) / 3, y: rectH / 2 };
      } else {
        const cx = rectW / 2;
        const cy = rectH / 2;
        const radius = Math.min(rectW, rectH) / 3 - margin;
        nodes.forEach((node, i) => {
          const angle = (2 * Math.PI * i) / n;
          const x = cx + radius * Math.cos(angle);
          const y = cy + radius * Math.sin(angle);
          pos[node.id] = { x, y };
        });
      }
    }
    return pos;
  }, [nodes]);

  useEffect(() => {
    setPositions(computedPositions);
  }, [computedPositions]);

  // Color mapping - light gray/white for all nodes like in the reference image
  const getNodeColor = () => {
    return '#e5e7eb'; // light gray border color
  };
  
  const getNodeBgColor = () => {
    return '#f3f4f6'; // very light gray background
  };

  const resetView = () => setPositions(computedPositions);
  const toggleConnections = () => setConnectionsVisible(v => !v);
  const centerDevices = () => setPositions(() => {
    const rect = { width: CANVAS_W, height: CANVAS_H };
    const nodesEl = nodes.map((n) => ({ id: n.id, w: 120, h: 100 }));
    const pos: Record<string, { x: number; y: number }> = {};
    nodesEl.forEach((nEl, idx) => {
      pos[nEl.id] = { x: rect.width / 2 + (idx - nodesEl.length / 2) * 50, y: rect.height / 2 };
    });
    return pos;
  });
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

  // Drag and drop
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const onMouseDownNode = (e: React.MouseEvent, nodeId: string) => {
    const rect = (canvasRef.current as HTMLDivElement).getBoundingClientRect();
    const p = positions[nodeId] || { x: 0, y: 0 };
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setDraggingId(nodeId);
    setDragOffset({ dx: mouseX - p.x, dy: mouseY - p.y });
  };
  const onMouseMoveWindow = useCallback((e: MouseEvent) => {
    if (!draggingId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const minX = CARD_W / 2;
    const maxX = CANVAS_W - CARD_W / 2;
    const minY = CARD_H / 2;
    const maxY = CANVAS_H - CARD_H / 2;
    const x = Math.max(minX, Math.min(maxX, mouseX - dragOffset.dx));
    const y = Math.max(minY, Math.min(maxY, mouseY - dragOffset.dy));
    setPositions((prev) => ({ ...prev, [draggingId]: { x, y } }));
  }, [draggingId, dragOffset.dx, dragOffset.dy]);
  const onMouseUpWindow = useCallback(() => setDraggingId(null), []);
  const onMouseMoveCanvas = (e: React.MouseEvent) => {
    if (!draggingId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const minX = CARD_W / 2;
    const maxX = CANVAS_W - CARD_W / 2;
    const minY = CARD_H / 2;
    const maxY = CANVAS_H - CARD_H / 2;
    const x = Math.max(minX, Math.min(maxX, mouseX - dragOffset.dx));
    const y = Math.max(minY, Math.min(maxY, mouseY - dragOffset.dy));
    setPositions((prev) => ({ ...prev, [draggingId]: { x, y } }));
    updatePositions({ [draggingId]: { x, y } });
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

  // Removed zoom/pan as requested

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button onClick={resetView} className="control-btn px-3 py-2 bg-blue-600 text-white rounded">Reset View</button>
        <button onClick={toggleConnections} className="control-btn px-3 py-2 bg-blue-600 text-white rounded">Toggle Connections</button>
        <button onClick={exportData} className="control-btn px-3 py-2 bg-blue-600 text-white rounded">Export Data</button>
        <button onClick={centerDevices} className="control-btn px-3 py-2 bg-blue-600 text-white rounded">Center Devices</button>
        {/* zoom/pan removed */}
      </div>
      <div
        ref={canvasRef}
        onMouseMove={onMouseMoveCanvas}
        onMouseUp={() => setDraggingId(null)}
        className="network-canvas relative mx-auto select-none overflow-visible"
        style={{ width: CANVAS_W, height: CANVAS_H, background: '#f8f9fa', borderRadius: 10, border: '2px solid #e9ecef' }}
      >
        <svg width="100%" height={CANVAS_H} style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}>
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
              <div className="device-ip text-xs text-gray-700 font-medium mb-1" title={n.mgmtIp || n.id}>{n.mgmtIp || n.id}</div>
              
              {/* Hostname above circle */}
              <div className="device-hostname font-bold text-sm mb-2" title={n.label}>{n.label}</div>
              
              {/* Main circle node - double circle like in image */}
              <div className="rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all border-4" style={{ width: 70, height: 70, borderColor: nodeColor, backgroundColor: 'white' }}>
                <div className="rounded-full" style={{ width: 50, height: 50, backgroundColor: nodeBgColor, border: '3px solid ' + nodeColor }}>
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
      <div className="legend flex gap-4 items-center text-sm text-gray-600">
        <div className="flex items-center gap-2"><span className="inline-block w-5 h-5 rounded-full border-2" style={{ borderColor: '#e5e7eb', backgroundColor: '#f3f4f6' }} /> Network Device</div>
        <div className="flex items-center gap-2"><span className="inline-block" style={{ background: '#007acc', width: 30, height: 3 }} /> Connection</div>
      </div>
    </div>
  );
};

export default TopologyGraph;


