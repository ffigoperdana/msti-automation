import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import FlowPath from '../../../components/FlowPath';
import '../../../components/FlowPath.css';

const FlowDetail: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const payloadStr = params.get('payload') || '{}';
  const payload = useMemo(() => {
    try { 
      const decoded = JSON.parse(decodeURIComponent(payloadStr));
      console.log('=== FLOW DETAIL PAGE ===');
      console.log('Payload:', decoded);
      console.log('Result Nodes:', decoded.result?.nodes);
      console.log('Result Links:', decoded.result?.links);
      return decoded;
    } catch { 
      return {}; 
    }
  }, [payloadStr]);

  const nodes = payload.result?.nodes || [];
  const links = payload.result?.links || [];

  console.log('Rendering with nodes:', nodes);
  console.log('Rendering with links:', links);

  // Extract source and destination IPs for display
  const sourceIp = nodes.find((n: any) => n.role === 'source')?.mgmtIp || 'N/A';
  const destinationIp = nodes.find((n: any) => n.role === 'destination')?.mgmtIp || 'N/A';

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Flow Analytic Detail</h1>
          <p className="text-gray-600 mt-1">Visualisasi alur: {sourceIp} → {destinationIp}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/automation/flow')} className="px-4 py-2 border rounded">Back</button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="font-semibold mb-1">Source Query</div>
            <pre className="text-xs bg-gray-50 border rounded p-2 overflow-auto max-h-32">{payload.sourceQuery || '(empty)'}</pre>
          </div>
          <div>
            <div className="font-semibold mb-1">Destination Query</div>
            <pre className="text-xs bg-gray-50 border rounded p-2 overflow-auto max-h-32">{payload.destinationQuery || '(empty)'}</pre>
          </div>
        </div>

        {nodes.length > 0 ? (
          <FlowPath nodes={nodes as any} links={links as any} />
        ) : (
          <div className="text-center text-gray-500 py-8">
            No flow data available. Please check your queries and try again.
          </div>
        )}
      </div>
    </div>
  );
};

export default FlowDetail;


