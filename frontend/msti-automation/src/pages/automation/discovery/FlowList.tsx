import React from 'react';
import { useNavigate } from 'react-router-dom';

const FlowList: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Flow Analytic</h1>
          <p className="text-gray-600 mt-1">Analisis alur NetFlow berdasarkan query InfluxDB.</p>
        </div>
        <button onClick={() => navigate('/automation/flow/new')} className="px-4 py-2 bg-blue-600 text-white rounded-md">Create New Job</button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="text-gray-600">Belum ada job. Klik "Create New Job" untuk memulai.</div>
      </div>
    </div>
  );
};

export default FlowList;


