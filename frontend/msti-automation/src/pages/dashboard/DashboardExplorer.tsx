import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import metricService from '../../services/metricService';

interface DashboardConfig {
  description?: string;
  tags?: string[];
}

interface Dashboard {
  id: string;
  name: string;
  config?: DashboardConfig;
  createdAt: string;
  updatedAt: string;
}

const DashboardExplorer: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboards
  useEffect(() => {
    const fetchDashboards = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await metricService.getDashboards();
        setDashboards(response || []);
      } catch (err) {
        console.error('Error fetching dashboards:', err);
        setError('Failed to load dashboards');
        setDashboards([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboards();
  }, []); // Empty dependency array - only run once on mount

  // Filter dashboard berdasarkan pencarian
  const filteredDashboards = dashboards.filter(
    dashboard => {
      const config = dashboard.config || {};
      // Filter pencarian
      const matchesSearch = 
        dashboard.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (config.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (config.tags || []).some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return matchesSearch;
    }
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      );
    }

    if (dashboards.length === 0) {
      return (
        <div className="bg-white p-8 rounded-lg shadow-sm text-center">
          <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-800">No dashboards yet</h3>
          <p className="mt-2 text-gray-600">Get started by creating your first dashboard.</p>
          <Link
            to="/dashboard/new"
            className="mt-4 inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Create New Dashboard
          </Link>
        </div>
      );
    }

    return (
      <>
        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDashboards.map((dashboard) => (
            <div key={dashboard.id} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-medium text-gray-800">{dashboard.name}</h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">{dashboard.config?.description}</p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {dashboard.config?.tags?.map((tag: string, idx: number) => (
                    <span 
                      key={idx} 
                      className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="text-xs text-gray-500 mb-4">
                  Created: {new Date(dashboard.createdAt).toLocaleDateString()}
                </div>
                
                <div className="flex justify-end gap-2">
                  <Link
                    to={`/dashboard/view/${dashboard.id}`}
                    className="px-3 py-1.5 text-sm bg-transparent border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                  >
                    View
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Empty Search Results */}
        {filteredDashboards.length === 0 && (
          <div className="bg-white p-8 rounded-lg shadow-sm text-center">
            <h3 className="text-lg font-medium text-gray-800">No matching dashboards</h3>
            <p className="mt-2 text-gray-600">Try adjusting your search criteria.</p>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <h1 className="text-2xl font-semibold text-gray-800">Dashboards</h1>
          <Link 
            to="/dashboard/new" 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Dashboard
          </Link>
        </div>
        
        {/* Search Controls */}
        {dashboards.length > 0 && (
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-grow max-w-md">
            <input
              type="text"
              placeholder="Search dashboards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <svg 
              className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          <div className="flex items-center">
            <span className="text-sm text-gray-500">
                Showing {filteredDashboards.length} of {dashboards.length} dashboards
                  </span>
            </div>
          </div>
        )}
      </div>
      
      {renderContent()}
    </div>
  );
};

export default DashboardExplorer;