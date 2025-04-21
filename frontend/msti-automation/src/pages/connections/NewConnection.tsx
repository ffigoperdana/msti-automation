import React from 'react';
import { Link } from 'react-router-dom';

// Tipe koneksi yang didukung
const CONNECTION_TYPES = [
  {
    id: 'influxdb',
    name: 'InfluxDB',
    description: 'Time series database optimized for high-write-load time series data and analytics.',
    icon: '⏱️',
    recommended: true
  },
  {
    id: 'prometheus',
    name: 'Prometheus',
    description: 'Monitoring system and time series database.',
    icon: '📊',
    recommended: false,
    comingSoon: true
  },
  {
    id: 'elasticsearch',
    name: 'Elasticsearch',
    description: 'Distributed, RESTful search and analytics engine.',
    icon: '🔍',
    recommended: false,
    comingSoon: true
  },
  {
    id: 'mysql',
    name: 'MySQL',
    description: 'Open-source relational database management system.',
    icon: '💾',
    recommended: false,
    comingSoon: true
  },
  {
    id: 'postgresql',
    name: 'PostgreSQL',
    description: 'Advanced open-source relational database.',
    icon: '🐘',
    recommended: false,
    comingSoon: true
  },
  {
    id: 'mongodb',
    name: 'MongoDB',
    description: 'Document-oriented NoSQL database.',
    icon: '📄',
    recommended: false,
    comingSoon: true
  }
];

const NewConnection: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-800">Add New Connection</h1>
        <p className="text-gray-600 mt-1">
          Connect to your data sources to visualize metrics and create dashboards
        </p>
      </div>
      
      {/* Connection Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CONNECTION_TYPES.map(connection => (
          <div 
            key={connection.id}
            className={`bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow ${connection.comingSoon ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <Link 
              to={connection.comingSoon ? '#' : `/connections/data-sources/new/${connection.id}`}
              className="block p-5"
              onClick={e => connection.comingSoon && e.preventDefault()}
            >
              <div className="flex items-start">
                <div className="text-3xl mr-3">{connection.icon}</div>
                <div>
                  <div className="flex items-center">
                    <h3 className="text-lg font-medium text-gray-800">{connection.name}</h3>
                    {connection.recommended && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        Recommended
                      </span>
                    )}
                    {connection.comingSoon && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{connection.description}</p>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
      
      {/* Quick Help */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h2 className="text-lg font-medium text-gray-800">Tips for Connecting Data Sources</h2>
        <ul className="mt-3 space-y-2 text-sm text-gray-600">
          <li className="flex items-start">
            <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>
              <strong>Access Credentials:</strong> Make sure you have the necessary credentials (URL, username, password, API tokens) for your data source.
            </span>
          </li>
          <li className="flex items-start">
            <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>
              <strong>Network Access:</strong> Ensure that the data source is accessible from the server where this application is running.
            </span>
          </li>
          <li className="flex items-start">
            <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>
              <strong>Connection Testing:</strong> After configuring, use the provided test button to verify the connection works correctly.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default NewConnection; 