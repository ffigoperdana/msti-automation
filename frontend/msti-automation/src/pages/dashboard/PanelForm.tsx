import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

// Data dummy untuk interface
const INTERFACE_TYPES = [
  { id: 'gi0/1', name: 'GigabitEthernet0/1', device: 'Router-1' },
  { id: 'gi0/2', name: 'GigabitEthernet0/2', device: 'Router-1' },
  { id: 'gi0/3', name: 'GigabitEthernet0/3', device: 'Router-1' },
  { id: 'gi0/1-sw', name: 'GigabitEthernet0/1', device: 'Switch-1' },
  { id: 'gi0/2-sw', name: 'GigabitEthernet0/2', device: 'Switch-1' },
];

// Data dummy untuk panel yang sudah ada (untuk mode edit)
const MOCK_PANELS: Record<string, any> = {
  '1': {
    title: 'CPU Usage',
    description: 'Shows CPU usage over time',
    type: 'time-series',
    metric: 'cpu_usage',
    timeRange: 'last_24h',
    query: 'from(bucket: "metrics")\n  |> range(start: -24h)\n  |> filter(fn: (r) => r._measurement == "cpu")\n  |> mean()',
    hasAlert: true
  },
  '2': {
    title: 'Memory Usage',
    description: 'Shows memory consumption',
    type: 'gauge',
    metric: 'memory_usage',
    timeRange: 'last_6h',
    query: 'from(bucket: "metrics")\n  |> range(start: -6h)\n  |> filter(fn: (r) => r._measurement == "memory")\n  |> last()',
    hasAlert: false
  }
};

// Komponen Panel Status Interface Preview
const InterfaceStatusPreview: React.FC<{ deviceName: string; interfaceName: string }> = ({ deviceName, interfaceName }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border-t-4 border-gray-200">
      <div className="font-semibold text-gray-700 mb-1">{deviceName}</div>
      <div className="text-sm text-gray-500 mb-3">{interfaceName}</div>
      <div className="text-6xl font-bold text-green-600">Up</div>
      <div className="mt-3 text-xs text-gray-500">Preview Mode</div>
    </div>
  );
};

