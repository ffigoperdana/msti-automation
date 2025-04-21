import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface DataSource {
  id: string;
  name: string;
  type: 'influxdb';
  url: string;
  auth?: {
    username?: string;
    token?: string;
  };
  database?: string;
  isDefault: boolean;
  health: 'ok' | 'error' | 'unknown';
}

// Data dummy untuk sumber data
const MOCK_DATA_SOURCES: DataSource[] = [
  {
    id: '1',
    name: 'InfluxDB Dev',
    type: 'influxdb',
    url: 'http://localhost:8086',
    auth: { 
      username: 'admin',
      token: 'MySecretToken123'
    },
    database: 'metrics',
    isDefault: true,
    health: 'ok'
  },
  {
    id: '2',
    name: 'InfluxDB Production',
    type: 'influxdb',
    url: 'https://influx.example.com',
    auth: {
      token: 'ProductionToken456'
    },
    database: 'system_metrics',
    isDefault: false,
    health: 'ok'
  },
  {
    id: '3',
    name: 'InfluxDB Staging',
    type: 'influxdb',
    url: 'https://influx-staging.example.com',
    auth: {
      token: 'StagingToken789'
    },
    database: 'app_metrics',
    isDefault: false,
    health: 'error'
  }
];

const TYPE_ICONS = {
  'influxdb': '⏱️'
};

const DataSources: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dataSources, setDataSources] = useState<DataSource[]>(MOCK_DATA_SOURCES);
  
  // Filter data sources berdasarkan pencarian
  const filteredDataSources = dataSources.filter(ds => 
    ds.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ds.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ds.database && ds.database.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  const setDefaultDataSource = (id: string) => {
    setDataSources(prevSources => 
      prevSources.map(source => ({
        ...source,
        isDefault: source.id === id
      }))
    );
  };
  
  const deleteDataSource = (id: string) => {
    setDataSources(prevSources => prevSources.filter(source => source.id !== id));
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <h1 className="text-2xl font-semibold text-gray-800">Data Sources</h1>
          <Link 
            to="/connections/new" 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Data Source
          </Link>
        </div>
        
        {/* Search */}
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Search data sources..."
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
      </div>
      
      {/* Data Sources List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  URL
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Database
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Default
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Health
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDataSources.map((ds) => (
                <tr key={ds.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-xl mr-2">{TYPE_ICONS[ds.type]}</span>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{ds.name}</div>
                        <div className="text-xs text-gray-500 capitalize">{ds.type}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ds.url}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ds.database || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {ds.isDefault ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Default
                      </span>
                    ) : (
                      <button 
                        onClick={() => setDefaultDataSource(ds.id)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Make Default
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${ds.health === 'ok' 
                        ? 'bg-green-100 text-green-800' 
                        : ds.health === 'error' 
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {ds.health === 'ok' 
                        ? 'Healthy' 
                        : ds.health === 'error' 
                        ? 'Error'
                        : 'Unknown'
                      }
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-3">
                      <button className="text-blue-600 hover:text-blue-900">
                        Test
                      </button>
                      <Link 
                        to={`/connections/data-sources/edit/${ds.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </Link>
                      {!ds.isDefault && (
                        <button 
                          onClick={() => deleteDataSource(ds.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      )}
                      <Link
                        to={`/dashboard/new?datasource=${ds.id}`}
                        className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                      >
                        Build Dashboard
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Empty State */}
        {filteredDataSources.length === 0 && (
          <div className="text-center py-12">
            <svg 
              className="mx-auto h-12 w-12 text-gray-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1} 
                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" 
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No data sources found</h3>
            <p className="mt-1 text-sm text-gray-500">Add a data source to start visualizing your metrics.</p>
            <div className="mt-6">
              <Link
                to="/connections/new"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Data Source
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataSources; 