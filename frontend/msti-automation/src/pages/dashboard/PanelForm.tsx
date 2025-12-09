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
    // Table-specific options
    mode?: 'simplified' | 'advanced';
    selectedFields?: string[];
    timeRange?: string; // -5m, -15m, -1h, etc.
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
    mode: 'simplified',
    selectedFields: [],
    timeRange: '-5m',
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

  // Table-specific states
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [scanningFields, setScanningFields] = useState(false);
  const [advancedQueries, setAdvancedQueries] = useState<Array<{ id: string; query: string }>>([{ id: '1', query: '' }]);

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
              measurement: panel.options?.measurement || panel.config?.options?.measurement || '',
              field: panel.options?.field || panel.config?.options?.field || '',
              unit: panel.options?.unit || panel.config?.options?.unit || '',
              decimals: panel.options?.decimals || panel.config?.options?.decimals || 2,
              min: panel.options?.min || panel.config?.options?.min,
              max: panel.options?.max || panel.config?.options?.max,
              // Table-specific options
              mode: panel.options?.mode || panel.config?.options?.mode || 'simplified',
              selectedFields: panel.options?.selectedFields || panel.config?.options?.selectedFields || [],
              timeRange: panel.options?.timeRange || panel.config?.options?.timeRange || '-5m',
            },
            queries: panel.queries || []
          });
          
          // For table type, load advanced queries if in advanced mode
          if (panel.type === 'table' && (panel.options?.mode === 'advanced' || panel.config?.options?.mode === 'advanced')) {
            const loadedQueries = panel.queries.map((q: any, index: number) => ({
              id: (index + 1).toString(),
              query: q.query
            }));
            if (loadedQueries.length > 0) {
              setAdvancedQueries(loadedQueries);
            }
          }
          
          // For table simplified mode, load available fields if selectedFields exist
          if (panel.type === 'table' && (panel.options?.selectedFields?.length > 0 || panel.config?.options?.selectedFields?.length > 0)) {
            const fields = panel.options?.selectedFields || panel.config?.options?.selectedFields || [];
            if (fields.length > 0) {
              // Extract all unique field names from selectedFields
              setAvailableFields(fields);
            }
          }
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

  // Scan fields from query result (Simplified mode)
  const scanFieldsFromQuery = async () => {
    if (!panelData.dataSourceId || !panelData.queryText) {
      setError('Please select a data source and enter a query first');
      return;
    }

    setScanningFields(true);
    setError(null);

    try {
      // Execute the query to get the result
      const result = await metricService.executeFluxQuery(panelData.dataSourceId, panelData.queryText);
      
      // Extract field names from the result, preserving order
      const fields: string[] = [];
      
      if (result && result.series && Array.isArray(result.series)) {
        result.series.forEach((serie: any) => {
          if (serie.fields && Array.isArray(serie.fields)) {
            serie.fields.forEach((field: any) => {
              // Skip time fields and only get value fields
              // Use includes() to prevent duplicates while preserving order
              if (field.type !== 'time' && field.name && !fields.includes(field.name)) {
                fields.push(field.name);
              }
            });
          }
        });
      }

      if (fields.length === 0) {
        setError('No fields found in query result. Make sure your query returns data.');
      } else {
        // Set fields in the order they appear in the query result
        setAvailableFields(fields);
      }
    } catch (err: any) {
      console.error('Error scanning fields:', err);
      setError(`Failed to scan fields: ${err.message || 'Unknown error'}`);
    } finally {
      setScanningFields(false);
    }
  };

  // Handle field selection (Simplified mode)
  const handleFieldToggle = (fieldName: string) => {
    setPanelData(prev => {
      const currentFields = prev.options.selectedFields || [];
      const newFields = currentFields.includes(fieldName)
        ? currentFields.filter(f => f !== fieldName)
        : [...currentFields, fieldName];
      
      return {
        ...prev,
        options: {
          ...prev.options,
          selectedFields: newFields
        }
      };
    });
  };

  // Handle advanced query changes
  const handleAdvancedQueryChange = (id: string, value: string) => {
    setAdvancedQueries(prev =>
      prev.map(q => q.id === id ? { ...q, query: value } : q)
    );
  };

  // Add new query field (Advanced mode)
  const addAdvancedQuery = () => {
    const newId = (advancedQueries.length + 1).toString();
    setAdvancedQueries(prev => [...prev, { id: newId, query: '' }]);
  };

  // Remove query field (Advanced mode)
  const removeAdvancedQuery = (id: string) => {
    if (advancedQueries.length > 1) {
      setAdvancedQueries(prev => prev.filter(q => q.id !== id));
    }
  };

  // Check if query has |> last()
  const hasLastFunction = (query: string): boolean => {
    return /\|\s*>\s*last\s*\(\s*\)/.test(query);
  };

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
    } else if (panelData.type === 'table') {
      // Validasi untuk Table
      if (!panelData.title || !panelData.dataSourceId) {
        setError('Harap lengkapi judul dan data source');
        setLoading(false);
        return;
      }

      const mode = panelData.options.mode || 'simplified';
      
      if (mode === 'simplified') {
        if (!panelData.queryText) {
          setError('Harap masukkan query untuk mode simplified');
          setLoading(false);
          return;
        }
      } else {
        // Advanced mode - check if at least one query exists
        const validQueries = advancedQueries.filter(q => q.query.trim() !== '');
        if (validQueries.length === 0) {
          setError('Harap masukkan minimal satu query untuk mode advanced');
          setLoading(false);
          return;
        }

        // Check for missing |> last() and warn
        const queriesWithoutLast = validQueries.filter(q => !hasLastFunction(q.query));
        if (queriesWithoutLast.length > 0) {
          const confirmed = window.confirm(
            'Beberapa query tidak memiliki |> last(). Ini akan menghasilkan lebih banyak data. ' +
            'Fitur untuk menampilkan semua data akan datang segera. ' +
            'Apakah Anda ingin melanjutkan?'
          );
          if (!confirmed) {
            setLoading(false);
            return;
          }
        }
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
      } else if (panelData.type === 'table') {
        // Table panel with mode support
        const mode = panelData.options.mode || 'simplified';
        
        if (mode === 'simplified') {
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
        } else {
          // Advanced mode - multiple queries
          const validQueries = advancedQueries.filter(q => q.query.trim() !== '');
          panelPayload = {
            ...panelData,
            config: {
              gridSpan: panelData.gridSpan || 1
            },
            queries: validQueries.map((q, index) => ({
              refId: `Q${index + 1}`,
              dataSourceId: panelData.dataSourceId!,
              query: q.query
            }))
          };
        }
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
  |> filter(fn: (r) => r["source"] == "10.20.50.125")
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
  |> filter(fn: (r) => r["source"] == "10.20.50.125")
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
  |> filter(fn: (r) => r["source"] == "10.20.50.125")
  |> filter(fn: (r) => r["_measurement"] == "netflow")
  |> filter(fn: (r) => r["_field"] == "in_bytes")
  |> yield(name: "in_bytes")`}
                  required
                />
              </div>
            </div>
          ) : panelData.type === 'table' ? (
            /* Table-specific configuration */
            <div className="space-y-6">
              {/* Mode Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Table Mode
                </label>
                <div className="flex space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="tableMode"
                      value="simplified"
                      checked={panelData.options.mode === 'simplified'}
                      onChange={() => {
                        setPanelData(prev => ({
                          ...prev,
                          options: { ...prev.options, mode: 'simplified' }
                        }));
                        setAvailableFields([]);
                      }}
                      className="form-radio h-4 w-4 text-blue-600"
                    />
                    <span className="ml-2">Simplified Mode</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="tableMode"
                      value="advanced"
                      checked={panelData.options.mode === 'advanced'}
                      onChange={() => {
                        setPanelData(prev => ({
                          ...prev,
                          options: { ...prev.options, mode: 'advanced' }
                        }));
                      }}
                      className="form-radio h-4 w-4 text-blue-600"
                    />
                    <span className="ml-2">Advanced Mode</span>
                  </label>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {panelData.options.mode === 'simplified' 
                    ? 'Simplified: Enter one query and select fields to display'
                    : 'Advanced: Enter multiple queries, each becomes a column'}
                </p>
              </div>

              {/* Time Range Selection */}
              <div>
                <label htmlFor="timeRange" className="block text-sm font-medium text-gray-700">
                  Time Range
                </label>
                <select
                  id="timeRange"
                  value={panelData.options.timeRange || '-5m'}
                  onChange={(e) => {
                    setPanelData(prev => ({
                      ...prev,
                      options: { ...prev.options, timeRange: e.target.value }
                    }));
                  }}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                >
                  <option value="-5m">Last 5 minutes</option>
                  <option value="-15m">Last 15 minutes</option>
                  <option value="-30m">Last 30 minutes</option>
                  <option value="-1h">Last 1 hour</option>
                  <option value="-6h">Last 6 hours</option>
                  <option value="-12h">Last 12 hours</option>
                  <option value="-24h">Last 24 hours</option>
                </select>
              </div>

              {panelData.options.mode === 'simplified' ? (
                /* Simplified Mode UI */
                <div className="space-y-4">
                  <div>
                    <label htmlFor="tableQuery" className="block text-sm font-medium text-gray-700 mb-2">
                      Query
                    </label>
                    <textarea
                      id="tableQuery"
                      name="queryText"
                      value={panelData.queryText || ''}
                      onChange={handleInputChange}
                      rows={6}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 font-mono text-sm"
                      placeholder={`from(bucket: "telegraf")
  |> range(start: -5m)
  |> filter(fn: (r) => r["_measurement"] == "netflow")
  |> last()`}
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Enter a query that returns the fields you want to display in the table
                    </p>
                  </div>

                  {/* Scan Fields Button */}
                  {panelData.queryText && panelData.dataSourceId && (
                    <button
                      type="button"
                      onClick={scanFieldsFromQuery}
                      disabled={scanningFields}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {scanningFields ? 'Scanning...' : 'Scan Fields from Query'}
                    </button>
                  )}

                  {/* Available Fields Selection */}
                  {availableFields.length > 0 && (
                    <div className="border rounded-md p-4 bg-gray-50">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Fields to Display
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {availableFields.map(field => (
                          <label key={field} className="inline-flex items-center">
                            <input
                              type="checkbox"
                              checked={panelData.options.selectedFields?.includes(field) || false}
                              onChange={() => handleFieldToggle(field)}
                              className="form-checkbox h-4 w-4 text-blue-600"
                            />
                            <span className="ml-2 text-sm">{field}</span>
                          </label>
                        ))}
                      </div>
                      <p className="mt-2 text-sm text-gray-500">
                        Selected: {panelData.options.selectedFields?.length || 0} field(s)
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* Advanced Mode UI */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Queries (Each query becomes a column)
                    </label>
                    <button
                      type="button"
                      onClick={addAdvancedQuery}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                    >
                      + Add Query
                    </button>
                  </div>

                  {advancedQueries.map((query, index) => (
                    <div key={query.id} className="border rounded-md p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Query {index + 1}
                        </label>
                        {advancedQueries.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeAdvancedQuery(query.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <textarea
                        value={query.query}
                        onChange={(e) => handleAdvancedQueryChange(query.id, e.target.value)}
                        rows={4}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 font-mono text-sm"
                        placeholder={`from(bucket: "telegraf")
  |> range(start: -5m)
  |> filter(fn: (r) => r["_measurement"] == "netflow")
  |> filter(fn: (r) => r["_field"] == "src")
  |> last()`}
                      />
                      {query.query && !hasLastFunction(query.query) && (
                        <p className="mt-1 text-sm text-yellow-600">
                          ⚠️ Warning: Query doesn't have |{'>'} last(). This will return more data (coming soon feature).
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
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