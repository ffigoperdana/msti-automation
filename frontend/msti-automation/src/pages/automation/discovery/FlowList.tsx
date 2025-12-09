import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import useAuthStore from '../../../store/authStore';

interface FlowAnalytic {
  id: string;
  name: string;
  sourceQuery: string;
  destinationQuery: string;
  dataSourceId: string;
  createdAt: string;
}

const FlowList: React.FC = () => {
  const navigate = useNavigate();
  const [flows, setFlows] = useState<FlowAnalytic[]>([]);
  const [loading, setLoading] = useState(true);
  const { canWrite } = useAuthStore();

  useEffect(() => {
    fetchFlows();
  }, []);

  const fetchFlows = async () => {
    try {
      const { data } = await api.get('/flow-analytics');
      setFlows(data || []);
    } catch (error) {
      console.error('Error fetching flows:', error);
      setFlows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewFlow = async (flow: FlowAnalytic) => {
    try {
      // Re-execute the flow to get fresh data
      const { data } = await api.post('/flow-analytics/execute', {
        sourceQuery: flow.sourceQuery,
        destinationQuery: flow.destinationQuery,
        dataSourceId: flow.dataSourceId,
      });

      // Navigate to detail with the result
      const payload = encodeURIComponent(JSON.stringify({ 
        sourceQuery: flow.sourceQuery,
        destinationQuery: flow.destinationQuery,
        dataSourceId: flow.dataSourceId,
        result: data 
      }));
      navigate(`/automation/flow/detail?payload=${payload}`);
    } catch (error) {
      console.error('Error executing flow:', error);
      alert('Failed to execute flow analytic');
    }
  };

  const handleDeleteFlow = async (id: string) => {
    if (!confirm('Are you sure you want to delete this flow analytic?')) {
      return;
    }

    try {
      await api.delete(`/flow-analytics/${id}`);
      fetchFlows(); // Refresh list
    } catch (error) {
      console.error('Error deleting flow:', error);
      alert('Failed to delete flow analytic');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Flow Analytic</h1>
          <p className="text-gray-600 mt-1">Analisis alur NetFlow berdasarkan query InfluxDB.</p>
        </div>
        {canWrite() && (
          <button onClick={() => navigate('/automation/flow/new')} className="px-4 py-2 bg-blue-600 text-white rounded-md">Create New Job</button>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        {loading ? (
          <div className="text-gray-600">Loading...</div>
        ) : flows.length === 0 ? (
          <div className="text-gray-600">Belum ada job. Klik "Create New Job" untuk memulai.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {flows.map((flow) => (
                  <tr key={flow.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{flow.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(flow.createdAt).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => handleViewFlow(flow)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        View
                      </button>
                      {canWrite() && (
                        <button 
                          onClick={() => handleDeleteFlow(flow.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlowList;


