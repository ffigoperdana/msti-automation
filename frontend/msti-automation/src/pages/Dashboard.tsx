import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import metricService from '../services/metricService';
import VisualizationPanel from '../components/VisualizationPanel';

interface Panel {
  id: string;
  title: string;
  type: string;
  width: number;
  height: number;
  position: { x: number; y: number };
  options: any;
  refreshInterval?: number; // Add refreshInterval field
  queries: {
    refId: string;
    query: string;
    dataSourceId: string;
  }[];
}

interface Dashboard {
  id: string;
  name: string;
  description: string;
  tags: string[];
  panels: Panel[];
  variables: any[];
  createdAt: string;
  updatedAt: string;
}

// Komponen Menu Dropdown

const Dashboard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const response = await metricService.getDashboard(id!);
        setDashboard(response);
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard:', err);
        setError('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchDashboard();
    }
  }, [id]);

  const handleDeletePanel = async (panelId: string) => {
    try {
      await metricService.deletePanel(panelId);
      // Refresh dashboard data
      const updatedDashboard = await metricService.getDashboard(id!);
      setDashboard(updatedDashboard);
    } catch (err) {
      console.error('Error deleting panel:', err);
      alert('Failed to delete panel');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> {error || 'Dashboard not found'}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">{dashboard.name}</h1>
            {dashboard.description && (
              <p className="text-gray-600 mt-1">{dashboard.description}</p>
            )}
          </div>
          <Link
            to={`/dashboard/${dashboard.id}/panel/new`}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Panel
          </Link>
        </div>
      </div>

      {/* Panels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
        {dashboard.panels.map((panel) => {
          // Use panel's gridSpan config to determine column span
          const gridSpan = panel.config?.gridSpan || 1;
          const spanClasses = gridSpan === 3 
            ? "md:col-span-2 lg:col-span-3" 
            : gridSpan === 2 
            ? "md:col-span-2 lg:col-span-2" 
            : "";
          const panelClasses = `min-h-[400px] ${spanClasses}`.trim();
            
          return (
            <div key={panel.id} className={panelClasses}>
              <VisualizationPanel
                panel={panel}
                dashboardId={dashboard.id}
                onDelete={() => handleDeletePanel(panel.id)}
              />
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {dashboard.panels.length === 0 && (
        <div className="bg-white p-8 rounded-lg shadow-sm text-center">
          <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-800">No panels yet</h3>
          <p className="mt-2 text-gray-600">Start by adding a new panel to your dashboard.</p>
          <Link
            to={`/dashboard/${dashboard.id}/panel/new`}
            className="mt-4 inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Add First Panel
          </Link>
        </div>
      )}
    </div>
  );
};

export default Dashboard;