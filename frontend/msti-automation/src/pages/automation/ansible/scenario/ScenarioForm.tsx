import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// Data dummy untuk konfigurasi
const MOCK_CONFIGS = [
  { id: '1', name: 'Default Config' },
  { id: '2', name: 'Staging Config' },
  { id: '3', name: 'Production Config' }
];

// Data dummy untuk inventory
const MOCK_INVENTORIES = [
  { id: '1', name: 'Web Servers' },
  { id: '2', name: 'Database Servers' },
  { id: '3', name: 'Load Balancers' }
];

// Data dummy untuk skenario yang sudah ada (untuk edit mode)
const EXISTING_SCENARIO = {
  id: '1',
  name: 'Deploy Web Application',
  description: 'Menerapkan aplikasi web ke server produksi',
  configId: '3',
  playbookFile: 'deploy_web.yml',
  inventoryId: '1',
  tags: ['deploy', 'web', 'production'],
  status: 'active',
  extraVars: JSON.stringify({ domain: 'example.com', port: 80 }, null, 2),
  skipTags: 'notification,debug',
  verbosity: 2
};

interface ValidationErrors {
  name?: string;
  configId?: string;
  playbookFile?: string;
  extraVars?: string;
}

const ScenarioForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = id !== 'new' && id !== undefined;

  // State untuk form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [configId, setConfigId] = useState('');
  const [playbookFile, setPlaybookFile] = useState('');
  const [inventoryId, setInventoryId] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [status, setStatus] = useState('draft');
  const [extraVars, setExtraVars] = useState('');
  const [skipTags, setSkipTags] = useState('');
  const [verbosity, setVerbosity] = useState(0);
  
  // State untuk validasi
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Load data saat edit mode
  useEffect(() => {
    if (isEditMode) {
      // Di dunia nyata, kita akan melakukan fetch ke API berdasarkan ID
      // Simulasi loading data
      const loadScenario = async () => {
        // Simulasi network delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setName(EXISTING_SCENARIO.name);
        setDescription(EXISTING_SCENARIO.description);
        setConfigId(EXISTING_SCENARIO.configId);
        setPlaybookFile(EXISTING_SCENARIO.playbookFile);
        setInventoryId(EXISTING_SCENARIO.inventoryId || '');
        setTags(EXISTING_SCENARIO.tags || []);
        setStatus(EXISTING_SCENARIO.status);
        setExtraVars(EXISTING_SCENARIO.extraVars || '');
        setSkipTags(EXISTING_SCENARIO.skipTags || '');
        setVerbosity(EXISTING_SCENARIO.verbosity || 0);
      };
      
      loadScenario();
    }
  }, [isEditMode, id]);

  // Handler untuk menambah tag
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  // Handler untuk menghapus tag
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // Handler untuk key press pada input tag
  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  // Validasi form
  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};
    
    if (!name.trim()) {
      errors.name = 'Nama skenario harus diisi';
    }
    
    if (!configId) {
      errors.configId = 'Konfigurasi harus dipilih';
    }
    
    if (!playbookFile.trim()) {
      errors.playbookFile = 'File playbook harus diisi';
    }
    
    if (extraVars.trim()) {
      try {
        JSON.parse(extraVars);
      } catch (e) {
        errors.extraVars = 'Format JSON tidak valid';
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
        configId,
        playbookFile,
        inventoryId: inventoryId || undefined,
        tags,
        status,
        extraVars: extraVars.trim() ? JSON.parse(extraVars) : undefined,
        skipTags: skipTags || undefined,
        verbosity: verbosity || undefined
      });
      
      // Redirect ke halaman list setelah berhasil
      navigate('/automation/ansible/scenario');
      
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
          {isEditMode ? 'Edit Skenario Ansible' : 'Buat Skenario Ansible Baru'}
        </h1>
        <p className="text-gray-600 mt-1">
          {isEditMode 
            ? 'Ubah pengaturan skenario otomatisasi Ansible' 
            : 'Buat skenario baru untuk otomatisasi menggunakan Ansible'}
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
              Nama Skenario <span className="text-red-500">*</span>
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
              placeholder="Masukkan nama skenario"
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
              placeholder="Deskripsi singkat tentang skenario ini"
            />
          </div>
          
          {/* Konfigurasi */}
          <div>
            <label htmlFor="configId" className="block text-sm font-medium text-gray-700">
              Konfigurasi Ansible <span className="text-red-500">*</span>
            </label>
            <select
              id="configId"
              value={configId}
              onChange={(e) => setConfigId(e.target.value)}
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                validationErrors.configId
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
            >
              <option value="">Pilih Konfigurasi</option>
              {MOCK_CONFIGS.map(config => (
                <option key={config.id} value={config.id}>{config.name}</option>
              ))}
            </select>
            {validationErrors.configId && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.configId}</p>
            )}
          </div>
          
          {/* Playbook File */}
          <div>
            <label htmlFor="playbookFile" className="block text-sm font-medium text-gray-700">
              File Playbook <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="playbookFile"
              value={playbookFile}
              onChange={(e) => setPlaybookFile(e.target.value)}
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                validationErrors.playbookFile
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
              placeholder="Contoh: deploy.yml"
            />
            {validationErrors.playbookFile && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.playbookFile}</p>
            )}
          </div>
          
          {/* Inventory */}
          <div>
            <label htmlFor="inventoryId" className="block text-sm font-medium text-gray-700">
              Inventory
            </label>
            <select
              id="inventoryId"
              value={inventoryId}
              onChange={(e) => setInventoryId(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">Gunakan Default dari Konfigurasi</option>
              {MOCK_INVENTORIES.map(inventory => (
                <option key={inventory.id} value={inventory.id}>{inventory.name}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Opsional. Jika tidak dipilih, akan menggunakan inventory default dari konfigurasi.
            </p>
          </div>
          
          {/* Tag */}
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
              Tag
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <input
                type="text"
                id="tagInput"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleTagKeyPress}
                className="flex-1 min-w-0 block w-full rounded-none rounded-l-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Tambahkan tag"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 sm:text-sm hover:bg-gray-100"
              >
                Tambah
              </button>
            </div>
            
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {tags.map(tag => (
                  <span 
                    key={tag} 
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1.5 inline-flex text-blue-400 hover:text-blue-600 focus:outline-none"
                    >
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
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
              <option value="draft">Draft</option>
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
              {/* Extra Vars */}
              <div>
                <label htmlFor="extraVars" className="block text-sm font-medium text-gray-700">
                  Extra Variables (JSON)
                </label>
                <textarea
                  id="extraVars"
                  value={extraVars}
                  onChange={(e) => setExtraVars(e.target.value)}
                  rows={5}
                  className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm font-mono ${
                    validationErrors.extraVars
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  placeholder='{ "domain": "example.com", "port": 80 }'
                />
                {validationErrors.extraVars && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.extraVars}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Variabel tambahan dalam format JSON yang akan diteruskan ke playbook.
                </p>
              </div>
              
              {/* Skip Tags */}
              <div>
                <label htmlFor="skipTags" className="block text-sm font-medium text-gray-700">
                  Skip Tags
                </label>
                <input
                  type="text"
                  id="skipTags"
                  value={skipTags}
                  onChange={(e) => setSkipTags(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Contoh: notification,debug"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Daftar tag yang akan dilewati saat menjalankan playbook (dipisahkan dengan koma).
                </p>
              </div>
              
              {/* Verbosity */}
              <div>
                <label htmlFor="verbosity" className="block text-sm font-medium text-gray-700">
                  Verbosity Level
                </label>
                <select
                  id="verbosity"
                  value={verbosity}
                  onChange={(e) => setVerbosity(parseInt(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="0">0 (Default)</option>
                  <option value="1">1 (Verbose)</option>
                  <option value="2">2 (More Verbose)</option>
                  <option value="3">3 (Debug)</option>
                  <option value="4">4 (Connection Debug)</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Level detail output yang akan ditampilkan saat menjalankan playbook.
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Tombol Aksi */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate('/automation/ansible/scenario')}
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
            ) : isEditMode ? 'Simpan Perubahan' : 'Buat Skenario'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ScenarioForm; 