const PanelForm: React.FC = () => {
  const { selectedSource } = useSource();
  const navigate = useNavigate();
  const { dashboardId, panelId } = useParams<{ dashboardId: string; panelId: string }>();
  const isEditMode = Boolean(panelId);
  
  // State untuk data panel
  const [panelTitle, setPanelTitle] = useState('');
  const [panelDesc, setPanelDesc] = useState('');
  const [selectedPanel, setSelectedPanel] = useState(PANEL_TYPES[0].id);
  const [metric, setMetric] = useState('cpu_usage');
  const [timeRange, setTimeRange] = useState('last_24h');
  const [queryText, setQueryText] = useState('from(bucket: "metrics")\n  |> range(start: -24h)\n  |> filter(fn: (r) => r._measurement == "cpu")\n  |> mean()');
  const [hasAlert, setHasAlert] = useState(false);
  
  // State untuk interface status
  const [selectedInterface, setSelectedInterface] = useState(INTERFACE_TYPES[0].id);
  const [showInterfacePreview, setShowInterfacePreview] = useState(false);
  
  // Load data untuk edit mode
  useEffect(() => {
    if (isEditMode && panelId && MOCK_PANELS[panelId]) {
      const panel = MOCK_PANELS[panelId];
      setPanelTitle(panel.title);
      setPanelDesc(panel.description);
      setSelectedPanel(panel.type);
      setMetric(panel.metric);
      setTimeRange(panel.timeRange);
      setQueryText(panel.query);
      setHasAlert(panel.hasAlert);
    }
  }, [isEditMode, panelId]);

  // Update queryText berdasarkan jenis panel dan timeRange
  useEffect(() => {
    if (selectedPanel === 'interface-status') {
      const interfaceDetails = INTERFACE_TYPES.find(i => i.id === selectedInterface);
      const timeRangeValue = timeRange === 'last_hour' ? '-1h' : 
                             timeRange === 'last_6h' ? '-6h' : 
                             timeRange === 'last_12h' ? '-12h' : 
                             timeRange === 'last_7d' ? '-7d' : 
                             timeRange === 'last_30d' ? '-30d' : '-24h';
                             
      const newQuery = `from(bucket: "network")\n  |> range(start: ${timeRangeValue})\n  |> filter(fn: (r) => r._measurement == "interface_status")\n  |> filter(fn: (r) => r.interface == "${interfaceDetails?.name}")\n  |> filter(fn: (r) => r.device == "${interfaceDetails?.device}")\n  |> last()`;
      setQueryText(newQuery);
    }
  }, [selectedPanel, selectedInterface, timeRange]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simulasi pengiriman data ke API
    const panelData = {
      id: panelId || Date.now().toString(),
      title: panelTitle,
      description: panelDesc,
      type: selectedPanel,
      metric: selectedPanel === 'interface-status' ? selectedInterface : metric,
      timeRange,
      query: queryText,
      dataSource: selectedSource.id,
      hasAlert
    };
    
    console.log('Saving panel:', panelData);
    
    // Redirect ke halaman dashboard setelah berhasil
    navigate(`/dashboard/view/${dashboardId}`);
  };

  // Mendapatkan detail interface yang dipilih
  const getSelectedInterfaceDetails = () => {
    return INTERFACE_TYPES.find(i => i.id === selectedInterface);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-800">
          {isEditMode ? 'Edit Panel' : 'Add New Panel'}
        </h1>
        <p className="text-gray-600 mt-1">
          {isEditMode 
            ? 'Modify this panels configuration and visualization settings' 
            : 'Configure a new visualization panel for your dashboard'}
        </p>
      </div>
      
      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm space-y-6">
        {/* Panel Details */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-800 border-b pb-2">Panel Details</h2>
          
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Panel Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={panelTitle}
              onChange={(e) => setPanelTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="CPU Usage"
            />
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={panelDesc}
              onChange={(e) => setPanelDesc(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Description of what this panel shows..."
            />
          </div>
        </div>
        
        {/* Visualization Configuration */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-800 border-b pb-2">Visualization Configuration</h2>
          
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
          
          {selectedPanel === 'interface-status' ? (
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
                  {INTERFACE_TYPES.map((iface) => (
                    <option key={iface.id} value={iface.id}>
                      {iface.device} - {iface.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Preview
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowInterfacePreview(!showInterfacePreview)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {showInterfacePreview ? 'Hide Preview' : 'Show Preview'}
                  </button>
                </div>
                
                {showInterfacePreview && (
                  <div className="p-4 bg-gray-50 rounded-md">
                    {getSelectedInterfaceDetails() && (
                      <InterfaceStatusPreview 
                        deviceName={getSelectedInterfaceDetails()?.device || ''}
                        interfaceName={getSelectedInterfaceDetails()?.name || ''}
                      />
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
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
          )}
          
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
        </div>
        
        {/* Query Configuration */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-800 border-b pb-2">Query Configuration</h2>
          
          <div>
            <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-1">
              Flux Query <span className="text-red-500">*</span>
            </label>
            <textarea
              id="query"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              required
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder="from(bucket: &quot;metrics&quot;)
  |> range(start: -24h)
  |> filter(fn: (r) => r._measurement == &quot;cpu&quot;)
  |> mean()"
            />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                Validate Query
              </button>
            </div>
          </div>
          
          <div className="flex items-center">
            <input
              id="add-alert"
              type="checkbox"
              checked={hasAlert}
              onChange={(e) => setHasAlert(e.target.checked)}
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
            onClick={() => navigate(`/dashboard/view/${dashboardId}`)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {isEditMode ? 'Save Changes' : 'Add Panel'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PanelForm; 