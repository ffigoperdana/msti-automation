import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDataSourceStore, API_KEYS } from '../../../store/dataSourceStore';

// Interface untuk data form
interface InfluxDBConfig {
  name: string;
  url: string;
  authType: 'token' | 'basic' | 'none';
  token?: string;
  username?: string;
  password?: string;
  defaultBucket: string;
  organization: string;
  retentionPolicy?: string;
  defaultMin: string;
  defaultMax: string;
  isDefault: boolean;
}

// Status validasi
type ValidationStatus = 'none' | 'validating' | 'success' | 'error';

const InfluxDBForm = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  
  // Mengakses store
  const { 
    fetchDataSource, 
    createDataSource, 
    updateDataSource, 
    isLoading, 
    getError,
    currentDataSource
  } = useDataSourceStore();
  
  // Local state untuk form
  const [formData, setFormData] = useState<InfluxDBConfig>({
    name: '',
    url: 'http://localhost:8086',
    authType: 'token',
    token: '',
    username: '',
    password: '',
    defaultBucket: '',
    organization: '',
    retentionPolicy: '',
    defaultMin: '-15m',
    defaultMax: 'now()',
    isDefault: false
  });
  
  // State untuk validasi koneksi
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('none');
  const [validationMessage, setValidationMessage] = useState('');
  
  // Memuat data jika dalam mode edit
  useEffect(() => {
    if (isEditMode && id) {
      const loadDataSource = async () => {
        try {
          await fetchDataSource(id);
        } catch (error) {
          console.error('Gagal memuat data source:', error);
        }
      };
      
      loadDataSource();
    }
  }, [isEditMode, id, fetchDataSource]);
  
  // Update form data ketika currentDataSource berubah
  useEffect(() => {
    if (currentDataSource && isEditMode) {
      setFormData({
        name: currentDataSource.name || '',
        url: currentDataSource.url || '',
        authType: currentDataSource.authType || 'token',
        token: currentDataSource.token || '',
        username: currentDataSource.username || '',
        password: currentDataSource.password || '',
        defaultBucket: currentDataSource.defaultBucket || '',
        organization: currentDataSource.organization || '',
        retentionPolicy: currentDataSource.retentionPolicy || '',
        defaultMin: currentDataSource.defaultMin || '-15m',
        defaultMax: currentDataSource.defaultMax || 'now()',
        isDefault: currentDataSource.isDefault || false
      });
    }
  }, [currentDataSource, isEditMode]);
  
  // Handler untuk perubahan form
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Reset validasi ketika user mengubah form
    if (['url', 'token', 'username', 'password', 'organization', 'defaultBucket'].includes(name)) {
      setValidationStatus('none');
      setValidationMessage('');
    }
  };
  
  // Handler untuk menguji koneksi
  const handleTestConnection = async () => {
    try {
      // Validasi input dasar
      if (!formData.name) {
        setValidationStatus('error');
        setValidationMessage('Nama data source harus diisi');
        return;
      }
      
      if (!formData.url) {
        setValidationStatus('error');
        setValidationMessage('URL harus diisi');
        return;
      }
      
      if (formData.authType === 'token' && !formData.token) {
        setValidationStatus('error');
        setValidationMessage('Token harus diisi jika menggunakan autentikasi token');
        return;
      }
      
      if (formData.authType === 'basic' && (!formData.username || !formData.password)) {
        setValidationStatus('error');
        setValidationMessage('Username dan password harus diisi jika menggunakan basic auth');
        return;
      }
      
      setValidationStatus('validating');
      setValidationMessage('Menguji koneksi ke InfluxDB...');
      
      // Panggil API untuk validasi koneksi
      const response = await fetch('/api/data-sources/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'influxdb',
          url: formData.url,
          token: formData.token,
          username: formData.username,
          password: formData.password,
          organization: formData.organization,
          bucket: formData.defaultBucket
        }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        setValidationStatus('success');
        setValidationMessage('Koneksi berhasil! Data source valid.');
      } else {
        setValidationStatus('error');
        setValidationMessage(`Koneksi gagal: ${result.message || 'Tidak dapat terhubung ke InfluxDB'}`);
      }
    } catch (error) {
      console.error('Error validating connection:', error);
      setValidationStatus('error');
      setValidationMessage('Terjadi kesalahan saat menguji koneksi');
    }
  };
  
  // Handler untuk submit form
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Cek validasi sebelum submit
    if (validationStatus !== 'success') {
      const confirmSave = window.confirm('Anda belum memvalidasi koneksi atau validasi gagal. Tetap simpan data source?');
      if (!confirmSave) return;
    }
    
    try {
      if (isEditMode && id) {
        await updateDataSource(id, formData);
      } else {
        await createDataSource(formData);
      }
      // Navigasi kembali ke halaman data sources
      navigate('/connections/data-sources');
    } catch (error) {
      console.error('Gagal menyimpan data source:', error);
    }
  };
  
  // Kembali ke halaman sebelumnya
  const handleCancel = () => {
    navigate('/connections/data-sources');
  };
  
  // Status loading
  const isLoadingData = isEditMode ? isLoading(`${API_KEYS.GET_DATA_SOURCE}_${id}`) : false;
  const isSubmitting = isEditMode 
    ? isLoading(`${API_KEYS.UPDATE_DATA_SOURCE}_${id}`)
    : isLoading(API_KEYS.CREATE_DATA_SOURCE);
  
  // Error handling
  const error = isEditMode 
    ? getError(`${API_KEYS.GET_DATA_SOURCE}_${id}`) || getError(`${API_KEYS.UPDATE_DATA_SOURCE}_${id}`)
    : getError(API_KEYS.CREATE_DATA_SOURCE);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-6">
          {isEditMode ? 'Edit InfluxDB Data Source' : 'Tambah InfluxDB Data Source'}
        </h1>
        
        {/* Loading state */}
        {isLoadingData && (
          <div className="text-center py-4">
            <p>Memuat data...</p>
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            Terjadi kesalahan: {error.message || 'Gagal memproses permintaan'}
          </div>
        )}
        
        {/* Form */}
        {!isLoadingData && (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Nama
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="Contoh: InfluxDB Production"
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                URL
              </label>
              <input
                type="url"
                id="url"
                name="url"
                value={formData.url}
                onChange={handleChange}
                required
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="http://localhost:8086"
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="authType" className="block text-sm font-medium text-gray-700 mb-1">
                Tipe Autentikasi
              </label>
              <select
                id="authType"
                name="authType"
                value={formData.authType}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded"
              >
                <option value="token">Token</option>
                <option value="basic">Basic Auth</option>
                <option value="none">Tanpa Autentikasi</option>
              </select>
            </div>
            
            {formData.authType === 'token' && (
              <div className="mb-4">
                <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-1">
                  API Token
                </label>
                <input
                  type="password"
                  id="token"
                  name="token"
                  value={formData.token}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded"
                  placeholder="xxxxxxxxxx"
                />
              </div>
            )}
            
            <div className="mb-4">
              <label htmlFor="organization" className="block text-sm font-medium text-gray-700 mb-1">
                Organization
              </label>
              <input
                type="text"
                id="organization"
                name="organization"
                value={formData.organization}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="myorg"
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="defaultBucket" className="block text-sm font-medium text-gray-700 mb-1">
                Database / Bucket
              </label>
              <input
                type="text"
                id="defaultBucket"
                name="defaultBucket"
                value={formData.defaultBucket}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="telegraf"
              />
            </div>
            
            {formData.authType === 'basic' && (
              <div className="mb-6">
                <p className="text-sm text-gray-700 mb-2">Basic Auth</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      className="w-full p-2 border border-gray-300 rounded"
                      placeholder="username"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full p-2 border border-gray-300 rounded"
                      placeholder="********"
                    />
                  </div>
                </div>
              </div>
            )}
            
            {/* Validation Status */}
            {validationStatus === 'validating' && (
              <div className="mb-4 p-3 bg-blue-50 text-blue-700 border border-blue-200 rounded flex items-center">
                <svg className="animate-spin h-5 w-5 mr-3 text-blue-500" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {validationMessage}
              </div>
            )}
            
            {validationStatus === 'success' && (
              <div className="mb-4 p-3 bg-green-50 text-green-700 border border-green-200 rounded">
                <div className="flex items-center">
                  <svg className="h-5 w-5 mr-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {validationMessage}
                </div>
              </div>
            )}
            
            {validationStatus === 'error' && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded">
                <div className="flex items-center">
                  <svg className="h-5 w-5 mr-2 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {validationMessage}
                </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-2 mt-6">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={validationStatus === 'validating'}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50"
              >
                {validationStatus === 'validating' ? 'Menguji...' : 'Uji Koneksi'}
              </button>
              
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

export default InfluxDBForm; 