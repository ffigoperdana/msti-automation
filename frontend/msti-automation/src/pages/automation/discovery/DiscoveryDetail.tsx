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

  // Transform graph nodes to include type information
  const transformedNodes = graph?.nodes.map(node => ({
    ...node,
    type: (node as any).type || (node as any).deviceType || 'unknown',
    arp: (node as any).arp || [],
    role: (node as any).role,
    chips: (node as any).chips || [],
  })) || [];

  const transformedLinks = graph?.links.map(link => ({
    ...link,
    srcIfName: (link as any).srcIfName || (link as any).sourceInterface,
    dstIfName: (link as any).dstIfName || (link as any).targetInterface,
  })) || [];

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
          <div className="flex items-center justify-center h-96">
            <div className="text-gray-600">Loading topology...</div>
          </div>
        ) : graph ? (
          <TopologyGraph nodes={transformedNodes} links={transformedLinks} discoveryId={id} />
        ) : (
          <div className="text-gray-600 text-center py-8">Graph not available yet.</div>
        )}
      </div>
    </div>
  );
};

export default DiscoveryDetail;


