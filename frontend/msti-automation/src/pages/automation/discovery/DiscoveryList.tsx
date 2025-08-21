import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useCdpStore from '../../../store/cdpStore';

const DiscoveryList: React.FC = () => {
  const navigate = useNavigate();
  const { discoveries, fetchList, loading, deleteDiscovery } = useCdpStore();

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleDelete = async (id: string) => {
    if (confirm('Delete this discovery?')) {
      await deleteDiscovery(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">CDP Discoveries</h1>
          <p className="text-gray-600 mt-1">Kelola job discovery dan lihat hasil topology.</p>
        </div>
        <button onClick={() => navigate('/automation/cdp/new')} className="px-4 py-2 bg-blue-600 text-white rounded-md">
          Create New Job
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        {loading.list ? (
          <div>Loading...</div>
        ) : discoveries.length === 0 ? (
          <div className="text-gray-600">Belum ada job. Klik "Create New Job" untuk memulai.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Created</th>
                  <th className="px-4 py-2">Finished</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {discoveries.map((d) => (
                  <tr key={d.id} className="border-t">
                    <td className="px-4 py-2">{d.name || d.id}</td>
                    <td className="px-4 py-2">{d.status}</td>
                    <td className="px-4 py-2">{new Date(d.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-2">{d.finishedAt ? new Date(d.finishedAt).toLocaleString() : '-'}</td>
                    <td className="px-4 py-2 space-x-3">
                      <Link to={`/automation/cdp/${d.id}`} className="text-blue-600 hover:underline">View</Link>
                      <button onClick={() => handleDelete(d.id)} className="text-red-600 hover:underline">Delete</button>
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

export default DiscoveryList;


