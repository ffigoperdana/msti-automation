import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import metricService from '../../services/metricService';
import QueryValidator, { QueryValidationResult } from '../../components/QueryValidator';
import QueryTemplateGenerator from '../../components/QueryTemplateGenerator';

interface DataSource {
  id: string;
  name: string;
  url: string;
  type: string;
  token: string;
  organization: string;
  database: string;
}

interface PanelData {
  title: string;
  description: string;
  type: '' | 'text' | 'stat' |'timeseries' | 'interface-status' | 'gauge' | 'table' | 'chord-diagram' | 'netflow-timeseries';
  dataSourceId?: string;
  queryText?: string;
  srcQuery?: string;  // NetFlow source query
  dstQuery?: string;  // NetFlow destination query
  bytesQuery?: string; // NetFlow in_bytes query
  refreshInterval?: number; // Add refresh interval
  gridSpan?: number; // Grid column span (1, 2, or 3)
  options: {
    measurement: string;
    field: string;
    unit: string;
    decimals: number;
    min?: number;
    max?: number;
  };
  queries: Array<{
    refId: string;
    dataSourceId: string;
    query: string;
  }>;
}

// Timeout options for refresh intervals
const TIMEOUT_OPTIONS = [
  { value: 10000, label: '10 seconds (Realtime)' },
  { value: 60000, label: '60 seconds' },
  { value: 120000, label: '120 seconds' },
  { value: 180000, label: '180 seconds' },
  { value: 3600000, label: '1 hour' }
];

const DEFAULT_PANEL: PanelData = {
  title: '',
  description: '',
  type: '',
  refreshInterval: 10000, // Default 10 seconds
  gridSpan: 1, // Default 1 column span
  options: {
    measurement: '',
    field: '',
    unit: '',
    decimals: 2,
  },
  queries: []
};

