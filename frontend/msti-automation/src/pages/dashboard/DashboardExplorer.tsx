import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSource } from '../../context/SourceContext';

// Mock data untuk daftar dashboard
const MOCK_DASHBOARDS = [
  { id: '1', title: 'Network Statistics', description: 'Network performance monitoring', starred: true, tags: ['network', 'monitoring'] },
  { id: '2', title: 'System Resources', description: 'CPU, memory, and disk usage', starred: false, tags: ['system', 'resources'] },
  { id: '3', title: 'Application Performance', description: 'App response times and errors', starred: true, tags: ['application', 'performance'] },
  { id: '4', title: 'Security Dashboard', description: 'Security alerts and metrics', starred: false, tags: ['security'] }
];

const DashboardExplorer: React.FC = () => {
  useSource();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStarred, setFilterStarred] = useState(false);

  // Filter dashboard berdasarkan pencarian dan filter bintang
  const filteredDashboards = MOCK_DASHBOARDS.filter(
    dashboard => {
      // Filter pencarian
      const matchesSearch = 
        dashboard.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dashboard.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dashboard.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Filter bintang
      const matchesStarred = filterStarred ? dashboard.starred : true;
      
      return matchesSearch && matchesStarred;
    }
  );

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
        
        {/* Search & Filter Controls */}
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
            <label className="flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={filterStarred} 
                onChange={() => setFilterStarred(!filterStarred)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Starred only</span>
            </label>
          </div>
          
          <div className="flex items-center">
            <span className="text-sm text-gray-500">
              Showing {filteredDashboards.length} of {MOCK_DASHBOARDS.length} dashboards
            </span>
          </div>
        </div>
      </div>
      
      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDashboards.map((dashboard) => (
          <div key={dashboard.id} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-medium text-gray-800">{dashboard.title}</h3>
                <button 
                  onClick={() => {
                    // Toggle star logic would go here
                  }}
                  className="p-1"
                >
                  <svg 
                    className={`w-5 h-5 ${dashboard.starred ? 'text-yellow-400 fill-current' : 'text-gray-400'}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={dashboard.starred ? 0 : 2} 
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" 
                    />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-3">{dashboard.description}</p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {dashboard.tags.map((tag, idx) => (
                  <span 
                    key={idx} 
                    className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              
              <div className="flex justify-end gap-2">
                <Link
                  to={`/dashboard/view/${dashboard.id}`}
                  className="px-3 py-1.5 text-sm bg-transparent border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                >
                  View
                </Link>
                <Link
                  to={`/dashboard/edit/${dashboard.id}`}
                  className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Edit
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Empty State */}
      {filteredDashboards.length === 0 && (
        <div className="bg-white p-8 rounded-lg shadow-sm text-center">
          <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-800">No dashboards found</h3>
          <p className="mt-2 text-gray-600">Try adjusting your search or filters, or create a new dashboard.</p>
          <Link
            to="/dashboard/new"
            className="mt-4 inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Create New Dashboard
          </Link>
        </div>
      )}
    </div>
  );
};

export default DashboardExplorer;