import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDashboardStore, Panel, PanelQuery, DASHBOARD_API_KEYS, QueryResult } from '../../store/dashboardStore';
import { useDataSourceStore } from '../../store/dataSourceStore';
import TimeSeries from '../../components/visualizations/TimeSeries';
import Gauge from '../../components/visualizations/Gauge';
import TableVisualization from '../../components/visualizations/Table';
import Interface from '../../components/visualizations/Interface';

// Tipe panel yang didukung
const PANEL_TYPES = [
  { id: 'timeseries', name: 'Time Series', icon: '📈', description: 'Menampilkan data metrik dari waktu ke waktu' },
  { id: 'gauge', name: 'Gauge', icon: '⏲️', description: 'Menampilkan nilai tunggal dalam bentuk gauge' },
  { id: 'stat', name: 'Stat', icon: '📌', description: 'Menampilkan nilai tunggal dengan indikator trend' },
  { id: 'table', name: 'Table', icon: '🔢', description: 'Menampilkan data dalam bentuk tabel' },
  { id: 'interface', name: 'Interface Status', icon: '🔌', description: 'Menampilkan status antarmuka jaringan' },
];

// Data dummy untuk interface
const INTERFACE_TYPES = [
  { id: 'gi0/1', name: 'GigabitEthernet0/1', device: 'Router-1' },
  { id: 'gi0/2', name: 'GigabitEthernet0/2', device: 'Router-1' },
  { id: 'gi0/3', name: 'GigabitEthernet0/3', device: 'Router-1' },
  { id: 'gi0/1-sw', name: 'GigabitEthernet0/1', device: 'Switch-1' },
  { id: 'gi0/2-sw', name: 'GigabitEthernet0/2', device: 'Switch-1' },
];

