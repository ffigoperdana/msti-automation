import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// Data dummy untuk inventory
const MOCK_INVENTORIES = [
  { id: '1', name: 'Web Servers' },
  { id: '2', name: 'Database Servers' },
  { id: '3', name: 'Load Balancers' }
];

// Data dummy untuk konfigurasi yang sudah ada (untuk mode edit)
const MOCK_CONFIG_DETAILS = {
  '1': {
    name: 'Default Config',
    description: 'Konfigurasi default untuk server produksi',
    ansiblePath: '/usr/bin/ansible',
    playbookPath: '/etc/ansible/playbooks',
    defaultInventory: '1',
    extraVars: '{"environment": "production", "debug": false}',
    customOptions: '--forks=10\n--timeout=30'
  },
  '2': {
    name: 'Staging Config',
    description: 'Konfigurasi untuk server staging',
    ansiblePath: '/usr/bin/ansible',
    playbookPath: '/home/ansible/staging/playbooks',
    defaultInventory: '2',
    extraVars: '{"environment": "staging", "debug": true}',
    customOptions: '--forks=5'
  }
};

// Data dummy untuk konfigurasi yang sudah ada (untuk edit mode)
const EXISTING_CONFIG = {
  id: '1',
  name: 'Default Config',
  description: 'Konfigurasi default untuk Ansible',
  ansiblePath: '/usr/bin/ansible',
  privateKeyPath: '/home/user/.ssh/id_rsa',
  inventoryPath: '/etc/ansible/inventory',
  extraOptions: '--ssh-common-args="-o StrictHostKeyChecking=no"',
  timeout: 30,
  environment: JSON.stringify({
    ANSIBLE_HOST_KEY_CHECKING: 'False',
    ANSIBLE_STDOUT_CALLBACK: 'yaml'
  }, null, 2),
  status: 'active'
};

interface ValidationErrors {
  name?: string;
  ansiblePath?: string;
  environment?: string;
}

const ConfigForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = id !== 'new' && id !== undefined;
  
  // State untuk form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ansiblePath, setAnsiblePath] = useState('');
  const [privateKeyPath, setPrivateKeyPath] = useState('');
  const [inventoryPath, setInventoryPath] = useState('');
  const [extraOptions, setExtraOptions] = useState('');
  const [timeout, setTimeoutValue] = useState<number>(30);
  const [environment, setEnvironment] = useState('');
  const [status, setStatus] = useState('active');
  
  // State untuk validasi
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Load data saat edit mode
  useEffect(() => {
    if (isEditMode) {
      // Di dunia nyata, kita akan melakukan fetch ke API berdasarkan ID
      // Simulasi loading data
      const loadConfig = async () => {
        // Simulasi network delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setName(EXISTING_CONFIG.name);
        setDescription(EXISTING_CONFIG.description);
        setAnsiblePath(EXISTING_CONFIG.ansiblePath);
        setPrivateKeyPath(EXISTING_CONFIG.privateKeyPath);
        setInventoryPath(EXISTING_CONFIG.inventoryPath);
        setExtraOptions(EXISTING_CONFIG.extraOptions);
        setTimeoutValue(EXISTING_CONFIG.timeout);
        setEnvironment(EXISTING_CONFIG.environment);
        setStatus(EXISTING_CONFIG.status);
      };
      
      loadConfig();
    }
  }, [isEditMode, id]);

  // Validasi form
  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};
    
    if (!name.trim()) {
      errors.name = 'Nama konfigurasi harus diisi';
    }
    
    if (!ansiblePath.trim()) {
      errors.ansiblePath = 'Path Ansible harus diisi';
    }
    
    if (environment.trim()) {
      try {
        JSON.parse(environment);
      } catch (e) {
        errors.environment = 'Format JSON tidak valid';
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handler untuk submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Simulasi pengiriman data ke API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Di dunia nyata, di sini kita akan mengirim data ke backend API
      console.log('Form submitted:', {
        id: isEditMode ? id : undefined,
        name,
        description,
        ansiblePath,
        privateKeyPath: privateKeyPath || undefined,
        inventoryPath: inventoryPath || undefined,
        extraOptions: extraOptions || undefined,
        timeout,
        environment: environment.trim() ? JSON.parse(environment) : undefined,
        status
      });
      
      // Redirect ke halaman list setelah berhasil
      navigate('/automation/ansible/config');
      
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-800">
          {isEditMode ? 'Edit Konfigurasi Ansible' : 'Buat Konfigurasi Ansible Baru'}
        </h1>
        <p className="text-gray-600 mt-1">
          {isEditMode 
            ? 'Ubah pengaturan konfigurasi Ansible' 
            : 'Buat konfigurasi baru untuk menghubungkan ke Ansible'}
        </p>
      </div>
      
      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm space-y-6">
        {/* Pengaturan Dasar */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-800 border-b pb-2">Pengaturan Dasar</h2>
          
          {/* Nama */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Nama Konfigurasi <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                validationErrors.name 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
              placeholder="Masukkan nama konfigurasi"
            />
            {validationErrors.name && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
            )}
          </div>
          
          {/* Deskripsi */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Deskripsi
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Deskripsi singkat konfigurasi ini"
            />
          </div>
          
          {/* Ansible Path */}
          <div>
            <label htmlFor="ansiblePath" className="block text-sm font-medium text-gray-700">
              Path Ansible <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="ansiblePath"
              value={ansiblePath}
              onChange={(e) => setAnsiblePath(e.target.value)}
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                validationErrors.ansiblePath
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
              placeholder="/usr/bin/ansible"
            />
            {validationErrors.ansiblePath && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.ansiblePath}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Path lengkap ke executable Ansible (biasanya /usr/bin/ansible).
            </p>
          </div>
          
          {/* Private Key Path */}
          <div>
            <label htmlFor="privateKeyPath" className="block text-sm font-medium text-gray-700">
              Path Private Key SSH
            </label>
            <input
              type="text"
              id="privateKeyPath"
              value={privateKeyPath}
              onChange={(e) => setPrivateKeyPath(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="/home/user/.ssh/id_rsa"
            />
            <p className="mt-1 text-xs text-gray-500">
              Path lengkap ke file private key SSH yang akan digunakan untuk koneksi.
            </p>
          </div>
          
          {/* Inventory Path */}
          <div>
            <label htmlFor="inventoryPath" className="block text-sm font-medium text-gray-700">
              Path Inventory Default
            </label>
            <input
              type="text"
              id="inventoryPath"
              value={inventoryPath}
              onChange={(e) => setInventoryPath(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="/etc/ansible/inventory"
            />
            <p className="mt-1 text-xs text-gray-500">
              Path ke file inventory default yang akan digunakan jika tidak ada inventory khusus.
            </p>
          </div>
          
          {/* Timeout */}
          <div>
            <label htmlFor="timeout" className="block text-sm font-medium text-gray-700">
              Timeout (detik)
            </label>
            <input
              type="number"
              id="timeout"
              value={timeout}
              onChange={(e) => setTimeoutValue(parseInt(e.target.value) || 0)}
              min={0}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Batas waktu dalam detik sebelum operasi Ansible dihentikan secara paksa.
            </p>
          </div>
          
          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="active">Aktif</option>
              <option value="inactive">Tidak Aktif</option>
            </select>
          </div>
        </div>
        
        {/* Pengaturan Lanjutan (collapsible) */}
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 focus:outline-none"
          >
            <svg 
              className={`mr-2 h-4 w-4 transition-transform ${showAdvanced ? 'transform rotate-90' : ''}`} 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            Pengaturan Lanjutan
          </button>
          
          {showAdvanced && (
            <div className="space-y-4 pt-4 border-t">
              {/* Extra Options */}
              <div>
                <label htmlFor="extraOptions" className="block text-sm font-medium text-gray-700">
                  Opsi Tambahan
                </label>
                <input
                  type="text"
                  id="extraOptions"
                  value={extraOptions}
                  onChange={(e) => setExtraOptions(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="--ssh-common-args='-o StrictHostKeyChecking=no'"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Opsi tambahan command line yang akan diteruskan ke Ansible.
                </p>
              </div>
              
              {/* Environment Variables */}
              <div>
                <label htmlFor="environment" className="block text-sm font-medium text-gray-700">
                  Environment Variables (JSON)
                </label>
                <textarea
                  id="environment"
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                  rows={5}
                  className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm font-mono ${
                    validationErrors.environment
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  placeholder='{\n  "ANSIBLE_HOST_KEY_CHECKING": "False",\n  "ANSIBLE_STDOUT_CALLBACK": "yaml"\n}'
                />
                {validationErrors.environment && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.environment}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Variabel lingkungan dalam format JSON yang akan diatur saat menjalankan Ansible.
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Tombol Aksi */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate('/automation/ansible/config')}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Menyimpan...
              </span>
            ) : isEditMode ? 'Simpan Perubahan' : 'Buat Konfigurasi'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ConfigForm; 