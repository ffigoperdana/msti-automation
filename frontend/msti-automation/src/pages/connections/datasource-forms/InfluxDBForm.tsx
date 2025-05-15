import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDataSourceStore } from '../../../store/dataSourceStore';
import { API_ENDPOINTS } from '../../../config';
import api from '../../../services/api';

// Interface untuk data form
interface InfluxDBConfig {
  name: string;
  url: string;
  token: string;
  bucket: string;
  organization: string;
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
    currentDataSource
  } = useDataSourceStore();
  
  // Local state untuk form
  const [formData, setFormData] = useState<InfluxDBConfig>({
    name: '',
    url: 'http://localhost:8086',
    token: '',
    bucket: '',
    organization: '',
    isDefault: false
  });
  
  // State untuk validasi
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('none');
  const [validationMessage, setValidationMessage] = useState('');
  
  // State untuk loading
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Memuat data jika dalam mode edit
  useEffect(() => {
    if (isEditMode && id) {
      const loadDataSource = async () => {
        setIsLoadingData(true);
        try {
          await fetchDataSource(id);
        } catch (error) {
          console.error('Gagal memuat data source:', error);
        } finally {
          setIsLoadingData(false);
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
        token: currentDataSource.token || '',
        bucket: currentDataSource.database || '',
        organization: currentDataSource.organization || '',
        isDefault: currentDataSource.isDefault || false
      });
    }
  }, [currentDataSource, isEditMode]);
  
  // Handler untuk perubahan form
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
    
    // Reset validasi ketika user mengubah form
    if (['url', 'token', 'organization', 'bucket'].includes(name)) {
    setValidationStatus('none');
    setValidationMessage('');
    }
  };
  
  // Handler untuk menguji koneksi dan bucket
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
    
      if (!formData.token) {
      setValidationStatus('error');
        setValidationMessage('Token harus diisi');
      return;
    }
    
      if (!formData.organization) {
      setValidationStatus('error');
      setValidationMessage('Organization harus diisi');
      return;
    }
    
      if (!formData.bucket) {
      setValidationStatus('error');
        setValidationMessage('Bucket harus diisi');
      return;
    }
    
      setValidationStatus('validating');
      setValidationMessage('Menguji koneksi dan bucket...');

      console.log('Sending test request with data:', {
        url: formData.url,
        token: formData.token,
        organization: formData.organization,
        bucket: formData.bucket
      });
      
      // Test koneksi dan bucket
      const response = await api.post(`${API_ENDPOINTS.DATA_SOURCES}/test`, {
        url: formData.url,
        token: formData.token,
        organization: formData.organization,
        bucket: formData.bucket
      });
      
      if (response.data?.status === 'success') {
        setValidationStatus('success');
        setValidationMessage(response.data.message || 'Koneksi dan bucket valid!');
      } else {
        setValidationStatus('error');
        setValidationMessage(response.data?.message || 'Tidak dapat terhubung ke InfluxDB');
      }
    } catch (error: any) {
      console.error('Error validating connection:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Terjadi kesalahan saat validasi';
      setValidationStatus('error');
      setValidationMessage(errorMsg);
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
    
    setIsSubmitting(true);
    try {
      // Konversi data form ke format yang diharapkan oleh API
      const dataSourceData = {
        name: formData.name,
        url: formData.url,
        type: 'influxdb',
        token: formData.token,
        organization: formData.organization,
        database: formData.bucket,
        isDefault: formData.isDefault
      };
      
      if (isEditMode) {
        await updateDataSource(id!, dataSourceData);
      } else {
        await createDataSource(dataSourceData);
      }
      
      navigate('/connections/data-sources');
    } catch (error) {
      console.error('Error saving data source:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-800">
          {isEditMode ? 'Edit InfluxDB Data Source' : 'Tambah InfluxDB Data Source'}
        </h1>
        <p className="text-gray-600 mt-1">
          {isEditMode
            ? 'Update konfigurasi koneksi InfluxDB Anda'
            : 'Konfigurasikan koneksi ke database InfluxDB untuk pengambilan data'}
        </p>
      </div>

      {/* Loading state */}
      {isLoadingData && (
        <div className="flex justify-center items-center py-10">
          <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
          </svg>
          <span className="ml-2 text-blue-600 font-medium">Memuat data...</span>
        </div>
      )}
      
      {/* Form */}
      {!isLoadingData && (
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm space-y-6">
          {/* Basic Settings */}
        <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-800 border-b pb-2">Basic Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nama */}
          <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Data Source <span className="text-red-500">*</span></label>
            <input
                  type="text"
              name="name"
              value={formData.name}
                  onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Contoh: InfluxDB Production"
            />
          </div>
              {/* URL */}
          <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL <span className="text-red-500">*</span></label>
            <input
                  type="url"
              name="url"
              value={formData.url}
                  onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="http://localhost:8086"
            />
          </div>
              {/* Organization */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="organization"
                  value={formData.organization}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Contoh: my-org"
                />
              </div>
              {/* Token */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Token <span className="text-red-500">*</span></label>
                <input
                  type="password"
                  name="token"
                  value={formData.token}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Token akses InfluxDB"
                />
              </div>
              {/* Bucket */}
          <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bucket <span className="text-red-500">*</span></label>
            <input
              type="text"
                  name="bucket"
                  value={formData.bucket}
                  onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Contoh: my-bucket"
            />
                <p className="mt-1 text-xs text-gray-500">Nama bucket yang akan digunakan untuk query data</p>
          </div>
              {/* Default Data Source */}
              <div className="flex items-center mt-6">
            <input
                  type="checkbox"
                  name="isDefault"
                  checked={formData.isDefault}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Jadikan sebagai Data Source Default
              </label>
            </div>
          </div>
        </div>
        
          {/* Test Connection Button */}
          <div>
            <button
              type="button"
              onClick={handleTestConnection}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={validationStatus === 'validating'}
            >
              {validationStatus === 'validating' ? 'Menguji...' : 'Test Koneksi & Bucket'}
            </button>
            {validationMessage && (
              <p className={`mt-2 text-sm ${
                validationStatus === 'success' ? 'text-green-600' : 
                validationStatus === 'error' ? 'text-red-600' : 
                'text-gray-500'
          }`}>
            {validationMessage}
              </p>
            )}
          </div>
        
        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate('/connections/data-sources')}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Batal
          </button>
          <button
            type="submit"
              className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Menyimpan...' : isEditMode ? 'Update' : 'Simpan'}
          </button>
        </div>
      </form>
      )}
    </div>
  );
};

export default InfluxDBForm; 