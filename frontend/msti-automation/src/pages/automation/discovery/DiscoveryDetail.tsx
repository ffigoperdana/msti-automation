import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useCdpStore from '../../../store/cdpStore';
import TopologyGraph from '../../../components/TopologyGraph';

const DiscoveryDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectedDiscovery, graph, fetchDetail, fetchGraph, saveDiscovery, deleteDiscovery, saveGraphLayout, loading } = useCdpStore();

  useEffect(() => {
    if (id) {
      fetchDetail(id);
      fetchGraph(id);
    }
  }, [id, fetchDetail, fetchGraph]);

  if (!id) return null;

  const handleSave = async () => {
    await saveGraphLayout(id);
    await saveDiscovery(id);
    await fetchDetail(id);
    navigate('/automation/cdp');
  };

  const handleDelete = async () => {
    if (confirm('Delete this discovery?')) {
      await deleteDiscovery(id);
      navigate('/automation/cdp');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Discovery Detail</h1>
          {selectedDiscovery && (
            <div className="text-sm text-gray-600">ID: {selectedDiscovery.id} • Status: {selectedDiscovery.status} • Nodes: {selectedDiscovery._count?.nodes || 0} • Links: {selectedDiscovery._count?.links || 0}</div>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={selectedDiscovery?.isSaved || selectedDiscovery?.status !== 'COMPLETED'} className="px-4 py-2 bg-green-600 text-white rounded-md disabled:opacity-60">Save</button>
          <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-md">Delete</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        {loading.graph ? (
          <div>Loading graph...</div>
        ) : graph ? (
          <TopologyGraph nodes={graph.nodes} links={graph.links} />
        ) : (
          <div className="text-gray-600">Graph belum tersedia.</div>
        )}
      </div>
    </div>
  );
};

export default DiscoveryDetail;


