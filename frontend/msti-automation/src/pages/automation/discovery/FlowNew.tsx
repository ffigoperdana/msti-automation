import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';

const FlowNew: React.FC = () => {
  const navigate = useNavigate();
  const [srcQuery, setSrcQuery] = useState('');
  const [dstQuery, setDstQuery] = useState('');
  const [integrate, setIntegrate] = useState(true);
  const [cdpList, setCdpList] = useState<Array<{ id: string; name?: string }>>([]);
  const [cdpId, setCdpId] = useState<string>('');

  useEffect(() => {
    // Fetch CDP discoveries for dropdown (dummy: call existing API)
    (async () => {
      try {
        const { data } = await api.get('/cdp/discoveries');
        setCdpList(data || []);
        if (data && data.length) setCdpId(data[0].id);
      } catch {
        setCdpList([]);
      }
    })();
  }, []);

  const handleGenerate = () => {
    // Navigate to detail with encoded payload (dummy flow)
    const payload = encodeURIComponent(JSON.stringify({ srcQuery, dstQuery, cdpId, integrate }));
    navigate(`/automation/flow/detail?payload=${payload}`);
  };

  const exampleSrc = `from(bucket: "telegraf")\n  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)\n  |> filter(fn: (r) => r["source"] == "192.168.238.101")\n  |> filter(fn: (r) => r["_measurement"] == "netflow")\n  |> filter(fn: (r) => r["_field"] == "src")\n  |> aggregateWindow(every: v.windowPeriod, fn: last, createEmpty: false)\n  |> yield(name: "last")`;
  const exampleDst = exampleSrc.replace('"src"', '"dst"');

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-800">New Flow Analytic</h1>
        <p className="text-gray-600 mt-1">Masukkan Flux query untuk Source dan Destination NetFlow.</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">InfluxDB Flux Query (Source)</label>
          <textarea value={srcQuery} onChange={(e) => setSrcQuery(e.target.value)} className="w-full border rounded px-3 py-2 h-40 font-mono text-xs" placeholder={exampleSrc} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">InfluxDB Flux Query (Destination)</label>
          <textarea value={dstQuery} onChange={(e) => setDstQuery(e.target.value)} className="w-full border rounded px-3 py-2 h-40 font-mono text-xs" placeholder={exampleDst} />
        </div>

        <div className="flex items-center gap-3">
          <input id="integrate" type="checkbox" checked={integrate} onChange={(e) => setIntegrate(e.target.checked)} />
          <label htmlFor="integrate">Integrate with CDP feature</label>
          {integrate && (
            <select value={cdpId} onChange={(e) => setCdpId(e.target.value)} className="ml-3 border rounded px-2 py-1">
              {cdpList.map((c) => (
                <option key={c.id} value={c.id}>{c.name || c.id}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={() => navigate('/automation/flow')} className="px-4 py-2 border rounded">Cancel</button>
          <button onClick={handleGenerate} className="px-4 py-2 bg-blue-600 text-white rounded">Generate</button>
        </div>
      </div>
    </div>
  );
};

export default FlowNew;


