import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSource } from '../../context/SourceContext';

// Tipe panel yang didukung
const PANEL_TYPES = [
  { id: 'time-series', name: 'Time Series', icon: '📈' },
  { id: 'bar-chart', name: 'Bar Chart', icon: '📊' },
  { id: 'gauge', name: 'Gauge', icon: '⏲️' },
  { id: 'stat', name: 'Stat', icon: '📌' },
  { id: 'table', name: 'Table', icon: '🔢' },
  { id: 'interface-status', name: 'Interface Status', icon: '🔌' },
];

// Data interface untuk pemilihan
const INTERFACE_OPTIONS = [
  { id: 'gi0/1', name: 'GigabitEthernet0/1', device: 'Router-1' },
  { id: 'gi0/2', name: 'GigabitEthernet0/2', device: 'Router-1' },
  { id: 'gi0/3', name: 'GigabitEthernet0/3', device: 'Router-1' },
  { id: 'gi0/1-sw', name: 'GigabitEthernet0/1', device: 'Switch-1' },
  { id: 'gi0/2-sw', name: 'GigabitEthernet0/2', device: 'Switch-1' },
];

// Komponen untuk Panel Interface
const InterfaceStatusPanel: React.FC<{ 
  interface: { id: number; name: string; status: string; location: string }
}> = ({ interface: iface }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border-t-4 border-gray-200">
      <div className="font-semibold text-gray-700 text-lg mb-1">{iface.location}</div>
      <div className="text-sm text-gray-500 mb-3">{iface.name}</div>
      <div className={`text-8xl font-bold ${iface.status === 'up' ? 'text-green-600' : 'text-red-600'}`}>
        {iface.status === 'up' ? 'Up' : 'Down'}
      </div>
    </div>
  );
};

