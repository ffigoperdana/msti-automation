import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TopologyGraph from '../../../components/TopologyGraph';
import FlowPath from '../../../components/FlowPath';
import '../../../components/FlowPath.css';
import api from '../../../services/api';

const FlowDetail: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const payloadStr = params.get('payload') || '{}';
  const payload = useMemo(() => {
    try { return JSON.parse(decodeURIComponent(payloadStr)); } catch { return {}; }
  }, [payloadStr]);

  const [nodes, setNodes] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);

  useEffect(() => {
    // Base 3 nodes
    const baseNodes = [
      { id: '10.10.10.10', label: '10.10.10.10', mgmtIp: '10.10.10.10', type: 'vm', role: 'source' as const, chips: ['tcp/80'] },
      { id: 'TELEMETRY-SW', label: 'TELEMETRY-SW', mgmtIp: '192.168.238.101', type: 'switch', role: 'gateway' as const },
      { id: '11.11.11.11', label: '11.11.11.11', mgmtIp: '11.11.11.11', type: 'vm', role: 'destination' as const, chips: ['tcp/80'] },
    ];
    const fallbackLinks = [
      { id: 'a', source: '10.10.10.10', target: 'TELEMETRY-SW', linkType: 'flow', srcIfName: 'tcp/80 (Source)', dstIfName: 'vmnic5' },
      { id: 'b', source: 'TELEMETRY-SW', target: '11.11.11.11', linkType: 'flow', srcIfName: 'vmnic4', dstIfName: 'tcp/80 (Destination)' },
    ];

    const run = async () => {
      if (payload.integrate && payload.cdpId) {
        try {
          const { data } = await api.get(`/cdp/discoveries/${payload.cdpId}/graph`);
          // Try to infer gateway interfaces and vmnics from CDP graph
          const telemId = (data.nodes.find((n: any) => (n.label || '').toUpperCase().includes('TELEMETRY')) || {}).id;
          const esxiNodes = data.nodes.filter((n: any) => /ESXI|VMWARE/i.test(n.label || ''));
          const edges = data.links || [];
          let swToVm1: any = null;
          let swToVm2: any = null;
          for (const e of edges) {
            if ((e.source === telemId && esxiNodes.some((x: any) => x.id === e.target)) ||
                (e.target === telemId && esxiNodes.some((x: any) => x.id === e.source))) {
              const dir = e.source === telemId ? e : { ...e, source: e.target, target: e.source, srcIfName: e.dstIfName, dstIfName: e.srcIfName };
              if (!swToVm1) swToVm1 = dir; else swToVm2 = dir;
            }
          }
          const chipsGateway: string[] = [];
          if (swToVm1?.srcIfName) chipsGateway.push(swToVm1.srcIfName);
          if (swToVm2?.srcIfName) chipsGateway.push(swToVm2.srcIfName);
          const g = baseNodes.map(n => n.id === 'TELEMETRY-SW' ? { ...n, chips: chipsGateway } : n);
          setNodes(g);
          setLinks([
            { id: 'a', source: '10.10.10.10', target: 'TELEMETRY-SW', linkType: 'flow', srcIfName: 'tcp/80 (Source)', dstIfName: swToVm1?.dstIfName || 'vmnic5' },
            { id: 'b', source: 'TELEMETRY-SW', target: '11.11.11.11', linkType: 'flow', srcIfName: swToVm2?.srcIfName || 'Eth1/2', dstIfName: 'tcp/80 (Destination)' },
          ]);
          return;
        } catch {
          // fall back to dummy
        }
      }
      // Not integrated → use strict 3-node dummy with tcp/80 badges and generic vmnic labels
      setNodes(baseNodes.map(n => n.id === 'TELEMETRY-SW' ? { ...n, chips: ['Eth1/1','Eth1/2'] } : n));
      setLinks(fallbackLinks);
    };

    run();
  }, [payload.integrate, payload.cdpId]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Flow Analytic Detail</h1>
          <p className="text-gray-600 mt-1">Visualisasi alur: 10.10.10.10 → TELEMETRY-SW → 11.11.11.11</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/automation/flow')} className="px-4 py-2 border rounded">Back</button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="mb-4 text-xs text-gray-600">
          <div>Integrate with CDP: {payload.integrate ? 'Yes' : 'No'}</div>
          {payload.integrate && <div>CDP Topology: {payload.cdpId}</div>}
        </div>
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="font-semibold mb-1">Source Query</div>
            <pre className="text-xs bg-gray-50 border rounded p-2 overflow-auto">{payload.srcQuery || '(empty)'}</pre>
          </div>
          <div>
            <div className="font-semibold mb-1">Destination Query</div>
            <pre className="text-xs bg-gray-50 border rounded p-2 overflow-auto">{payload.dstQuery || '(empty)'}</pre>
          </div>
        </div>
        {payload.integrate ? (
          <TopologyGraph nodes={nodes as any} links={links as any} />
        ) : (
          <FlowPath nodes={nodes as any} links={links as any} />
        )}
      </div>
    </div>
  );
};

export default FlowDetail;


