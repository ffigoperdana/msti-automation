import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// Data dummy untuk konfigurasi

// Data dummy untuk inventory

// Data dummy untuk skenario yang sudah ada (untuk edit mode)
const EXISTING_SCENARIO = {
  id: '1',
  name: 'Deploy Web Application',
  description: 'Menerapkan aplikasi web ke server produksi',
  tags: ['deploy', 'web', 'production'],
  status: 'active',
  playbookContent: `- name: Create interface to the router
  hosts: routers
  gather_facts: no
  tasks:
    - name: Run "create interface"
      ios_command:
        commands:
          - configure terminal
          - interface eth1/7
          - no shut
          - exit`
};

interface ValidationErrors {
  name?: string;
  playbookContent?: string;
}

const ScenarioForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = id !== 'new' && id !== undefined;

  // State untuk form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [playbookContent, setPlaybookContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [status, setStatus] = useState('draft');
  
  // State untuk validasi
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        setTags(EXISTING_SCENARIO.tags || []);
        setStatus(EXISTING_SCENARIO.status);
        setPlaybookContent(EXISTING_SCENARIO.playbookContent);
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
    
    if (!playbookContent.trim()) {
      errors.playbookContent = 'Konten playbook harus diisi';
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
        tags,
        status,
        playbookContent
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
            ? 'Ubah skenario otomatisasi Ansible' 
            : 'Buat skenario baru untuk otomatisasi menggunakan Ansible'}
        </p>
      </div>
      
      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm space-y-6">
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-800 border-b pb-2">Skenario Ansible</h2>
          
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
              className={`w-full px-3 py-2 border ${
                validationErrors.name 
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Deskripsi singkat tentang skenario ini"
            />
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="draft">Draft</option>
              <option value="active">Aktif</option>
              <option value="inactive">Tidak Aktif</option>
            </select>
          </div>
          
          {/* Playbook Content */}
          <div>
            <label htmlFor="playbookContent" className="block text-sm font-medium text-gray-700">
              Konten Playbook <span className="text-red-500">*</span>
            </label>
            <textarea
              id="playbookContent"
              value={playbookContent}
              onChange={(e) => setPlaybookContent(e.target.value)}
              rows={15}
              className={`w-full px-3 py-2 border ${
                validationErrors.playbookContent
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              } font-mono`}
              placeholder={`- name: Create interface to the router
  hosts: routers
  gather_facts: no
  tasks:
    - name: Run "create interface"
      ios_command:
        commands:
          - configure terminal
          - interface eth1/7
          - no shut
          - exit`}
            />
            {validationErrors.playbookContent && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.playbookContent}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Masukkan konten playbook dalam format YAML.
            </p>
          </div>
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