const PanelForm: React.FC = () => {
  const navigate = useNavigate();
  const { dashboardId, panelId } = useParams();
  const [panelData, setPanelData] = useState<PanelData>(DEFAULT_PANEL);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // State untuk query validation dan template
  const [queryValidationResult, setQueryValidationResult] = useState<QueryValidationResult | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [, setCanSave] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch data sources
        const sources = await metricService.getSources();
        setDataSources(sources);

        // If panelId exists, fetch panel data
        if (panelId) {
          setIsEditMode(true);
          const panel = await metricService.getPanel(panelId);
          
          // Check if this is NetFlow Time Series with 3 queries
          const isNetFlowTimeSeries = panel.type === 'netflow-timeseries' && panel.queries?.length === 3;
          
          // Transform panel data to match form structure
          setPanelData({
            title: panel.title || '',
            description: panel.description || '',
            type: panel.type,
            dataSourceId: panel.queries?.[0]?.dataSourceId,
            queryText: isNetFlowTimeSeries ? undefined : panel.queries?.[0]?.query,
            srcQuery: isNetFlowTimeSeries ? panel.queries.find((q: any) => q.refId === 'src')?.query : undefined,
            dstQuery: isNetFlowTimeSeries ? panel.queries.find((q: any) => q.refId === 'dst')?.query : undefined,
            bytesQuery: isNetFlowTimeSeries ? panel.queries.find((q: any) => q.refId === 'bytes')?.query : undefined,
            refreshInterval: panel.refreshInterval || 10000,
            gridSpan: panel.config?.gridSpan || panel.gridSpan || 1,
            options: {
              measurement: panel.options?.measurement || '',
              field: panel.options?.field || '',
              unit: panel.options?.unit || '',
              decimals: panel.options?.decimals || 2,
              min: panel.options?.min,
              max: panel.options?.max,
            },
            queries: panel.queries || []
          });
        }
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.response?.data?.message || 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [panelId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validasi untuk NetFlow Time Series
    if (panelData.type === 'netflow-timeseries') {
      if (!panelData.title || !panelData.dataSourceId || !panelData.srcQuery || !panelData.dstQuery || !panelData.bytesQuery) {
        setError('Harap lengkapi semua field yang diperlukan untuk NetFlow Time Series');
        setLoading(false);
        return;
      }
    } else {
      // Validasi untuk tipe panel lainnya
      if (!panelData.title || !panelData.dataSourceId || !panelData.queryText) {
        setError('Harap lengkapi semua field yang diperlukan');
        setLoading(false);
        return;
      }

      // Jika ada hasil validasi query dan tidak valid, tampilkan error
      if (queryValidationResult && !queryValidationResult.isValid) {
        setError(`Query tidak valid: ${queryValidationResult.error}`);
        setLoading(false);
        return;
      }
    }

    try {
      let panelPayload;

      // Build payload based on panel type
      if (panelData.type === 'netflow-timeseries') {
        panelPayload = {
          ...panelData,
          config: {
            gridSpan: panelData.gridSpan || 1
          },
          queries: [
            {
              refId: 'src',
              dataSourceId: panelData.dataSourceId,
              query: panelData.srcQuery
            },
            {
              refId: 'dst',
              dataSourceId: panelData.dataSourceId,
              query: panelData.dstQuery
            },
            {
              refId: 'bytes',
              dataSourceId: panelData.dataSourceId,
              query: panelData.bytesQuery
            }
          ]
        };
      } else {
        panelPayload = {
          ...panelData,
          config: {
            gridSpan: panelData.gridSpan || 1
          },
          queries: [{
            refId: 'A',
            dataSourceId: panelData.dataSourceId,
            query: panelData.queryText
          }]
        };
      }

      if (isEditMode && panelId) {
        await metricService.updatePanel(panelId, panelPayload);
      } else if (dashboardId) {
        await metricService.createPanel(dashboardId, panelPayload);
      }

      navigate(`/dashboard/view/${dashboardId}`);
    } catch (err: any) {
      console.error('Error saving panel:', err);
      setError(err.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} panel`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPanelData(prev => ({
      ...prev,
      [name]: (name === 'refreshInterval' || name === 'gridSpan') ? parseInt(value) : value
    }));
  };

  const handleOptionsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPanelData(prev => ({
      ...prev,
      options: {
        ...prev.options,
        [name.replace('options.', '')]: value
      }
    }));
  };

  // Handler untuk hasil validasi query
  const handleQueryValidation = (result: QueryValidationResult) => {
    setQueryValidationResult(result);
    setCanSave(result.isValid);
  };

  // Handler untuk template selection
  const handleTemplateSelect = (template: string) => {
    setPanelData(prev => ({
      ...prev,
      queryText: template
    }));
    setShowTemplates(false);
    // Reset validation result ketika query berubah
    setQueryValidationResult(null);
    setCanSave(false);
  };

  // Check apakah form valid untuk enable/disable save button
  const isFormValid = () => {
    if (panelData.type === 'netflow-timeseries') {
      return panelData.title && 
             panelData.dataSourceId && 
             panelData.srcQuery && 
             panelData.dstQuery && 
             panelData.bytesQuery;
    }
    return panelData.title && 
           panelData.dataSourceId && 
           panelData.queryText && 
           (queryValidationResult?.isValid !== false); // Allow jika belum divalidasi atau valid
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900">
            {isEditMode ? 'Edit Panel' : 'Buat Panel Baru'}
          </h2>
          
          {/* Form Status Indicator */}
          {panelData.dataSourceId && panelData.queryText && (
            <div className="mt-3 text-sm">
              {queryValidationResult === null ? (
                <span className="text-yellow-600">⚠️ Query belum divalidasi</span>
              ) : queryValidationResult.isValid ? (
                <span className="text-green-600">✅ Query valid dan siap disimpan</span>
              ) : (
                <span className="text-red-600">❌ Query tidak valid</span>
              )}
            </div>
          )}
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        </div>
      )}
      
        {/* Basic Info */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Detail Panel</h2>
          
          <div className="space-y-4">
          <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Judul
            </label>
            <input
                type="text"
              id="title"
                name="title"
                value={panelData.title}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            />
          </div>
          
          <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Deskripsi
            </label>
            <textarea
              id="description"
                name="description"
                value={panelData.description}
                onChange={handleInputChange}
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          
          <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                Tipe Visualisasi
            </label>
              <select
                id="type"
                name="type"
                value={panelData.type}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                required
                >
                <option value="">Pilih Tipe Visualisasi</option>
                <option value="text">Text</option>
                <option value="stat">Stat</option>
                <option value="timeseries">Time Series</option>
                <option value="netflow-timeseries">NetFlow Time Series</option>
                <option value="interface-status">Interface Status</option>
                <option value="gauge">Gauge</option>
                <option value="table">Table</option>
                <option value="chord-diagram">Chord Diagram</option>
              </select>
            </div>

            {/* Refresh Interval Selection */}
            <div>
              <label htmlFor="refreshInterval" className="block text-sm font-medium text-gray-700">
                Refresh Interval
              </label>
              <select
                id="refreshInterval"
                name="refreshInterval"
                value={panelData.refreshInterval || 10000}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              >
                {TIMEOUT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                How often this panel should refresh its data. For panels like hostname status, 
                you can set longer intervals and use the reload button for real-time updates.
              </p>
            </div>

            {/* Grid Span Selection */}
            <div>
              <label htmlFor="gridSpan" className="block text-sm font-medium text-gray-700">
                Panel Width
              </label>
              <select
                id="gridSpan"
                name="gridSpan"
                value={panelData.gridSpan || 1}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              >
                <option value={1}>1 Column (Normal)</option>
                <option value={2}>2 Columns (Wide)</option>
                <option value={3}>3 Columns (Full Width)</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                How many grid columns this panel should span. Use wider layouts for time series and detailed visualizations.
              </p>
            </div>
          </div>
        </div>
              
        {/* Query Section */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Query</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="dataSourceId" className="block text-sm font-medium text-gray-700">
                Data Source
              </label>
              <select
                id="dataSourceId"
                name="dataSourceId"
                value={panelData.dataSourceId}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                required
              >
                <option value="">Pilih Data Source</option>
                {dataSources.map(ds => (
                  <option key={ds.id} value={ds.id}>{ds.name}</option>
                ))}
              </select>
            </div>
          
          {/* NetFlow Time Series - 3 Query Fields */}
          {panelData.type === 'netflow-timeseries' ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="srcQuery" className="block text-sm font-medium text-gray-700 mb-2">
                  Source IP Query
                </label>
                <textarea
                  id="srcQuery"
                  name="srcQuery"
                  value={panelData.srcQuery || ''}
                  onChange={handleInputChange}
                  rows={4}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 font-mono text-sm"
                  placeholder={`from(bucket: "telegraf")
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r["source"] == "192.168.238.101")
  |> filter(fn: (r) => r["_measurement"] == "netflow")
  |> filter(fn: (r) => r["_field"] == "src")
  |> yield(name: "src")`}
                  required
                />
              </div>

              <div>
                <label htmlFor="dstQuery" className="block text-sm font-medium text-gray-700 mb-2">
                  Destination IP Query
                </label>
                <textarea
                  id="dstQuery"
                  name="dstQuery"
                  value={panelData.dstQuery || ''}
                  onChange={handleInputChange}
                  rows={4}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 font-mono text-sm"
                  placeholder={`from(bucket: "telegraf")
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r["source"] == "192.168.238.101")
  |> filter(fn: (r) => r["_measurement"] == "netflow")
  |> filter(fn: (r) => r["_field"] == "dst")
  |> yield(name: "dst")`}
                  required
                />
              </div>

              <div>
                <label htmlFor="bytesQuery" className="block text-sm font-medium text-gray-700 mb-2">
                  In_Bytes Query
                </label>
                <textarea
                  id="bytesQuery"
                  name="bytesQuery"
                  value={panelData.bytesQuery || ''}
                  onChange={handleInputChange}
                  rows={4}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 font-mono text-sm"
                  placeholder={`from(bucket: "telegraf")
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r["source"] == "192.168.238.101")
  |> filter(fn: (r) => r["_measurement"] == "netflow")
  |> filter(fn: (r) => r["_field"] == "in_bytes")
  |> yield(name: "in_bytes")`}
                  required
                />
              </div>
            </div>
          ) : (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="queryText" className="block text-sm font-medium text-gray-700">
                Flux Query
              </label>
              <button
                type="button"
                onClick={() => setShowTemplates(!showTemplates)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {showTemplates ? 'Sembunyikan Template' : 'Gunakan Template'}
              </button>
            </div>

            {/* Query Templates */}
            {showTemplates && (
              <div className="mb-4 border rounded-md p-4 bg-gray-50">
                <QueryTemplateGenerator
                  panelType={panelData.type}
                  onTemplateSelect={handleTemplateSelect}
                />
              </div>
            )}

            <textarea
              id="queryText"
              name="queryText"
              value={panelData.queryText || ''}
              onChange={(e) => {
                handleInputChange(e);
                // Reset validation result ketika query berubah manual
                setQueryValidationResult(null);
                setCanSave(false);
              }}
              rows={8}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 font-mono text-sm"
              placeholder={`from(bucket: "telegraf")
                      |> range(start: -5m)
                      |> filter(fn: (r) => r._measurement == "interface_status")
                      |> filter(fn: (r) => r._field == "status")
                      |> last()
                      |> yield(name: "result")`}
              required
            />

            {/* Query Validator */}
            {panelData.dataSourceId && panelData.queryText && (
              <QueryValidator
                dataSourceId={panelData.dataSourceId}
                query={panelData.queryText}
                onValidationResult={handleQueryValidation}
                onQueryChange={(modifiedQuery) => {
                  setPanelData(prev => ({ ...prev, queryText: modifiedQuery }));
                  // Reset validation result ketika query berubah otomatis
                  setQueryValidationResult(null);
                  setCanSave(false);
                }}
                className="mt-3"
                panelType={panelData.type}
                showPreview={true}
              />
            )}
          </div>
          )}

            {(panelData.type === 'interface-status') && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="options.measurement" className="block text-sm font-medium text-gray-700">
                    Measurement
                  </label>
                  <input
                    type="text"
                    id="options.measurement"
                    name="options.measurement"
                    value={panelData.options.measurement || 'interface_status'}
                    onChange={handleOptionsChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    placeholder="interface_status"
                  />
                </div>
          
                <div>
                  <label htmlFor="options.field" className="block text-sm font-medium text-gray-700">
                    Field
                  </label>
                  <input
                    type="text"
                    id="options.field"
                    name="options.field"
                    value={panelData.options.field || 'status'}
                    onChange={handleOptionsChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    placeholder="status"
                  />
                </div>
              </div>
            )}

            {panelData.type === 'gauge' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="options.unit" className="block text-sm font-medium text-gray-700">
                      Unit
                    </label>
                    <input
                      type="text"
                      id="options.unit"
                      name="options.unit"
                      value={panelData.options.unit}
                      onChange={handleOptionsChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      placeholder="%"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="options.decimals" className="block text-sm font-medium text-gray-700">
                      Decimals
                    </label>
                    <input
                      type="number"
                      id="options.decimals"
                      name="options.decimals"
                      value={panelData.options.decimals}
                      onChange={handleOptionsChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      min="0"
                      max="5"
                      placeholder="1"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="options.min" className="block text-sm font-medium text-gray-700">
                      Min Value
                    </label>
                    <input
                      type="number"
                      id="options.min"
                      name="options.min"
                      value={panelData.options.min || 0}
                      onChange={handleOptionsChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      placeholder="0"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="options.max" className="block text-sm font-medium text-gray-700">
                      Max Value
                    </label>
                    <input
                      type="number"
                      id="options.max"
                      name="options.max"
                      value={panelData.options.max || 100}
                      onChange={handleOptionsChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      placeholder="100"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            {error}
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate(`/dashboard/view/${dashboardId}`)}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading || !isFormValid()}
            className={`px-4 py-2 border border-transparent rounded-md text-white ${
              loading || !isFormValid()
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Menyimpan...' : isEditMode ? 'Update Panel' : 'Simpan Panel'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PanelForm;