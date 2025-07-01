import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSource } from '../../context/SourceContext';
import axios from 'axios';
import metricService from '../../services/metricService';

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

// Interface untuk data dari API
interface ApiResponse {
  data: {
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
    network_status: {
      interface_id: string;
      status: 'up' | 'down';
      last_updated: string;
    }[];
  };
}

// Interface untuk variables
interface DashboardVariable {
  id: string;
  name: string;
  query: string;
  type: 'query' | 'custom' | 'textbox' | 'constant';
  value: string[];
  label: string;
  isValid: boolean;
}

// Interface untuk data source
interface DataSource {
  id: string;
  name: string;
  type: string;
  url: string;
}

// Interface untuk NetworkStatus
interface NetworkStatus {
  interface_id: string;
  status: 'up' | 'down';
  last_updated: string;
}

// Komponen untuk Panel Interface

interface DashboardData {
  name: string;
  description: string;
  tags: string[];
}

const DEFAULT_DASHBOARD: DashboardData = {
  name: '',
  description: '',
  tags: []
};

interface PanelData {
  title: string;
  description: string;
  type: string;
  dataSourceId: string;
  query: string;
}

const DEFAULT_PANEL: PanelData = {
  title: '',
  description: '',
  type: PANEL_TYPES[0].id,
  dataSourceId: '',
  query: ''
};

