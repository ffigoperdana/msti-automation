import React from 'react';

type Role = 'source' | 'destination' | 'gateway';

interface FlowNode {
  id: string;
  label: string;  // IP or hostname
  role: Role;
  chips?: string[]; // e.g., tcp/80 or Eth1/1
}

interface FlowLink {
  id: string;
  source: string;
  target: string;
  srcIfName?: string; // e.g., tcp/80 (Source) or Eth1/1
  dstIfName?: string; // e.g., tcp/80 (Destination) or vmnic
}

interface Props {
  nodes: FlowNode[]; // must be length 3: src -> gw -> dst
  links: FlowLink[]; // 2 links
}

const roleColor: Record<Role, string> = {
  source: '#16a34a',
  destination: '#7c3aed',
  gateway: '#334155',
};

const FlowPath: React.FC<Props> = ({ nodes, links }) => {
  const width = 1000;
  const height = 260;
  const cx = [200, 500, 800];
  const cy = [120, 120, 120];
  const r = 26;

  const byId: Record<string, FlowNode> = Object.fromEntries(nodes.map(n => [n.id, n]));

  const circleChip = (text: string, x: number, y: number) => (
    <g transform={`translate(${x},${y})`}>
      <rect x={-24} y={-10} width={48} height={18} rx={9} ry={9} fill="#e5e7eb" stroke="#d1d5db"/>
      <text x={0} y={3} fontSize={10} fill="#111827" textAnchor="middle">{text}</text>
    </g>
  );

  const rolePill = (role: Role, x: number, y: number) => {
    const label = role.toUpperCase();
    // Estimate width based on char count (approx 7px per char + padding)
    const width = Math.max(52, label.length * 7 + 14);
    return (
      <g transform={`translate(${x},${y})`}>
        <rect x={-width/2} y={-10} width={width} height={18} rx={9} ry={9} fill={roleColor[role]} />
        <text x={0} y={3} fontSize={10} fill="#ffffff" textAnchor="middle" style={{textTransform: 'uppercase'}}>{label}</text>
      </g>
    );
  };

  const nodeAt = (id: string) => nodes.find((n) => n.id === id)!;

  const linkElems = links.map((l) => {
    const sIdx = nodes.findIndex(n => n.id === l.source);
    const tIdx = nodes.findIndex(n => n.id === l.target);
    const x1 = cx[sIdx];
    const y1 = cy[sIdx];
    const x2 = cx[tIdx];
    const y2 = cy[tIdx];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / len;
    const ny = dx / len;
    const off = 14;
    const sx = x1 + dx * 0.35 + nx * off;
    const sy = y1 + dy * 0.35 + ny * off;
    const tx = x1 + dx * 0.65 - nx * off;
    const ty = y1 + dy * 0.65 - ny * off;
    return (
      <g key={l.id}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#007acc" strokeWidth={3} strokeDasharray="5,5" />
        {l.srcIfName && (
          <text x={sx} y={sy} fontSize={10} fill="#4b5563" textAnchor="middle" dominantBaseline="central" style={{paintOrder: 'stroke', stroke: '#ffffff', strokeWidth: 3} as any}>{l.srcIfName}</text>
        )}
        {l.dstIfName && (
          <text x={tx} y={ty} fontSize={10} fill="#4b5563" textAnchor="middle" dominantBaseline="central" style={{paintOrder: 'stroke', stroke: '#ffffff', strokeWidth: 3} as any}>{l.dstIfName}</text>
        )}
      </g>
    );
  });

  return (
    <div className="bg-white border rounded-lg p-4">
      <svg width={width} height={height} style={{display: 'block', margin: '0 auto'}}>
        {linkElems}

        {nodes.map((n, i) => (
          <g key={n.id}>
            {/* Circles with hover scale */}
            <g className="cursor-pointer" transform={`translate(${cx[i]},${cy[i]})`}>
              <g className="flow-node-circle" style={{ transition: 'transform 120ms ease' } as any}>
                <circle r={r} fill="#ffffff" stroke="#d1d5db" strokeWidth={3} className="flow-node-outer" />
                <circle r={r - 10} fill="#eef2f7" stroke="#cbd5e1" strokeWidth={2} className="flow-node-inner" />
              </g>
            </g>
            {/* Node label (IP/hostname) */}
            <text x={cx[i]} y={cy[i]-r-14} fontSize={12} fontWeight={600} textAnchor="middle" fill="#111827">{n.label}</text>
            {/* Role pill below circle */}
            {rolePill(n.role, cx[i], cy[i] + r + 18)}
            {/* Extra chips (ports/interfaces) */}
            {n.chips && n.chips[0] && circleChip(n.chips[0], cx[i], cy[i] + r + 40)}
            {n.chips && n.chips[1] && circleChip(n.chips[1], cx[i], cy[i] + r + 62)}
          </g>
        ))}
      </svg>
    </div>
  );
};

export default FlowPath;


