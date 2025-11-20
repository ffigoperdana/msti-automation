import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';

const FlowNew: React.FC = () => {
  const navigate = useNavigate();
  const [srcQuery, setSrcQuery] = useState('');
  const [dstQuery, setDstQuery] = useState('');
  const [dataSources, setDataSources] = useState<Array<{ id: string; name: string }>>([]);
  const [dataSourceId, setDataSourceId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch data sources for dropdown
    (async () => {
      try {
        const { data } = await api.get('/visualizations/sources');
        setDataSources(data || []);
        if (data && data.length) setDataSourceId(data[0].id);
      } catch (error) {
        console.error('Error fetching data sources:', error);
        setDataSources([]);
      }
    })();
  }, []);

  const handleGenerate = async () => {
    if (!srcQuery || !dstQuery || !dataSourceId) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      console.log('=== FRONTEND: Executing Flow Analytic ===');
      console.log('Data Source ID:', dataSourceId);
      console.log('Source Query:', srcQuery);
      console.log('Destination Query:', dstQuery);
      
      // Execute flow analytic query
      const { data } = await api.post('/flow-analytics/execute', {
        sourceQuery: srcQuery,
        destinationQuery: dstQuery,
        dataSourceId,
      });

      console.log('=== BACKEND RESPONSE ===');
      console.log('Full Response:', data);
      console.log('Nodes:', data.nodes);
      console.log('Links:', data.links);
      console.log('Source Data:', data.sourceData);
      console.log('Destination Data:', data.destinationData);
      console.log('Raw Source Records:', data.rawSourceData?.length || 0);
      console.log('Raw Destination Records:', data.rawDestinationData?.length || 0);

      // Save the flow analytic to database
      const sourceIp = data.nodes?.find((n: any) => n.role === 'source')?.mgmtIp || 'Unknown';
      const destIp = data.nodes?.find((n: any) => n.role === 'destination')?.mgmtIp || 'Unknown';
      const flowName = `Flow: ${sourceIp} → ${destIp}`;
      
      await api.post('/flow-analytics', {
        name: flowName,
        sourceQuery: srcQuery,
        destinationQuery: dstQuery,
        dataSourceId,
      });

      console.log('Flow analytic saved to database');

      // Navigate to detail with the result
      const payload = encodeURIComponent(JSON.stringify({ 
        sourceQuery: srcQuery,
        destinationQuery: dstQuery,
        dataSourceId,
        result: data 
      }));
      navigate(`/automation/flow/detail?payload=${payload}`);
    } catch (error: any) {
      console.error('=== ERROR ===');
      console.error('Error executing flow analytic:', error);
      console.error('Error response:', error.response?.data);
      alert(error.response?.data?.error || 'Failed to execute flow analytic');
    } finally {
      setLoading(false);
    }
  };

  const exampleSrc = `from(bucket: "telegraf")
  |> range(start: -5m)
  |> filter(fn: (r) => r["source"] == "192.168.238.101")
  |> filter(fn: (r) => r["_measurement"] == "netflow")
  |> filter(fn: (r) => r["_field"] == "src")
  |> aggregateWindow(every: 10s, fn: last, createEmpty: false)
  |> yield(name: "last")`;
  
  const exampleDst = `from(bucket: "telegraf")
  |> range(start: -5m)
  |> filter(fn: (r) => r["source"] == "192.168.238.101")
  |> filter(fn: (r) => r["_measurement"] == "netflow")
  |> filter(fn: (r) => r["_field"] == "dst")
  |> aggregateWindow(every: 10s, fn: last, createEmpty: false)
  |> yield(name: "last")`;

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-800">New Flow Analytic</h1>
        <p className="text-gray-600 mt-1">Masukkan Flux query untuk Source dan Destination NetFlow.</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data Source</label>
          <select 
            value={dataSourceId} 
            onChange={(e) => setDataSourceId(e.target.value)} 
            className="w-full border rounded px-3 py-2"
          >
            {dataSources.map((ds) => (
              <option key={ds.id} value={ds.id}>{ds.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">InfluxDB Flux Query (Source)</label>
          <textarea value={srcQuery} onChange={(e) => setSrcQuery(e.target.value)} className="w-full border rounded px-3 py-2 h-40 font-mono text-xs" placeholder={exampleSrc} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">InfluxDB Flux Query (Destination)</label>
          <textarea value={dstQuery} onChange={(e) => setDstQuery(e.target.value)} className="w-full border rounded px-3 py-2 h-40 font-mono text-xs" placeholder={exampleDst} />
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={() => navigate('/automation/flow')} className="px-4 py-2 border rounded" disabled={loading}>Cancel</button>
          <button onClick={handleGenerate} className="px-4 py-2 bg-blue-600 text-white rounded" disabled={loading}>
            {loading ? 'Executing...' : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlowNew;