const NewDashboard: React.FC = () => {
  const { selectedSource } = useSource();
  const navigate = useNavigate();
  
  const [dashboardName, setDashboardName] = useState('');
  const [dashboardDesc, setDashboardDesc] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');
  const [selectedPanel, setSelectedPanel] = useState(PANEL_TYPES[0].id);
  
  // State untuk konfigurasi query
  const [metric, setMetric] = useState('cpu_usage');
  const [timeRange, setTimeRange] = useState('last_24h');
  const [queryText, setQueryText] = useState('from(bucket: "metrics")\n  |> range(start: -24h)\n  |> filter(fn: (r) => r._measurement == "cpu")\n  |> mean()');

  // State untuk interface status
  const [selectedInterface, setSelectedInterface] = useState(INTERFACE_OPTIONS[0].id);

  // State untuk tampilan preview
  const [showPreview, setShowPreview] = useState(false);

  // Update queryText berdasarkan panel type, interface, dan time range
  useEffect(() => {
    if (selectedPanel === 'interface-status') {
      const interfaceDetails = INTERFACE_OPTIONS.find(i => i.id === selectedInterface);
      const timeRangeValue = timeRange === 'last_hour' ? '-1h' : 
                            timeRange === 'last_6h' ? '-6h' : 
                            timeRange === 'last_12h' ? '-12h' : 
                            timeRange === 'last_7d' ? '-7d' : 
                            timeRange === 'last_30d' ? '-30d' : '-24h';
                            
      const newQuery = `from(bucket: "network")\n  |> range(start: ${timeRangeValue})\n  |> filter(fn: (r) => r._measurement == "interface_status")\n  |> filter(fn: (r) => r.interface == "${interfaceDetails?.name}")\n  |> filter(fn: (r) => r.device == "${interfaceDetails?.device}")\n  |> last()`;
      setQueryText(newQuery);
    }
  }, [selectedPanel, selectedInterface, timeRange]);

  const handleAddTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags([...tags, currentTag.trim()]);
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simulasi pengiriman data ke API
    console.log({
      name: dashboardName,
      description: dashboardDesc,
      tags,
      panels: [
        {
          type: selectedPanel,
          title: dashboardName,
          query: queryText,
          dataSource: selectedSource.id,
          metric: selectedPanel === 'interface-status' ? selectedInterface : metric,
          timeRange
        }
      ]
    });
    
    // Redirect ke dashboard explorer setelah berhasil membuat
    navigate('/dashboard');
  };

  // Mendapatkan detail interface yang dipilih
  const getSelectedInterfaceDetails = () => {
    return INTERFACE_OPTIONS.find(i => i.id === selectedInterface);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-800">Create New Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Configure a new dashboard with visualization panels
        </p>
      </div>
      
      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm space-y-6">
        {/* Dashboard Details */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-800 border-b pb-2">Dashboard Details</h2>
          
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Dashboard Name
            </label>
            <input
              id="name"
              type="text"
              value={dashboardName}
              onChange={(e) => setDashboardName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="My Dashboard"
            />
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={dashboardDesc}
              onChange={(e) => setDashboardDesc(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Description of the dashboard purpose..."
            />
          </div>
          
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <div className="flex">
              <input
                id="tags"
                type="text"
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add a tag"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-4 py-2 bg-gray-100 text-gray-700 border border-l-0 border-gray-300 rounded-r-md hover:bg-gray-200"
              >
                Add
              </button>
            </div>
            
            {/* Display tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag, idx) => (
                  <span 
                    key={idx}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Add Panel Configuration */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-800 border-b pb-2">Panel Configuration</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Visualization Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-1">
              {PANEL_TYPES.map((type) => (
                <div
                  key={type.id}
                  onClick={() => setSelectedPanel(type.id)}
                  className={`cursor-pointer p-3 border rounded-lg flex flex-col items-center ${
                    selectedPanel === type.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl mb-1">{type.icon}</span>
                  <span className="text-sm font-medium">{type.name}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <label htmlFor="timeRange" className="block text-sm font-medium text-gray-700 mb-1">
              Time Range
            </label>
            <select
              id="timeRange"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="last_hour">Last Hour</option>
              <option value="last_6h">Last 6 Hours</option>
              <option value="last_12h">Last 12 Hours</option>
              <option value="last_24h">Last 24 Hours</option>
              <option value="last_7d">Last 7 Days</option>
              <option value="last_30d">Last 30 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {selectedPanel !== 'interface-status' ? (
            <>
              <div>
                <label htmlFor="metric" className="block text-sm font-medium text-gray-700 mb-1">
                  Metric
                </label>
                <select
                  id="metric"
                  value={metric}
                  onChange={(e) => setMetric(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="cpu_usage">CPU Usage</option>
                  <option value="memory_usage">Memory Usage</option>
                  <option value="disk_usage">Disk Usage</option>
                  <option value="network_traffic">Network Traffic</option>
                  <option value="response_time">Response Time</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label htmlFor="interface" className="block text-sm font-medium text-gray-700 mb-1">
                  Interface
                </label>
                <select
                  id="interface"
                  value={selectedInterface}
                  onChange={(e) => setSelectedInterface(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {INTERFACE_OPTIONS.map((iface) => (
                    <option key={iface.id} value={iface.id}>
                      {iface.device} - {iface.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          
          <div>
            <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-1">
              Flux Query
            </label>
            <textarea
              id="query"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder="Enter your Flux query here..."
            />
          </div>
          
          {selectedPanel === 'interface-status' && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-700">Panel Preview</span>
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {showPreview ? 'Hide Preview' : 'Show Preview'}
                </button>
              </div>
              
              {showPreview && (
                <div className="bg-gray-100 p-4 rounded-md">
                  {getSelectedInterfaceDetails() && (
                    <InterfaceStatusPanel 
                      interface={{
                        id: 1,
                        name: getSelectedInterfaceDetails()?.name || '',
                        status: 'up',
                        location: getSelectedInterfaceDetails()?.device || '',
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          )}
          
          <div className="flex items-center">
            <input
              id="add-alert"
              type="checkbox"
              className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
            />
            <label htmlFor="add-alert" className="ml-2 block text-sm text-gray-700">
              Add alert rule for this panel
            </label>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Create Dashboard
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewDashboard; 