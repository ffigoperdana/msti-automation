import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useAuthStore from '../../../store/authStore';

// Interface untuk data webhook
interface Webhook {
  id: string;
  name: string;
  description: string;
  port: number;
  endpoint: string;
  isRunning: boolean;
  createdAt: string;
  pmId?: number;
}

// Data dummy untuk daftar webhook
const MOCK_WEBHOOKS: Webhook[] = [
  {
    id: '1',
    name: 'Alert Handler',
    description: 'Handles alert notifications and triggers Ansible script',
    port: 5000,
    endpoint: '/webhook',
    isRunning: true,
    createdAt: '2025-04-15T10:30:00Z',
    pmId: 0
  },
  {
    id: '2',
    name: 'Monitoring Webhook',
    description: 'Receives monitoring data from external sources',
    port: 5001,
    endpoint: '/monitoring',
    isRunning: true,
    createdAt: '2025-04-16T14:20:00Z',
    pmId: 1
  },
  {
    id: '3',
    name: 'CI/CD Integration',
    description: 'Webhook for CI/CD pipeline integration',
    port: 5002,
    endpoint: '/deployment',
    isRunning: false,
    createdAt: '2025-04-17T09:15:00Z'
  }
];

const WebhookList: React.FC = () => {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'stopped'>('all');
  const { canWrite } = useAuthStore();

  // Simulasi fetching data dari API
  useEffect(() => {
    // Dalam implementasi nyata, ini akan menjadi panggilan API
    const fetchData = async () => {
      try {
        // Simulasi loading delay
        await new Promise(resolve => setTimeout(resolve, 800));
        setWebhooks(MOCK_WEBHOOKS);
      } catch (error) {
        console.error('Error fetching webhooks:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter webhook berdasarkan pencarian dan status
  const filteredWebhooks = webhooks.filter(webhook => {
    // Filter berdasarkan kata kunci
    const matchesSearch = 
      webhook.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      webhook.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      webhook.endpoint.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter berdasarkan status
    const matchesStatus = 
      statusFilter === 'all' ? true : 
      statusFilter === 'running' ? webhook.isRunning : 
      !webhook.isRunning;
    
    return matchesSearch && matchesStatus;
  });

  // Menangani start/stop webhook
  const handleToggleStatus = (id: string) => {
    setWebhooks(prev => 
      prev.map(webhook => 
        webhook.id === id 
          ? { ...webhook, isRunning: !webhook.isRunning } 
          : webhook
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <h1 className="text-2xl font-semibold text-gray-800">Webhooks</h1>
          {canWrite() && (
            <Link 
              to="/automation/webhook/new" 
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Webhook
            </Link>
          )}
        </div>
        
        {/* Search and Filter */}
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-grow max-w-md">
            <input
              type="text"
              placeholder="Search webhooks..."
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
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'running' | 'stopped')}
              className="border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All</option>
              <option value="running">Running</option>
              <option value="stopped">Stopped</option>
            </select>
          </div>
          
          <div className="flex items-center">
            <span className="text-sm text-gray-500">
              Showing {filteredWebhooks.length} of {webhooks.length} webhooks
            </span>
          </div>
        </div>
      </div>
      
      {/* Webhooks List */}
      {isLoading ? (
        <div className="bg-white p-8 rounded-lg shadow-sm flex justify-center">
          <svg 
            className="animate-spin h-8 w-8 text-blue-500" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            ></circle>
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Endpoint</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PM2 ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredWebhooks.map((webhook) => (
                  <tr key={webhook.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{webhook.name}</div>
                      <div className="text-sm text-gray-500">{webhook.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <code className="px-2 py-1 bg-gray-100 rounded text-xs">:{webhook.port}{webhook.endpoint}</code>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        webhook.isRunning
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {webhook.isRunning ? 'Running' : 'Stopped'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {webhook.pmId !== undefined ? webhook.pmId : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(webhook.createdAt).toLocaleDateString()}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {canWrite() && (
                          <button
                            onClick={() => handleToggleStatus(webhook.id)}
                            className={`px-3 py-1 rounded text-white ${
                              webhook.isRunning
                                ? 'bg-red-500 hover:bg-red-600'
                                : 'bg-green-500 hover:bg-green-600'
                            }`}
                          >
                            {webhook.isRunning ? 'Stop' : 'Start'}
                          </button>
                        )}
                        {canWrite() ? (
                          <Link
                            to={`/automation/webhook/edit/${webhook.id}`}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            Edit
                          </Link>
                        ) : (
                          <Link
                            to={`/automation/webhook/view/${webhook.id}`}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            View
                          </Link>
                        )}
                        <Link
                          to={`/automation/webhook/logs/${webhook.id}`}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                          Logs
                        </Link>
                      </div>
                    </td>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Empty State */}
          {filteredWebhooks.length === 0 && (
            <div className="bg-white p-8 text-center">
              <svg 
                className="mx-auto h-12 w-12 text-gray-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1} 
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">No webhooks found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'Get started by creating a new webhook'}
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <Link
                  to="/automation/webhook/new"
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <svg 
                    className="-ml-1 mr-2 h-5 w-5" 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 20 20" 
                    fill="currentColor" 
                    aria-hidden="true"
                  >
                    <path 
                      fillRule="evenodd" 
                      d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" 
                      clipRule="evenodd" 
                    />
                  </svg>
                  Create Webhook
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WebhookList; 