const NewDashboard: React.FC = () => {
  const { selectedSource } = useSource();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardData>(DEFAULT_DASHBOARD);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [tags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');
  const [selectedPanel, setSelectedPanel] = useState(PANEL_TYPES[0].id);
  
  // State untuk konfigurasi query
  const [metric] = useState('cpu_usage');
  const [timeRange, setTimeRange] = useState({
    from: 'now() - 1h',
    to: 'now()'
  });
  const [queryText, setQueryText] = useState('from(bucket: "metrics")\n  |> range(start: -24h)\n  |> filter(fn: (r) => r._measurement == "cpu")\n  |> mean()');

  // State untuk interface status
  const [selectedInterface] = useState(INTERFACE_OPTIONS[0].id);

  // State untuk tampilan preview
  const [showPreview, setShowPreview] = useState(false);

  // State untuk data dari API
  const [, setApiData] = useState<ApiResponse['data'] | null>(null);
  const [, setLoadingApi] = useState(false);
  const [, setErrorApi] = useState<string | null>(null);

  // State untuk tabs
  const [activeTab, setActiveTab] = useState<'panel' | 'variables'>('panel');

  // State untuk variables
  const [variables, setVariables] = useState<DashboardVariable[]>([]);
  const [newVariable, setNewVariable] = useState<DashboardVariable>({
    id: '',
    name: '',
    query: '',
    type: 'query',
    value: [],
    label: '',
    isValid: false
  });

  // State untuk data source
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [selectedDataSource, setSelectedDataSource] = useState<string>('');
  const [, setAvailableMetrics] = useState<string[]>([]);

  // State untuk preview
  const [previewData, setPreviewData] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // State untuk time range dan refresh
  const [refreshInterval, setRefreshInterval] = useState(10000); // 10 detik

  // State untuk panel details
  const [panelData, setPanelData] = useState<PanelData>(DEFAULT_PANEL);

  // Update queryText berdasarkan panel type, interface, dan time range
  useEffect(() => {
    if (selectedPanel === 'interface-status') {
      const interfaceDetails = INTERFACE_OPTIONS.find(i => i.id === selectedInterface);
      const newQuery = `timeStart = uint(v: ${timeRange.from})
timeStop = uint(v: ${timeRange.to})
from(bucket: "${selectedDataSource}")
  |> range(start: timeStart, stop: timeStop)
  |> filter(fn: (r) => r["_measurement"] == "${interfaceDetails?.name}")
  |> filter(fn: (r) => r.device == "${interfaceDetails?.device}")
  |> last()`;
      setQueryText(newQuery);
    }
  // Penambahan sementara untuk panel timeseries
    else if (selectedPanel === 'timeseries') {
      const newQuery = `from(bucket: "${selectedDataSource}")
  |> range(start: ${timeRange.from}, stop: ${timeRange.to})
  |> filter(fn: (r) => r["_measurement"] == "${metric}")
  |> aggregateWindow(every: 10s, fn: mean)
  |> yield(name: "mean")`;
      setQueryText(newQuery);
    }
  }, [selectedPanel, selectedInterface, timeRange]);

  // Fungsi untuk mengambil data dari API
  const fetchData = async () => {
    try {
      setLoadingApi(true);
      setErrorApi(null);
      
      const response = await metricService.getMetrics();
      setApiData(response.data);
      
      // Update query text berdasarkan data yang diterima
      if (selectedPanel === 'interface-status' && response.data.network_status) {
        const interfaceData = response.data.network_status.find(
          (item: NetworkStatus) => item.interface_id === selectedInterface
        );
        
        if (interfaceData) {
          const newQuery = `timeStart = uint(v: ${timeRange.from})
timeStop = uint(v: ${timeRange.to})
from(bucket: "${selectedDataSource}")
  |> range(start: timeStart, stop: timeStop)
  |> filter(fn: (r) => r["_measurement"] == "${interfaceData.interface_id}")
  |> last()`;
          
          setQueryText(newQuery);
        }
      }
    } catch (err) {
      setErrorApi(err instanceof Error ? err.message : 'Terjadi kesalahan saat mengambil data');
    } finally {
      setLoadingApi(false);
    }
  };

  // Panggil API saat komponen dimount dan saat panel/interface berubah
  useEffect(() => {
    fetchData();
  }, [selectedPanel, selectedInterface]);

  // Fetch data sources saat komponen dimount
  useEffect(() => {
    const fetchDataSources = async () => {
      try {
        const response = await metricService.getSources();
        setDataSources(response);
      } catch (err) {
        console.error('Error fetching data sources:', err);
        setErrorApi(err instanceof Error ? err.message : 'Gagal mengambil data sources');
      }
    };

    fetchDataSources();
  }, []);

  // Fetch available metrics ketika data source dipilih
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        if (!selectedDataSource) {
          setAvailableMetrics([]);
          return;
        }

        setLoadingApi(true);
        setErrorApi(null);
        
        const response = await metricService.getDataSourceMetrics(selectedDataSource);
        
        if (Array.isArray(response)) {
          setAvailableMetrics(response);
        } else {
          console.error('Unexpected metrics response format:', response);
          setErrorApi('Invalid metrics data format received');
        }
      } catch (err) {
        console.error('Error fetching metrics:', err);
        setErrorApi(err instanceof Error ? err.message : 'Failed to fetch metrics');
      } finally {
        setLoadingApi(false);
      }
    };

    fetchMetrics();
  }, [selectedDataSource]);

  // Update generateQuery function
  const generateQuery = (panelType: string, metricName: string) => {
    if (!metricName || !selectedDataSource) return '';

    // Hapus prefix namespace jika ada
    const cleanMetricName = metricName.split(':').pop() || metricName;
    
    switch (panelType) {
      case 'interface-status':
        return `from(bucket: "${selectedDataSource}")
  |> range(start: duration(v: -1h))
  |> filter(fn: (r) => r["_measurement"] == "sys/intf")
  |> filter(fn: (r) => r["dn"] == "sys/intf/phys-[eth1/7]/phys")
  |> filter(fn: (r) => r["_field"] == "operSt")
  |> filter(fn: (r) => r["source"] == "LEAF-1")
  |> aggregateWindow(every: 10s, fn: last, createEmpty: false)
  |> yield(name: "last")`;

      case 'timeseries':
        return `from(bucket: "${selectedDataSource}")
  |> range(start: duration(v: -1h))
  |> filter(fn: (r) => r["_measurement"] == "${cleanMetricName}")
  |> aggregateWindow(every: 10s, fn: mean)
  |> yield(name: "mean")`;

      case 'gauge':
      case 'stat':
        return `from(bucket: "${selectedDataSource}")
|> range(start: ${timeRange.from}, stop: ${timeRange.to})
|> filter(fn: (r) => r["_measurement"] == "${cleanMetricName}")
|> last()
|> yield(name: "last")`;

      case 'table':
        return `from(bucket: "${selectedDataSource}")
|> range(start: ${timeRange.from}, stop: ${timeRange.to})
|> filter(fn: (r) => r["_measurement"] == "${cleanMetricName}")
|> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
|> yield(name: "table")`;

      default:
        return '';
    }
  };

  // Update query ketika panel type atau metric berubah
  useEffect(() => {
    if (selectedDataSource && metric) {
      const newQuery = generateQuery(selectedPanel, metric);
      setQueryText(newQuery);
      setPanelData(prev => ({
        ...prev,
        query: newQuery
      }));
    }
  }, [selectedPanel, metric, selectedDataSource, timeRange, selectedInterface]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setDashboardData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePanelInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPanelData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!panelData.title || !selectedDataSource || !queryText) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    try {
      // Buat dashboard dengan panel pertama
      const dashboardPayload = {
        name: dashboardData.name || 'New Dashboard',
        type: 'dashboard',
        config: {
          description: dashboardData.description || '',
          tags: tags || []
        },
        panels: [{
          title: panelData.title,
          type: panelData.type || 'interface-status',
          description: panelData.description || '',
          width: 12,
          height: 8,
          options: {},
          position: { x: 0, y: 0 },
          dataSourceId: selectedDataSource,
          queries: [{
            name: `${panelData.title} Query`,
            refId: 'A',
            query: queryText,
            dataSourceId: selectedDataSource
          }]
        }]
      };

      console.log('Creating dashboard with payload:', dashboardPayload);
      const response = await metricService.createDashboard(dashboardPayload);
      navigate(`/dashboard/${response.id}`);
    } catch (err: any) {
      console.error('Error creating dashboard:', err);
      setError(err.response?.data?.error || 'Failed to create dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Fungsi untuk memvalidasi dan mengambil nilai variable
  const validateVariable = async (variable: DashboardVariable) => {
    try {
      setLoadingApi(true);
      
      const response = await axios.post('/api/variables/validate', {
        query: variable.query,
        type: variable.type,
        dataSourceId: selectedSource.id
      });
      
      return {
        ...variable,
        value: response.data.values,
        isValid: true
      };
    } catch (err) {
      setErrorApi(err instanceof Error ? err.message : 'Gagal memvalidasi variable');
      return {
        ...variable,
        value: [],
        isValid: false
      };
    } finally {
      setLoadingApi(false);
    }
  };

  // Handler untuk menambah variable
  const handleAddVariable = async () => {
    if (!newVariable.name || !newVariable.query) return;
    
    const validatedVariable = await validateVariable(newVariable);
    setVariables([...variables, validatedVariable]);
    setNewVariable({
      id: '',
      name: '',
      query: '',
      type: 'query',
      value: [],
      label: '',
      isValid: false
    });
  };

  // Handler untuk menghapus variable
  const handleRemoveVariable = (id: string) => {
    setVariables(variables.filter(v => v.id !== id));
  };

  // Render tabs
  const renderTabs = () => (
    <div className="border-b border-gray-200 ml-6">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        <button
          onClick={() => setActiveTab('panel')}
          className={`${
            activeTab === 'panel'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
        >
          Create Panel
        </button>
        <button
          onClick={() => setActiveTab('variables')}
          className={`${
            activeTab === 'variables'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
        >
          Set Variables
        </button>
      </nav>
    </div>
  );

  // Render variables form
  const renderVariablesForm = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm space-y-4">
        <h2 className="text-lg font-medium text-gray-800 border-b pb-2">Add Dashboard Variables</h2>
        
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Variable Name
            </label>
            <input
              type="text"
              value={newVariable.name}
              onChange={(e) => setNewVariable({...newVariable, name: e.target.value, id: e.target.value.toLowerCase()})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="source"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Label
            </label>
            <input
              type="text"
              value={newVariable.label}
              onChange={(e) => setNewVariable({...newVariable, label: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Data Source"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={newVariable.type}
              onChange={(e) => setNewVariable({...newVariable, type: e.target.value as DashboardVariable['type']})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="query">Query</option>
              <option value="custom">Custom</option>
              <option value="textbox">Text Box</option>
              <option value="constant">Constant</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Query
            </label>
            <textarea
              value={newVariable.query}
              onChange={(e) => setNewVariable({...newVariable, query: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
              placeholder="SELECT DISTINCT source FROM metrics"
            />
          </div>
          
          <div>
            <button
              type="button"
              onClick={handleAddVariable}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Variable
            </button>
          </div>
        </div>
      </div>

      {/* Daftar Variables */}
      {variables.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Dashboard Variables</h3>
          <div className="space-y-4">
            {variables.map((variable) => (
              <div key={variable.id} className="flex items-start justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">{variable.label || variable.name}</h4>
                  <p className="text-sm text-gray-500">Type: {variable.type}</p>
                  <p className="text-sm text-gray-500 font-mono mt-1">{variable.query}</p>
                  {variable.isValid && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-700">Values:</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {variable.value.map((val, idx) => (
                          <span key={idx} className="px-2 py-1 bg-gray-100 rounded text-sm">
                            {val}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveVariable(variable.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Update validateQuery function
  const validateQuery = async (query: string) => {
    setIsValidating(true);
    setPreviewError(null);

    try {
      if (!selectedDataSource) {
        throw new Error('Silakan pilih data source terlebih dahulu');
      }

      // Validasi dan dapatkan data interface status
      const result = await metricService.validateFluxQuery(selectedDataSource, query);
      
      if (!result.isValid) {
        throw new Error(result.error);
      }

      if (result.data) {
        setPreviewData(result.data);
        setShowPreview(true);
      } else {
        throw new Error('Tidak ada data yang diterima dari server');
      }

      setIsValidating(false);
    } catch (error: any) {
      console.error('Error validating query:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Gagal memvalidasi query';
      setPreviewError(errorMessage);
      setIsValidating(false);
      setPreviewData(null);
      setShowPreview(false);
    }
  };

  // Update time range handler
  const handleTimeRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [from, to] = e.target.value.split('|');
    setTimeRange({ from, to });
    
    // Update query text with new time range
    if (selectedDataSource && metric) {
      const newQuery = generateQuery(selectedPanel, metric);
      setQueryText(newQuery);
      setPanelData(prev => ({
        ...prev,
        query: newQuery
      }));
    }
  };

  // Tambahkan time range control di bawah query input
  const renderTimeRangeControls = () => (
    <div className="flex items-center space-x-4 mt-2">
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Time Range
        </label>
        <select
          value={`${timeRange.from}|${timeRange.to}`}
          onChange={handleTimeRangeChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="-5m|now()">Last 5 minutes</option>
          <option value="-15m|now()">Last 15 minutes</option>
          <option value="-30m|now()">Last 30 minutes</option>
          <option value="-1h|now()">Last 1 hour</option>
          <option value="-3h|now()">Last 3 hours</option>
          <option value="-6h|now()">Last 6 hours</option>
          <option value="-12h|now()">Last 12 hours</option>
          <option value="-24h|now()">Last 24 hours</option>
        </select>
      </div>
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Refresh Interval
        </label>
        <select
          value={refreshInterval}
          onChange={(e) => setRefreshInterval(Number(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="5000">5s</option>
          <option value="10000">10s</option>
          <option value="30000">30s</option>
          <option value="60000">1m</option>
          <option value="300000">5m</option>
        </select>
      </div>
    </div>
  );

  // Render preview panel berdasarkan tipe panel
  const renderPreviewPanel = () => {
    if (!previewData) {
      return (
        <div className="text-center text-gray-500">
          No preview data available
        </div>
      );
    }

    const { status, time, metadata } = previewData;
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <div className={`text-8xl font-bold text-center ${
            status === 'UP' ? 'text-green-600' : 
            status === 'DOWN' ? 'text-red-600' : 
            'text-gray-400'
          }`}>
            {status}
          </div>
          <button
            onClick={() => validateQuery(queryText)}
            disabled={isValidating}
            className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center gap-1"
          >
            <svg className={`w-4 h-4 ${isValidating ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isValidating ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        {time && (
          <div className="text-sm text-gray-500">
            Last updated: {new Date(time).toLocaleString()}
          </div>
        )}
        {metadata && (
          <div className="mt-4 space-y-2">
            <div className="text-sm">
              <span className="font-medium">Interface:</span> {metadata.interface}
            </div>
            <div className="text-sm">
              <span className="font-medium">Source:</span> {metadata.source}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  const handleAddTag = () => {
    if (currentTag.trim() && !dashboardData.tags.includes(currentTag.trim())) {
      setDashboardData(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()]
      }));
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setDashboardData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // Mendapatkan detail interface yang dipilih

  // Handler untuk perubahan data source
  const handleDataSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDataSourceId = e.target.value;
    console.log('Selected data source:', newDataSourceId);
    setSelectedDataSource(newDataSourceId);
    setPanelData(prev => ({ ...prev, dataSourceId: newDataSourceId }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-800">Create New Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Configure a new dashboard with visualization panels and variables
        </p>
      </div>
      
      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm">
        {/* Dashboard Details */}
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-medium text-gray-800 border-b pb-2">Dashboard Details</h2>
          
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Dashboard Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={dashboardData.name}
              onChange={handleInputChange}
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
              name="description"
              value={dashboardData.description}
              onChange={handleInputChange}
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
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
            {dashboardData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {dashboardData.tags.map((tag, idx) => (
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
        
        {/* Tabs */}
        {renderTabs()}
        
        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'panel' ? (
            <div className="space-y-4">
              {/* Panel Details */}
              <div className="bg-white shadow-sm rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Panel Details</h2>
                
        <div className="space-y-4">
                  <div>
                    <label htmlFor="panel-title" className="block text-sm font-medium text-gray-700">
                      Panel Title
                    </label>
                    <input
                      type="text"
                      id="panel-title"
                      name="title"
                      value={panelData.title}
                      onChange={handlePanelInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      required
                      placeholder="Enter panel title"
                    />
                  </div>
          
          <div>
                    <label htmlFor="panel-description" className="block text-sm font-medium text-gray-700">
                      Panel Description
                    </label>
                    <textarea
                      id="panel-description"
                      name="description"
                      value={panelData.description}
                      onChange={handlePanelInputChange}
                      rows={3}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      placeholder="Enter panel description (optional)"
                    />
                  </div>
                </div>
              </div>

              {/* Data Source Selection */}
              <div className="bg-white shadow-sm rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Data Configuration</h2>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="dataSource" className="block text-sm font-medium text-gray-700">
                      Data Source
                    </label>
                    <select
                      id="dataSource"
                      name="dataSourceId"
                      value={selectedDataSource}
                      onChange={handleDataSourceChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      required
                    >
                      <option value="">Select Data Source</option>
                      {dataSources.map((ds) => (
                        <option key={ds.id} value={ds.id}>
                          {ds.name} ({ds.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Visualization Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
              Visualization Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-1">
              {PANEL_TYPES.map((type) => (
                <div
                  key={type.id}
                          onClick={() => {
                            setSelectedPanel(type.id);
                            setPanelData(prev => ({ ...prev, type: type.id }));
                          }}
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
          
                  {/* Query Section */}
          <div>
                    <label htmlFor="query" className="block text-sm font-medium text-gray-700">
              Flux Query
            </label>
            <textarea
              id="query"
                      name="query"
              value={queryText}
                      onChange={(e) => {
                        setQueryText(e.target.value);
                        handlePanelInputChange(e);
                      }}
                      rows={8}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 font-mono text-sm"
              placeholder="Enter your Flux query here..."
            />
                    {renderTimeRangeControls()}

                    {/* Validate Button */}
                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => validateQuery(queryText)}
                        disabled={isValidating}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        {isValidating ? 'Memvalidasi...' : 'Validasi Query'}
                      </button>
                    </div>
          </div>
          
                  {/* Preview Error */}
                  {previewError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                      {previewError}
                    </div>
                  )}

                  {/* Preview Panel */}
                  {showPreview && (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-800">Preview Panel</h3>
                <button
                  type="button"
                          onClick={() => setShowPreview(false)}
                          className="text-gray-400 hover:text-gray-600"
                >
                          <span className="sr-only">Close</span>
                          ×
                </button>
              </div>
                      {renderPreviewPanel()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            renderVariablesForm()
          )}
        </div>
        
        {/* Actions */}
        <div className="flex justify-end space-x-3 p-6 border-t">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
          >
            Create Dashboard
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewDashboard; 