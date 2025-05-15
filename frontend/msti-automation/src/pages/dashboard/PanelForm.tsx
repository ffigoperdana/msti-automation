import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import metricService from '../../services/metricService';

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
  type: 'timeseries' | 'interface-status';
  dataSourceId?: string;
  queryText?: string;
  options: {
    measurement: string;
    field: string;
    unit: string;
    decimals: number;
  };
  queries: Array<{
    refId: string;
    dataSourceId: string;
    query: string;
  }>;
}

// Tipe panel yang didukung

// Data dummy untuk interface

// Template query berdasarkan tipe panel

// Komponen Panel Status Interface Preview

const DEFAULT_PANEL: PanelData = {
  title: '',
  description: '',
  type: 'timeseries',
  options: {
    measurement: 'interface_status',
    field: 'status',
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
          
          // Transform panel data to match form structure
          setPanelData({
            title: panel.title || '',
            description: panel.description || '',
            type: panel.type,
            dataSourceId: panel.queries?.[0]?.dataSourceId,
            queryText: panel.queries?.[0]?.query,
            options: {
              measurement: panel.options?.measurement || 'interface_status',
              field: panel.options?.field || 'status',
              unit: panel.options?.unit || '',
              decimals: panel.options?.decimals || 2,
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

    try {
      const panelPayload = {
        ...panelData,
        queries: [{
          refId: 'A',
          dataSourceId: panelData.dataSourceId,
          query: panelData.queryText
        }]
      };

      if (isEditMode && panelId) {
        await metricService.updatePanel(panelId, panelPayload);
      } else if (dashboardId) {
        await metricService.createPanel(dashboardId, panelPayload);
      }

      navigate(`/dashboard/${dashboardId}`);
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
      [name]: value
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

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900">
            {isEditMode ? 'Edit Panel' : 'Buat Panel Baru'}
          </h2>
      </div>
      
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
                <option value="timeseries">Time Series</option>
                <option value="interface-status">Interface Status</option>
              </select>
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
          
          <div>
              <label htmlFor="queryText" className="block text-sm font-medium text-gray-700">
                Query
            </label>
            <textarea
                id="queryText"
                name="queryText"
                value={panelData.queryText}
                onChange={handleInputChange}
                rows={4}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 font-mono"
                placeholder={`from(bucket: "telegraf")
  |> range(start: -5m)
  |> filter(fn: (r) => r._measurement == "interface_status")
  |> filter(fn: (r) => r._field == "status")`}
              required
              />
            </div>

            {panelData.type === 'interface-status' && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="options.measurement" className="block text-sm font-medium text-gray-700">
                    Measurement
                  </label>
                  <input
                    type="text"
                    id="options.measurement"
                    name="options.measurement"
                    value={panelData.options.measurement}
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
                    value={panelData.options.field}
                    onChange={handleOptionsChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    placeholder="status"
                  />
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
            onClick={() => navigate(`/dashboard/${dashboardId}`)}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`px-4 py-2 border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700 ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Menyimpan...' : isEditMode ? 'Update' : 'Simpan'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PanelForm; 