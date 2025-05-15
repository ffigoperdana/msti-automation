import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataSourceStore, API_KEYS } from '../../store/dataSourceStore';


const DataSources = () => {
  const navigate = useNavigate();
  
  // Menggunakan Zustand store
  const { 
    dataSources, 
    fetchDataSources, 
    deleteDataSource,
    isLoading,
    getError
  } = useDataSourceStore();
  
  // Muat data sources saat komponen dimuat
  useEffect(() => {
    loadDataSources();
  }, []);

  // Fungsi untuk memuat data sources
  const loadDataSources = async () => {
    try {
      await fetchDataSources();
    } catch (error) {
      console.error('Gagal memuat data sources:', error);
    }
  };

  // Fungsi untuk menghapus data source
  const handleDelete = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus data source ini?')) {
      try {
        await deleteDataSource(id);
      } catch (error) {
        console.error('Gagal menghapus data source:', error);
      }
    }
  };

  // Navigasi ke halaman tambah data source
  const handleAddNew = () => {
    navigate('/connections/new');
  };
  
  // Navigasi ke halaman edit data source
  const handleEdit = (id: string) => {
    navigate(`/connections/data-sources/edit/${id}`);
  };

  // Mendapatkan status loading dan error
  const isLoadingDataSources = isLoading(API_KEYS.GET_DATA_SOURCES);
  const dataSourcesError = getError(API_KEYS.GET_DATA_SOURCES);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Data Sources</h1>
        <button
          onClick={handleAddNew}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          Tambah Data Source
        </button>
      </div>

      {/* Error alert */}
      {dataSourcesError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Gagal memuat data sources. Silakan coba lagi.
        </div>
      )}

      {/* Loading state */}
      {isLoadingDataSources && (
        <div className="text-center py-4">
          <p>Memuat data sources...</p>
        </div>
      )}

      {/* Data sources list */}
      {!isLoadingDataSources && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {dataSources.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Tidak ada data source yang tersedia.</p>
              <p className="text-gray-500 mt-2">Klik tombol 'Tambah Data Source' untuk menambahkan data source baru.</p>
      </div>
          ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nama
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipe
                </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  URL
                </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {dataSources.map((source) => (
                  <tr key={source.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{source.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{source.type}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{source.url}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(source.id)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                        disabled={isLoading(`${API_KEYS.DELETE_DATA_SOURCE}_${source.id}`)}
                      >
                        Edit
                      </button>
                        <button 
                        onClick={() => handleDelete(source.id)}
                          className="text-red-600 hover:text-red-900"
                        disabled={isLoading(`${API_KEYS.DELETE_DATA_SOURCE}_${source.id}`)}
                      >
                        {isLoading(`${API_KEYS.DELETE_DATA_SOURCE}_${source.id}`) ? 'Menghapus...' : 'Hapus'}
                      </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
          </div>
        )}
    </div>
  );
};

export default DataSources; 