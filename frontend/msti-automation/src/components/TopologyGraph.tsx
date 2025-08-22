import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useCdpStore from '../store/cdpStore';

type Node = { id: string; label: string; mgmtIp?: string; type?: string };
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

  const computedPositions = useMemo(() => {
    if (!nodes.length) return {} as Record<string, { x: number; y: number }>;
    const rectW = 800;
    const rectH = 400;
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

  // Use assets from public folder to avoid bundling issues
  const icons = useMemo(() => ({
    router: '/cisco_icons/router.jpg',
    switch: '/cisco_icons/switch.jpg',
    firewall: '/cisco_icons/firewall.jpg',
    server: '/cisco_icons/www server.jpg',
  }), []);
  const iconFor = (t?: string, label?: string) => {
    const kind = (t || '').toLowerCase();
    const name = (label || '').toLowerCase();
    if (name.includes('esxi') || name.includes('vmware') || name.includes('esx')) return icons.server;
    if (kind.includes('switch')) return icons.switch;
    if (kind.includes('firewall')) return icons.firewall;
    return icons.router;
  };

  const resetView = () => setPositions(computedPositions);
  const toggleConnections = () => setConnectionsVisible(v => !v);
  const centerDevices = () => setPositions(() => {
    const rect = { width: 800, height: 400 };
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
    const x = Math.max(0, Math.min(800, mouseX - dragOffset.dx));
    const y = Math.max(0, Math.min(400, mouseY - dragOffset.dy));
    setPositions((prev) => ({ ...prev, [draggingId]: { x, y } }));
  }, [draggingId, dragOffset.dx, dragOffset.dy]);
  const onMouseUpWindow = useCallback(() => setDraggingId(null), []);
  const onMouseMoveCanvas = (e: React.MouseEvent) => {
    if (!draggingId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const x = Math.max(0, Math.min(800, mouseX - dragOffset.dx));
    const y = Math.max(0, Math.min(400, mouseY - dragOffset.dy));
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
        className="network-canvas relative mx-auto select-none overflow-hidden"
        style={{ width: 800, height: 400, background: '#f8f9fa', borderRadius: 10, border: '2px solid #e9ecef' }}
      >
        <svg width="100%" height="400" style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}>
          {connectionsVisible && links.map((l) => {
            const s = positions[l.source];
            const t = positions[l.target];
            if (!s || !t) return null;
            return (
              <g key={l.id}>
                <line x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="#007acc" strokeWidth={3} strokeDasharray="5,5" />
                {l.srcIfName && (
                  <text x={(s.x*2 + t.x)/3} y={(s.y*2 + t.y)/3 - 6} fontSize="10" fill="#4b5563" textAnchor="middle">{l.srcIfName}</text>
                )}
                {l.dstIfName && (
                  <text x={(t.x*2 + s.x)/3} y={(t.y*2 + s.y)/3 - 6} fontSize="10" fill="#4b5563" textAnchor="middle">{l.dstIfName}</text>
                )}
              </g>
            );
          })}
        </svg>
        {nodes.map((n) => {
          const p = positions[n.id] || { x: 100, y: 100 };
          return (
            <div key={n.id} onMouseDown={(e) => onMouseDownNode(e, n.id)} className="device absolute bg-white border-2 border-gray-200 rounded-lg p-2 text-center shadow cursor-move hover:shadow-lg transition-shadow" style={{ left: p.x - 70, top: p.y - 55, width: 140, userSelect: 'none', zIndex: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
              <img src={iconFor(n.type, n.label)} alt={n.type || 'device'} draggable={false} onDragStart={(ev) => ev.preventDefault()} className="device-icon" style={{ width: 40, height: 40, margin: '0 auto 6px', objectFit: 'contain', pointerEvents: 'none' }} />
              <div className="device-hostname font-semibold text-xs" title={n.label} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.label}</div>
              <div className="device-ip text-[10px] text-gray-600" title={n.mgmtIp || n.id} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.mgmtIp || n.id}</div>
              <div className="device-type text-[9px] mt-1 inline-block px-2 py-0.5 rounded bg-blue-600 text-white uppercase">{(n.type || 'device')}</div>
            </div>
          );
        })}
      </div>
      <div className="legend flex gap-4 items-center text-sm text-gray-600">
        <div className="flex items-center gap-2"><span className="inline-block w-5 h-5 rounded" style={{ background: '#007acc' }} /> Router</div>
        <div className="flex items-center gap-2"><span className="inline-block w-5 h-5 rounded" style={{ background: '#28a745' }} /> Switch</div>
        <div className="flex items-center gap-2"><span className="inline-block w-5 h-5 rounded" style={{ background: '#dc3545' }} /> Firewall</div>
        <div className="flex items-center gap-2"><span className="inline-block" style={{ background: '#007acc', width: 30, height: 3 }} /> Connection</div>
      </div>
    </div>
  );
};

export default TopologyGraph;