// Template query berdasarkan tipe panel
const QUERY_TEMPLATES: Record<string, string> = {
  timeseries: 'from(bucket: "telegraf")\n  |> range(start: -1h)\n  |> filter(fn: (r) => r._measurement == "cpu")\n  |> filter(fn: (r) => r._field == "usage_system")\n  |> aggregateWindow(every: 1m, fn: mean, createEmpty: false)',
  gauge: 'from(bucket: "telegraf")\n  |> range(start: -5m)\n  |> filter(fn: (r) => r._measurement == "cpu")\n  |> filter(fn: (r) => r._field == "usage_system")\n  |> last()',
  stat: 'from(bucket: "telegraf")\n  |> range(start: -5m)\n  |> filter(fn: (r) => r._measurement == "cpu")\n  |> filter(fn: (r) => r._field == "usage_system")\n  |> last()',
  table: 'from(bucket: "telegraf")\n  |> range(start: -5m)\n  |> filter(fn: (r) => r._measurement == "disk")\n  |> filter(fn: (r) => r._field == "used_percent")\n  |> last()',
  interface: 'from(bucket: "telegraf")\n  |> range(start: -5m)\n  |> filter(fn: (r) => r._measurement == "snmp")\n  |> filter(fn: (r) => r._field == "ifOperStatus" or r._field == "ifSpeed" or r._field == "ifName")\n  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")'
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

const DEFAULT_PANEL: Omit<Panel, 'id' | 'dashboardId' | 'createdAt' | 'updatedAt'> = {
  title: 'New Panel',
  description: '',
  type: 'timeseries',
  width: 12,
  height: 8,
  position: { x: 0, y: 0 },
  options: {
    unit: '',
    decimals: 2,
  },
  queries: []
};

const PanelForm = () => {
  const { dashboardId, panelId } = useParams<{ dashboardId: string; panelId: string }>();
  const navigate = useNavigate();
  const isEditMode = Boolean(panelId);
  
  // Stores
  const { 
    fetchDashboard, 
    fetchPanel, 
    createPanel, 
    updatePanel,
    runQueries,
    currentPanel,
    setCurrentPanel,
    updateCurrentPanelQuery,
    addQueryToCurrentPanel,
    removeQueryFromCurrentPanel,
    isLoading,
    getError,
    queryResults
  } = useDashboardStore();
  
  const { dataSources, fetchDataSources } = useDataSourceStore();
  
  // Local state
  const [panelData, setPanelData] = useState<Omit<Panel, 'id' | 'dashboardId' | 'createdAt' | 'updatedAt'>>({ ...DEFAULT_PANEL });
  const [selectedDataSource, setSelectedDataSource] = useState<string>('');
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  
  // Load data sources on mount
  useEffect(() => {
    fetchDataSources();
  }, [fetchDataSources]);
  
  // Load dashboard and panel data if in edit mode
  useEffect(() => {
    if (dashboardId) {
      fetchDashboard(dashboardId);
    }
    
    if (isEditMode && panelId) {
      fetchPanel(panelId);
    } else {
      // Reset current panel in create mode
      setCurrentPanel(null);
    }
  }, [dashboardId, panelId, isEditMode, fetchDashboard, fetchPanel, setCurrentPanel]);
  
  // Sync current panel to local state
  useEffect(() => {
    if (currentPanel) {
      setPanelData({
        title: currentPanel.title,
        description: currentPanel.description || '',
        type: currentPanel.type,
        width: currentPanel.width,
        height: currentPanel.height,
        position: currentPanel.position,
        options: currentPanel.options,
        queries: currentPanel.queries
      });
      
      // Set selected data source if there's a query
      if (currentPanel.queries.length > 0) {
        setSelectedDataSource(currentPanel.queries[0].dataSourceId);
      }
    }
  }, [currentPanel]);
  
  // Handler untuk perubahan input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('options.')) {
      const optionName = name.replace('options.', '');
      setPanelData(prev => ({
        ...prev,
        options: {
          ...prev.options,
          [optionName]: value
        }
      }));
    } else if (name === "type") {
      // Ketika tipe panel berubah, update juga opsi sesuai tipe
      let newOptions = { ...panelData.options };
      
      if (value === 'gauge') {
        newOptions = {
          ...newOptions,
          min: 0,
          max: 100,
          thresholds: [
            { value: 0, color: '#5470c6' },
            { value: 70, color: '#fac858' },
            { value: 90, color: '#ee6666' }
          ]
        };
      } else if (value === 'interface') {
        newOptions = {
          ...newOptions,
          deviceField: 'device',
          nameField: 'ifName',
          statusField: 'ifOperStatus',
          speedField: 'ifSpeed',
          bytesInField: 'ifInOctets',
          bytesOutField: 'ifOutOctets'
        };
      }
      
      setPanelData(prev => ({ 
        ...prev, 
        [name]: value,
        options: newOptions
      }));
      
      // Jika ada query yang aktif, update dengan template yang sesuai
      if (currentPanel?.queries && currentPanel.queries.length > 0) {
        const template = QUERY_TEMPLATES[value] || '';
        
        if (template) {
          // Hanya update query jika pengguna belum menulis query mereka sendiri
          const currentQuery = currentPanel.queries[0];
          if (!currentQuery.query || currentQuery.query.trim() === '') {
            updateCurrentPanelQuery(currentQuery.id, { query: template });
          }
        }
      }
    } else {
      setPanelData(prev => ({ ...prev, [name]: value }));
    }
  };
  
  // Handler untuk perubahan query
  const handleQueryChange = (queryId: string, field: string, value: string) => {
    updateCurrentPanelQuery(queryId, { [field]: value });
  };
  
  // Handler untuk menambah query
  const handleAddQuery = () => {
    if (selectedDataSource) {
      addQueryToCurrentPanel(selectedDataSource);
      
      // Menambahkan template query berdasarkan tipe panel
      setTimeout(() => {
        if (currentPanel?.queries) {
          const newQuery = currentPanel.queries[currentPanel.queries.length - 1];
          const template = QUERY_TEMPLATES[panelData.type] || '';
          
          if (newQuery && template) {
            updateCurrentPanelQuery(newQuery.id, { query: template });
          }
        }
      }, 100);
    }
  };
  
  // Handler untuk menghapus query
  const handleRemoveQuery = (queryId: string) => {
    removeQueryFromCurrentPanel(queryId);
  };
  
  // Handler untuk menjalankan query dan menampilkan pratinjau
  const handleRunQuery = async () => {
    if (currentPanel?.queries && currentPanel.queries.length > 0) {
      try {
        await runQueries(currentPanel.queries);
        setIsPreviewVisible(true);
      } catch (error) {
        console.error('Error running queries:', error);
      }
    }
  };
  
  // Handler untuk submit form
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!dashboardId) {
      console.error('Dashboard ID is required');
      return;
    }
    
    try {
      // Create or update panel
      if (isEditMode && panelId) {
        await updatePanel(panelId, panelData);
      } else {
        await createPanel(dashboardId, panelData);
      }
      
      // Navigate back to dashboard
      navigate(`/dashboard/view/${dashboardId}`);
    } catch (error) {
      console.error('Failed to save panel:', error);
    }
  };
  
  // Cancel button handler
  const handleCancel = () => {
    navigate(`/dashboard/view/${dashboardId}`);
  };
  
  // Render visualization preview based on panel type
  const renderVisualizationPreview = () => {
    if (!currentPanel || !currentPanel.queries.length) return null;
    
    // Get results for the current panel's queries
    const relevantResults: Record<string, QueryResult> = {};
    currentPanel.queries.forEach(query => {
      const result = queryResults[query.refId];
      if (result) {
        relevantResults[query.refId] = result;
      }
    });
    
    // If no results yet, show empty message
    if (Object.keys(relevantResults).length === 0) {
      return (
        <div className="bg-gray-100 rounded p-8 text-center text-gray-500">
          <p>Tidak ada data untuk ditampilkan. Jalankan query terlebih dahulu.</p>
        </div>
      );
    }
    
    // Render appropriate visualization based on panel type
    switch (currentPanel.type) {
      case 'timeseries':
        return <TimeSeries data={relevantResults} options={currentPanel.options} />;
      case 'gauge':
        return <Gauge data={relevantResults} options={currentPanel.options} />;
      case 'table':
        return <TableVisualization data={relevantResults} options={currentPanel.options} />;
      case 'interface':
        return <Interface data={relevantResults} options={currentPanel.options} />;
      default:
        return (
          <div className="bg-gray-100 rounded p-8 text-center text-gray-500">
            <p>Tipe visualisasi {currentPanel.type} belum diimplementasikan.</p>
          </div>
        );
    }
  };
  
  // Menampilkan opsi konfigurasi berdasarkan tipe panel yang dipilih
  const renderTypeSpecificOptions = () => {
    if (panelData.type === 'gauge') {
      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="options.min" className="block text-sm font-medium text-gray-700 mb-1">
                Nilai Minimum
              </label>
              <input
                type="number"
                id="options.min"
                name="options.min"
                value={panelData.options.min || 0}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label htmlFor="options.max" className="block text-sm font-medium text-gray-700 mb-1">
                Nilai Maksimum
              </label>
              <input
                type="number"
                id="options.max"
                name="options.max"
                value={panelData.options.max || 100}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Threshold (Warna berubah berdasarkan nilai)
            </label>
            <div className="p-3 border border-gray-200 rounded bg-gray-50">
              <div className="text-xs text-gray-500 mb-2">
                Nilai threshold dan warna diatur otomatis: 0-70 (biru), 70-90 (kuning), 90-100 (merah)
              </div>
            </div>
          </div>
        </>
      );
    } else if (panelData.type === 'interface') {
      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="options.deviceField" className="block text-sm font-medium text-gray-700 mb-1">
                Field Nama Device
              </label>
              <input
                type="text"
                id="options.deviceField"
                name="options.deviceField"
                value={panelData.options.deviceField || 'device'}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="device"
              />
            </div>
            <div>
              <label htmlFor="options.nameField" className="block text-sm font-medium text-gray-700 mb-1">
                Field Nama Interface
              </label>
              <input
                type="text"
                id="options.nameField"
                name="options.nameField"
                value={panelData.options.nameField || 'ifName'}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="ifName"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="options.statusField" className="block text-sm font-medium text-gray-700 mb-1">
                Field Status
              </label>
              <input
                type="text"
                id="options.statusField"
                name="options.statusField"
                value={panelData.options.statusField || 'ifOperStatus'}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="ifOperStatus"
              />
            </div>
            <div>
              <label htmlFor="options.speedField" className="block text-sm font-medium text-gray-700 mb-1">
                Field Kecepatan
              </label>
              <input
                type="text"
                id="options.speedField"
                name="options.speedField"
                value={panelData.options.speedField || 'ifSpeed'}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="ifSpeed"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="options.bytesInField" className="block text-sm font-medium text-gray-700 mb-1">
                Field Bytes In
              </label>
              <input
                type="text"
                id="options.bytesInField"
                name="options.bytesInField"
                value={panelData.options.bytesInField || 'ifInOctets'}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="ifInOctets"
              />
            </div>
            <div>
              <label htmlFor="options.bytesOutField" className="block text-sm font-medium text-gray-700 mb-1">
                Field Bytes Out
              </label>
              <input
                type="text"
                id="options.bytesOutField"
                name="options.bytesOutField"
                value={panelData.options.bytesOutField || 'ifOutOctets'}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="ifOutOctets"
              />
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-2 mt-2">
              <p>Catatan: Visualisasi interface memerlukan data dalam format pivot. Contoh query InfluxDB:</p>
              <pre className="bg-gray-100 p-2 rounded text-xs mt-1 overflow-auto">
                {QUERY_TEMPLATES.interface}
              </pre>
            </div>
          </div>
        </>
      );
    } else {
      return (
        <div>
          <div className="text-xs text-gray-500 mb-2">
            Opsi tambahan akan muncul berdasarkan tipe visualisasi yang dipilih.
          </div>
        </div>
      );
    }
  };
  
  // Loading states
  const isLoadingPanel = isEditMode ? isLoading(`${DASHBOARD_API_KEYS.GET_PANEL}_${panelId}`) : false;
  const isSubmitting = isEditMode 
    ? isLoading(`${DASHBOARD_API_KEYS.UPDATE_PANEL}_${panelId}`)
    : isLoading(DASHBOARD_API_KEYS.CREATE_PANEL);
  
  // Error handling
  const error = isEditMode 
    ? getError(`${DASHBOARD_API_KEYS.GET_PANEL}_${panelId}`) || getError(`${DASHBOARD_API_KEYS.UPDATE_PANEL}_${panelId}`)
    : getError(DASHBOARD_API_KEYS.CREATE_PANEL);
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="bg-white shadow-md rounded-lg">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold">
            {isEditMode ? 'Edit Panel' : 'Buat Panel Baru'}
          </h1>
        </div>
        
        {/* Loading state */}
        {isLoadingPanel && (
          <div className="p-6 text-center">
            <p>Memuat data panel...</p>
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div className="p-6">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <p>Terjadi kesalahan: {error.message || 'Gagal memproses permintaan'}</p>
            </div>
          </div>
        )}
        
        {/* Form */}
        {!isLoadingPanel && (
          <form onSubmit={handleSubmit}>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Panel basic info */}
              <div className="space-y-4">
                <h2 className="text-lg font-medium border-b pb-2">Detail Panel</h2>
                
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Judul
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={panelData.title}
                    onChange={handleInputChange}
                    required
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Deskripsi
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={panelData.description}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full p-2 border border-gray-300 rounded"
                  ></textarea>
                </div>
                
                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                    Tipe Visualisasi
                  </label>
                  <select
                    id="type"
                    name="type"
                    value={panelData.type}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded"
                  >
                    {PANEL_TYPES.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.icon} {type.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {PANEL_TYPES.find(t => t.id === panelData.type)?.description}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="width" className="block text-sm font-medium text-gray-700 mb-1">
                      Lebar
                    </label>
                    <input
                      type="number"
                      id="width"
                      name="width"
                      value={panelData.width}
                      onChange={handleInputChange}
                      min="1"
                      max="12"
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="height" className="block text-sm font-medium text-gray-700 mb-1">
                      Tinggi
                    </label>
                    <input
                      type="number"
                      id="height"
                      name="height"
                      value={panelData.height}
                      onChange={handleInputChange}
                      min="1"
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="options.unit" className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    id="options.unit"
                    name="options.unit"
                    value={panelData.options.unit}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded"
                    placeholder="%, ms, bytes, etc."
                  />
                </div>
                
                <div>
                  <label htmlFor="options.decimals" className="block text-sm font-medium text-gray-700 mb-1">
                    Desimal
                  </label>
                  <input
                    type="number"
                    id="options.decimals"
                    name="options.decimals"
                    value={panelData.options.decimals}
                    onChange={handleInputChange}
                    min="0"
                    max="10"
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
                
                {renderTypeSpecificOptions()}
              </div>
              
              {/* Query editor */}
              <div className="space-y-4">
                <h2 className="text-lg font-medium border-b pb-2">Query</h2>
                
                <div>
                  <label htmlFor="dataSource" className="block text-sm font-medium text-gray-700 mb-1">
                    Data Source
                  </label>
                  <select
                    id="dataSource"
                    value={selectedDataSource}
                    onChange={(e) => setSelectedDataSource(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded"
                  >
                    <option value="">Pilih Data Source</option>
                    {dataSources.map(ds => (
                      <option key={ds.id} value={ds.id}>{ds.name}</option>
                    ))}
                  </select>
                </div>
                
                {currentPanel?.queries.map((query, index) => (
                  <div key={query.id} className="border rounded p-4 bg-gray-50">
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-medium">Query {query.refId}</div>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuery(query.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Hapus
                      </button>
                    </div>
                    
                    <div className="mb-2">
                      <label htmlFor={`query-${query.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                        Query
                      </label>
                      <textarea
                        id={`query-${query.id}`}
                        value={query.query}
                        onChange={(e) => handleQueryChange(query.id, 'query', e.target.value)}
                        rows={4}
                        className="w-full p-2 border border-gray-300 rounded font-mono text-sm"
                        placeholder="from(bucket: \"telegraf\") |> range(start: -1h) |> filter(fn: (r) => r._measurement == \"cpu\")"
                      ></textarea>
                    </div>
                  </div>
                ))}
                
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleAddQuery}
                    disabled={!selectedDataSource}
                    className="px-4 py-2 border border-blue-300 text-blue-600 rounded hover:bg-blue-50 disabled:opacity-50"
                  >
                    + Tambah Query
                  </button>
                  
                  {currentPanel?.queries.length > 0 && (
                    <button
                      type="button"
                      onClick={handleRunQuery}
                      className="ml-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      Jalankan Query
                    </button>
                  )}
                </div>
                
                {/* Visualization Preview */}
                {isPreviewVisible && (
                  <div className="mt-4">
                    <h3 className="text-md font-medium mb-2">Pratinjau Visualisasi</h3>
                    <div className="border rounded p-4 bg-white h-64">
                      {renderVisualizationPreview()}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Form actions */}
            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded"
              >
                Batalkan
              </button>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-blue-300"
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default PanelForm; 