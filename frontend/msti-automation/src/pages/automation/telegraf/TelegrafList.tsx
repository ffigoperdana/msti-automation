import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../../../config';

interface TelegrafConfig {
  filename: string;
  baseName: string;
  enabled: boolean;
  size: number;
  modified: string;
  path: string;
}

interface TelegrafStatus {
  active: boolean;
  enabled: boolean;
  status: string;
}

const TelegrafList: React.FC = () => {
  const [configs, setConfigs] = useState<TelegrafConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [telegrafStatus, setTelegrafStatus] = useState<TelegrafStatus | null>(null);
  const [isRestarting, setIsRestarting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // Fetch configs and status
  useEffect(() => {
    fetchConfigs();
    fetchStatus();
  }, []);

  const fetchConfigs = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/telegraf/configs`);
      const data = await response.json();
      
      if (data.success) {
        setConfigs(data.configs || []);
      }
    } catch (error) {
      console.error('Error fetching configs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/telegraf/status`);
      const data = await response.json();
      
      if (data.success) {
        setTelegrafStatus({
          active: data.active,
          enabled: data.enabled,
          status: data.status
        });
      }
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  };

  const handleRescan = async () => {
    try {
      setIsScanning(true);
      const response = await fetch(`${API_URL}/telegraf/scan`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        setConfigs(data.configs || []);
        alert('Directory scanned successfully!');
      }
    } catch (error) {
      console.error('Error rescanning:', error);
      alert('Failed to scan directory');
    } finally {
      setIsScanning(false);
    }
  };

  const handleRestart = async () => {
    if (!confirm('Are you sure you want to restart Telegraf service?')) {
      return;
    }

    try {
      setIsRestarting(true);
      const response = await fetch(`${API_URL}/telegraf/restart`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        alert('Telegraf restarted successfully!');
        await fetchStatus();
      } else {
        alert('Failed to restart Telegraf');
      }
    } catch (error) {
      console.error('Error restarting telegraf:', error);
      alert('Failed to restart Telegraf');
    } finally {
      setIsRestarting(false);
    }
  };

  const handleToggleEnable = async (filename: string, currentState: boolean) => {
    try {
      const response = await fetch(`${API_URL}/telegraf/configs/${filename}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentState })
      });
      const data = await response.json();
      
      if (data.success) {
        await fetchConfigs();
      } else {
        alert('Failed to toggle config');
      }
    } catch (error) {
      console.error('Error toggling config:', error);
      alert('Failed to toggle config');
    }
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`Are you sure you want to delete ${filename}?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/telegraf/configs/${filename}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        await fetchConfigs();
      } else {
        alert('Failed to delete config');
      }
    } catch (error) {
      console.error('Error deleting config:', error);
      alert('Failed to delete config');
    }
  };

  const handleDuplicate = async (filename: string) => {
    try {
      // Read original config
      const response = await fetch(`${API_URL}/telegraf/configs/${filename}`);
      const data = await response.json();
      
      if (!data.success) {
        alert('Failed to read config');
        return;
      }

      // Create copy with new name
      const baseName = data.config.baseName.replace('.conf', '');
      const newFilename = `${baseName}_copy.conf`;
      
      const createResponse = await fetch(`${API_URL}/telegraf/configs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: newFilename,
          content: data.config.content,
          enabled: false,
          validate: false
        })
      });
      
      const createData = await createResponse.json();
      
      if (createData.success) {
        await fetchConfigs();
        alert('Config duplicated successfully!');
      } else {
        alert('Failed to duplicate config');
      }
    } catch (error) {
      console.error('Error duplicating config:', error);
      alert('Failed to duplicate config');
    }
  };

  // Filter configs
  const filteredConfigs = configs.filter(config => 
    config.baseName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Telegraf Configuration</h1>
            {telegrafStatus && (
              <div className="flex items-center gap-2 mt-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  telegrafStatus.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  <span className={`w-2 h-2 rounded-full mr-1 ${
                    telegrafStatus.active ? 'bg-green-500' : 'bg-red-500'
                  }`}></span>
                  {telegrafStatus.status}
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRescan}
              disabled={isScanning}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors disabled:opacity-50 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isScanning ? 'Scanning...' : 'Scan Directory'}
            </button>
            <button
              onClick={handleRestart}
              disabled={isRestarting}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isRestarting ? 'Restarting...' : 'Restart Telegraf'}
            </button>
            <Link 
              to="/automation/telegraf/new" 
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Config
            </Link>
          </div>
        </div>
        
        {/* Search */}
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-grow max-w-md">
            <input
              type="text"
              placeholder="Search configs..."
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
              Showing {filteredConfigs.length} of {configs.length} configs
            </span>
          </div>
        </div>
      </div>
      
      {/* Configs List */}
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
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Filename</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Modified</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredConfigs.map((config) => (
                  <tr key={config.filename} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{config.baseName}</div>
                      <div className="text-xs text-gray-500">{config.filename}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleEnable(config.filename, config.enabled)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                          config.enabled 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {config.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatFileSize(config.size)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(config.modified).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleDuplicate(config.filename)}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                          title="Duplicate config"
                        >
                          Duplicate
                        </button>
                        <Link
                          to={`/automation/telegraf/edit/${config.filename}`}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(config.filename)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Empty State */}
          {filteredConfigs.length === 0 && (
            <div className="bg-white p-8 text-center">
              <svg 
                className="mx-auto h-12 w-12 text-gray-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No configurations</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new telegraf configuration.</p>
              <div className="mt-6">
                <Link
                  to="/automation/telegraf/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Configuration
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TelegrafList;
