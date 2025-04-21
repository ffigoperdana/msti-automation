import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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

const InfluxDBForm: React.FC = () => {
  const navigate = useNavigate();
  
  // State untuk data form
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
  
  // State untuk validasi dan loading
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'none' | 'success' | 'error'>('none');
  const [validationMessage, setValidationMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Handler untuk perubahan input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setFormData({
        ...formData,
        [name]: checkbox.checked
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };
  
  // Handler untuk test connection
  const handleTestConnection = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsValidating(true);
    setValidationStatus('none');
    setValidationMessage('');
    
    // Validasi form
    if (!formData.name.trim()) {
      setValidationStatus('error');
      setValidationMessage('Nama koneksi harus diisi');
      setIsValidating(false);
      return;
    }
    
    if (!formData.url.trim() || !formData.url.startsWith('http')) {
      setValidationStatus('error');
      setValidationMessage('URL tidak valid. Harus diawali dengan http:// atau https://');
      setIsValidating(false);
      return;
    }
    
    if (formData.authType === 'token' && !formData.token) {
      setValidationStatus('error');
      setValidationMessage('API Token harus diisi untuk autentikasi token');
      setIsValidating(false);
      return;
    }
    
    if (formData.authType === 'basic' && (!formData.username || !formData.password)) {
      setValidationStatus('error');
      setValidationMessage('Username dan password harus diisi untuk autentikasi basic');
      setIsValidating(false);
      return;
    }
    
    if (!formData.organization.trim()) {
      setValidationStatus('error');
      setValidationMessage('Organization harus diisi');
      setIsValidating(false);
      return;
    }
    
    if (!formData.defaultBucket.trim()) {
      setValidationStatus('error');
      setValidationMessage('Default bucket harus diisi');
      setIsValidating(false);
      return;
    }
    
    // Simulasi API call untuk validasi koneksi
    setTimeout(() => {
      // Hasil simulasi - sukses 70% dari waktu
      if (Math.random() > 0.3) {
        setValidationStatus('success');
        setValidationMessage('Koneksi ke InfluxDB berhasil dibuat');
      } else {
        setValidationStatus('error');
        setValidationMessage('Gagal terhubung ke InfluxDB. Periksa kembali URL dan kredensial Anda');
      }
      setIsValidating(false);
    }, 1500);
  };
  
  // Handler untuk submit form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Simulasi API call
    setTimeout(() => {
      console.log('Saving InfluxDB connection:', formData);
      setIsSaving(false);
      navigate('/connections/data-sources');
    }, 1000);
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-800">Tambah Data Source InfluxDB</h1>
        <p className="text-gray-600 mt-1">
          Hubungkan ke InfluxDB untuk mengumpulkan dan menampilkan metrik Anda
        </p>
      </div>
      
      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm space-y-6">
        {/* Connection Details */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-800 border-b pb-2">Detail Koneksi</h2>
          
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nama <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="InfluxDB Production"
            />
            <p className="mt-1 text-xs text-gray-500">
              Nama untuk identifikasi sumber data ini
            </p>
          </div>
          
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
              URL <span className="text-red-500">*</span>
            </label>
            <input
              id="url"
              name="url"
              type="text"
              value={formData.url}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="http://localhost:8086"
            />
            <p className="mt-1 text-xs text-gray-500">
              URL InfluxDB. Gunakan http://localhost:8086 untuk koneksi lokal
            </p>
          </div>
          
          <div>
            <label htmlFor="isDefault" className="flex items-center">
              <input
                id="isDefault"
                name="isDefault"
                type="checkbox"
                checked={formData.isDefault}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">Gunakan sebagai data source default</span>
            </label>
          </div>
        </div>
        
        {/* Authentication */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-800 border-b pb-2">Autentikasi</h2>
          
          <div>
            <label htmlFor="authType" className="block text-sm font-medium text-gray-700 mb-1">
              Tipe Autentikasi
            </label>
            <select
              id="authType"
              name="authType"
              value={formData.authType}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="token">Token</option>
              <option value="basic">Basic Auth (Username/Password)</option>
              <option value="none">Tanpa Autentikasi</option>
            </select>
          </div>
          
          {formData.authType === 'token' && (
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-1">
                API Token <span className="text-red-500">*</span>
              </label>
              <input
                id="token"
                name="token"
                type="password"
                value={formData.token}
                onChange={handleInputChange}
                required={formData.authType === 'token'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="xxxxxxxxxxxxxxxxx"
              />
              <p className="mt-1 text-xs text-gray-500">
                Token API InfluxDB 2.x. Dapat dibuat dari menu "Data → API Tokens"
              </p>
            </div>
          )}
          
          {formData.authType === 'basic' && (
            <>
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleInputChange}
                  required={formData.authType === 'basic'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="admin"
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required={formData.authType === 'basic'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="********"
                />
              </div>
            </>
          )}
        </div>
        
        {/* InfluxDB Details */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-800 border-b pb-2">Detail InfluxDB</h2>
          
          <div>
            <label htmlFor="organization" className="block text-sm font-medium text-gray-700 mb-1">
              Organization <span className="text-red-500">*</span>
            </label>
            <input
              id="organization"
              name="organization"
              type="text"
              value={formData.organization}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="myorg"
            />
            <p className="mt-1 text-xs text-gray-500">
              Nama organisasi di InfluxDB
            </p>
          </div>
          
          <div>
            <label htmlFor="defaultBucket" className="block text-sm font-medium text-gray-700 mb-1">
              Default Bucket <span className="text-red-500">*</span>
            </label>
            <input
              id="defaultBucket"
              name="defaultBucket"
              type="text"
              value={formData.defaultBucket}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="metrics"
            />
            <p className="mt-1 text-xs text-gray-500">
              Bucket default yang akan digunakan dalam query
            </p>
          </div>
          
          {formData.retentionPolicy !== undefined && (
            <div>
              <label htmlFor="retentionPolicy" className="block text-sm font-medium text-gray-700 mb-1">
                Retention Policy
              </label>
              <input
                id="retentionPolicy"
                name="retentionPolicy"
                type="text"
                value={formData.retentionPolicy}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="autogen"
              />
              <p className="mt-1 text-xs text-gray-500">
                Hanya untuk InfluxDB 1.x
              </p>
            </div>
          )}
        </div>
        
        {/* Query Time Range Defaults */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-800 border-b pb-2">Default Range Waktu Query</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="defaultMin" className="block text-sm font-medium text-gray-700 mb-1">
                Min Time Range
              </label>
              <input
                id="defaultMin"
                name="defaultMin"
                type="text"
                value={formData.defaultMin}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="-15m"
              />
              <p className="mt-1 text-xs text-gray-500">
                Misalnya: -15m, -1h, -1d
              </p>
            </div>
            
            <div>
              <label htmlFor="defaultMax" className="block text-sm font-medium text-gray-700 mb-1">
                Max Time Range
              </label>
              <input
                id="defaultMax"
                name="defaultMax"
                type="text"
                value={formData.defaultMax}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="now()"
              />
              <p className="mt-1 text-xs text-gray-500">
                Biasanya: now()
              </p>
            </div>
          </div>
        </div>
        
        {/* Validation Status */}
        {validationStatus !== 'none' && (
          <div className={`p-4 rounded-md text-sm ${
            validationStatus === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {validationMessage}
          </div>
        )}
        
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
            type="button"
            onClick={handleTestConnection}
            disabled={isValidating}
            className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
          >
            {isValidating ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Menguji...
              </>
            ) : (
              'Uji Koneksi'
            )}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Menyimpan...
              </>
            ) : (
              'Simpan & Uji'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InfluxDBForm; 