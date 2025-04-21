import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  status: 'firing' | 'pending' | 'normal';
  severity: 'critical' | 'warning' | 'info';
  datasource: string;
  lastEvaluated: string;
  enabled: boolean;
}

// Data dummy untuk alert rules
const MOCK_ALERT_RULES: AlertRule[] = [
  {
    id: '1',
    name: 'High CPU Usage',
    condition: 'above',
    threshold: 80,
    status: 'firing',
    severity: 'critical',
    datasource: 'InfluxDB-Main',
    lastEvaluated: '2023-04-20T10:30:00',
    enabled: true
  },
  {
    id: '2',
    name: 'Memory Usage Warning',
    condition: 'above',
    threshold: 70,
    status: 'normal',
    severity: 'warning',
    datasource: 'InfluxDB-Main',
    lastEvaluated: '2023-04-20T10:30:00',
    enabled: true
  },
  {
    id: '3',
    name: 'Disk Space Low',
    condition: 'below',
    threshold: 10,
    status: 'pending',
    severity: 'warning',
    datasource: 'InfluxDB-Main',
    lastEvaluated: '2023-04-20T10:30:00',
    enabled: true
  },
  {
    id: '4',
    name: 'Network Latency High',
    condition: 'above',
    threshold: 200,
    status: 'normal',
    severity: 'info',
    datasource: 'InfluxDB-Secondary',
    lastEvaluated: '2023-04-20T10:30:00',
    enabled: false
  }
];

const AlertRules: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [alertRules, setAlertRules] = useState<AlertRule[]>(MOCK_ALERT_RULES);

  // Filter alert rules berdasarkan status dan pencarian
  const filteredRules = alertRules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         rule.datasource.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || rule.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Toggle status enabled/disabled untuk alert
  const toggleAlertStatus = (id: string) => {
    setAlertRules(rules => 
      rules.map(rule => 
        rule.id === id 
          ? { ...rule, enabled: !rule.enabled } 
          : rule
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <h1 className="text-2xl font-semibold text-gray-800">Alert Rules</h1>
          <Link 
            to="/alerting/rules/new" 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Alert Rule
          </Link>
        </div>
        
        {/* Filter controls */}
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-grow max-w-md">
            <input
              type="text"
              placeholder="Search alert rules..."
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
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mr-2">
              Status:
            </label>
            <select
              id="status-filter"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="firing">Firing</option>
              <option value="pending">Pending</option>
              <option value="normal">Normal</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Alert Rules Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Condition
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Source
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Evaluated
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Enabled
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRules.map((rule) => (
                <tr key={rule.id} className={rule.enabled ? '' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      rule.status === 'firing' 
                        ? 'bg-red-100 text-red-800' 
                        : rule.status === 'pending' 
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {rule.status.charAt(0).toUpperCase() + rule.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`mr-2 w-2 h-2 rounded-full ${
                        rule.severity === 'critical' 
                          ? 'bg-red-500' 
                          : rule.severity === 'warning' 
                          ? 'bg-yellow-500'
                          : 'bg-blue-500'
                      }`}></div>
                      <span className="text-sm font-medium text-gray-900">
                        {rule.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {rule.condition} {rule.threshold}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {rule.datasource}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(rule.lastEvaluated).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <label className="inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={rule.enabled}
                        onChange={() => toggleAlertStatus(rule.id)}
                      />
                      <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <Link to={`/alerting/rules/edit/${rule.id}`} className="text-blue-600 hover:text-blue-900">
                        Edit
                      </Link>
                      <span className="text-gray-300">|</span>
                      <button className="text-red-600 hover:text-red-900">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Empty state */}
        {filteredRules.length === 0 && (
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No alert rules found</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your search or create a new alert rule.</p>
            <div className="mt-6">
              <Link
                to="/alerting/rules/new"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Alert Rule
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertRules; 