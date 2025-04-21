import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// Data dummy untuk konfigurasi yang tersedia
const MOCK_CONFIGS = [
  { id: '1', name: 'Production Config' },
  { id: '2', name: 'Staging Config' },
  { id: '3', name: 'Development Config' },
  { id: '4', name: 'Database Config' },
  { id: '5', name: 'Web Servers Config' }
];

// Data dummy untuk inventory yang tersedia
const MOCK_INVENTORIES = [
  { id: '1', name: 'Web Servers' },
  { id: '2', name: 'Database Servers' },
  { id: '3', name: 'Load Balancers' }
];

// Data dummy untuk skenario yang tersedia
const MOCK_SCENARIOS = [
  { id: '1', name: 'Deploy Web App' },
  { id: '2', name: 'Update Database' },
  { id: '3', name: 'Restart Services' },
  { id: '4', name: 'Backup Database' }
];

// Interface untuk server script
interface ServerScript {
  id: string;
  name: string;
  description: string;
  type: string;
  targetConfigId: string;
  targetInventoryId: string;
  targetScenarioId: string;
  scriptContent: string;
  webhookKey: string;
  status: 'active' | 'inactive';
}

// Data dummy untuk script yang sudah ada (untuk edit mode)
const EXISTING_SERVER_SCRIPT: ServerScript = {
  id: '1',
  name: 'Deploy Web App',
  description: 'Script untuk deploy aplikasi web secara otomatis',
  type: 'playbook',
  targetConfigId: '1',
  targetInventoryId: '1',
  targetScenarioId: '1',
  scriptContent: `#!/bin/bash

# Script untuk deploy aplikasi web menggunakan Ansible
# Dibuat otomatis oleh MSTI Automation Platform

# Variabel
CONFIG_PATH="/etc/ansible/ansible.cfg"
INVENTORY_PATH="/etc/ansible/inventory/web"
PLAYBOOK_PATH="/etc/ansible/playbooks/deploy_web.yml"

# Log
echo "[$(date)] Memulai deployment web application"

# Jalankan Ansible Playbook
ansible-playbook -i "$INVENTORY_PATH" "$PLAYBOOK_PATH" \\
  --extra-vars "env=production version=$VERSION" \\
  --verbose

# Cek status
if [ $? -eq 0 ]; then
  echo "[$(date)] Deployment berhasil diselesaikan"
  exit 0
else
  echo "[$(date)] Deployment gagal"
  exit 1
fi
`,
  webhookKey: 'securewebhookkey123',
  status: 'active'
};

interface ValidationErrors {
  name?: string;
  scriptContent?: string;
  targetConfigId?: string;
  targetScenarioId?: string;
}

const ServerForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = id !== 'new' && id !== undefined;
  
  // State untuk form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('playbook');
  const [targetConfigId, setTargetConfigId] = useState('');
  const [targetInventoryId, setTargetInventoryId] = useState('');
  const [targetScenarioId, setTargetScenarioId] = useState('');
  const [scriptContent, setScriptContent] = useState('');
  const [webhookKey, setWebhookKey] = useState('');
  const [status, setStatus] = useState('active');
  
  // State tambahan
  const [webhookUrl, setWebhookUrl] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWebhookInfo, setShowWebhookInfo] = useState(false);
  
  // Load data saat edit mode
  useEffect(() => {
    if (isEditMode) {
      // Di dunia nyata, kita akan melakukan fetch ke API berdasarkan ID
      // Simulasi loading data
      const loadServerScript = async () => {
        // Simulasi network delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setName(EXISTING_SERVER_SCRIPT.name);
        setDescription(EXISTING_SERVER_SCRIPT.description);
        setType(EXISTING_SERVER_SCRIPT.type);
        setTargetConfigId(EXISTING_SERVER_SCRIPT.targetConfigId);
        setTargetInventoryId(EXISTING_SERVER_SCRIPT.targetInventoryId);
        setTargetScenarioId(EXISTING_SERVER_SCRIPT.targetScenarioId);
        setScriptContent(EXISTING_SERVER_SCRIPT.scriptContent);
        setWebhookKey(EXISTING_SERVER_SCRIPT.webhookKey);
        setStatus(EXISTING_SERVER_SCRIPT.status);
      };
      
      loadServerScript();
    } else {
      // Set default values untuk form baru
      generateDefaultScript();
      generateWebhookKey();
    }
  }, [isEditMode, id]);
  
  // Update webhook URL ketika name atau webhook key berubah
  useEffect(() => {
    if (name && webhookKey) {
      const baseUrl = window.location.origin;
      const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      setWebhookUrl(`${baseUrl}/api/webhook/ansible/${sanitizedName}/${webhookKey}`);
    }
  }, [name, webhookKey]);
  
  // Menghasilkan script default berdasarkan tipe, konfigurasi, dan skenario yang dipilih
  const generateDefaultScript = () => {
    const selectedConfig = MOCK_CONFIGS.find(config => config.id === targetConfigId)?.name || '[CONFIG_NAME]';
    const selectedScenario = MOCK_SCENARIOS.find(scenario => scenario.id === targetScenarioId)?.name || '[SCENARIO_NAME]';
    
    let scriptTemplate = `#!/bin/bash

# Script untuk menjalankan Ansible ${type === 'playbook' ? 'playbook' : type === 'adhoc' ? 'ad-hoc command' : 'module'}
# Dibuat otomatis oleh MSTI Automation Platform

# Variabel
CONFIG_PATH="/etc/ansible/ansible.cfg"
`;

    if (type === 'playbook') {
      scriptTemplate += `INVENTORY_PATH="/etc/ansible/inventory/default"
PLAYBOOK_PATH="/etc/ansible/playbooks/main.yml"

# Log
echo "[$(date)] Memulai eksekusi playbook untuk ${selectedScenario}"

# Jalankan Ansible Playbook
ansible-playbook -i "$INVENTORY_PATH" "$PLAYBOOK_PATH" \\
  --extra-vars "config=${selectedConfig}" \\
  --verbose

`;
    } else if (type === 'adhoc') {
      scriptTemplate += `INVENTORY_PATH="/etc/ansible/inventory/default"

# Log
echo "[$(date)] Memulai eksekusi ad-hoc command untuk ${selectedScenario}"

# Jalankan Ansible Ad-hoc Command
ansible all -i "$INVENTORY_PATH" \\
  -m shell -a "echo 'Testing connection at $(date)'" \\
  --verbose

`;
    } else if (type === 'module') {
      scriptTemplate += `INVENTORY_PATH="/etc/ansible/inventory/default"

# Log
echo "[$(date)] Memulai eksekusi module untuk ${selectedScenario}"

# Jalankan Ansible Module
ansible all -i "$INVENTORY_PATH" \\
  -m setup \\
  --verbose

`;
    }

    scriptTemplate += `# Cek status
if [ $? -eq 0 ]; then
  echo "[$(date)] Eksekusi berhasil diselesaikan"
  exit 0
else
  echo "[$(date)] Eksekusi gagal"
  exit 1
fi
`;

    setScriptContent(scriptTemplate);
  };

  // Menghasilkan webhook key baru
  const generateWebhookKey = () => {
    const randomKey = Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);
    setWebhookKey(randomKey);
  };
  
  // Validasi form
  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};
    
    if (!name.trim()) {
      errors.name = 'Nama script harus diisi';
    }
    
    if (!scriptContent.trim()) {
      errors.scriptContent = 'Konten script harus diisi';
    }
    
    if (!targetConfigId) {
      errors.targetConfigId = 'Konfigurasi target harus dipilih';
    }
    
    if (type === 'playbook' && !targetScenarioId) {
      errors.targetScenarioId = 'Skenario harus dipilih untuk tipe playbook';
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
        type,
        targetConfigId,
        targetInventoryId: targetInventoryId || undefined,
        targetScenarioId: type === 'playbook' ? targetScenarioId : undefined,
        scriptContent,
        webhookKey,
        webhookUrl,
        status
      });
      
      // Redirect ke halaman list setelah berhasil
      navigate('/automation/ansible/server');
      
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
          {isEditMode ? 'Edit Server Script' : 'Buat Server Script Baru'}
        </h1>
        <p className="text-gray-600 mt-1">
          {isEditMode 
            ? 'Ubah pengaturan dan konten script server Ansible' 
            : 'Buat script baru untuk mengeksekusi Ansible melalui webhook'}
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
              Nama Script <span className="text-red-500">*</span>
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
              placeholder="Masukkan nama script"
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
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Deskripsi singkat tentang script ini"
            />
          </div>
          
          {/* Tipe */}
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700">
              Tipe Script
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                if (e.target.value !== 'playbook') {
                  setTargetScenarioId('');
                }
                generateDefaultScript();
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="playbook">Playbook</option>
              <option value="adhoc">Ad-hoc Command</option>
              <option value="module">Module</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {type === 'playbook' 
                ? 'Menjalankan playbook Ansible lengkap.' 
                : type === 'adhoc' 
                  ? 'Menjalankan perintah ad-hoc pada host target.' 
                  : 'Menjalankan module Ansible tertentu tanpa playbook.'}
            </p>
          </div>
          
          {/* Konfigurasi Target */}
          <div>
            <label htmlFor="targetConfigId" className="block text-sm font-medium text-gray-700">
              Konfigurasi Target <span className="text-red-500">*</span>
            </label>
            <select
              id="targetConfigId"
              value={targetConfigId}
              onChange={(e) => {
                setTargetConfigId(e.target.value);
                generateDefaultScript();
              }}
              className={`w-full px-3 py-2 border ${
                validationErrors.targetConfigId
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              }`}
            >
              <option value="">Pilih Konfigurasi</option>
              {MOCK_CONFIGS.map(config => (
                <option key={config.id} value={config.id}>{config.name}</option>
              ))}
            </select>
            {validationErrors.targetConfigId && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.targetConfigId}</p>
            )}
          </div>
          
          {/* Inventory Target (opsional) */}
          <div>
            <label htmlFor="targetInventoryId" className="block text-sm font-medium text-gray-700">
              Inventory Target
            </label>
            <select
              id="targetInventoryId"
              value={targetInventoryId}
              onChange={(e) => setTargetInventoryId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          
          {/* Skenario Target (hanya untuk tipe playbook) */}
          {type === 'playbook' && (
            <div>
              <label htmlFor="targetScenarioId" className="block text-sm font-medium text-gray-700">
                Skenario Target <span className="text-red-500">*</span>
              </label>
              <select
                id="targetScenarioId"
                value={targetScenarioId}
                onChange={(e) => {
                  setTargetScenarioId(e.target.value);
                  generateDefaultScript();
                }}
                className={`w-full px-3 py-2 border ${
                  validationErrors.targetScenarioId
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                }`}
              >
                <option value="">Pilih Skenario</option>
                {MOCK_SCENARIOS.map(scenario => (
                  <option key={scenario.id} value={scenario.id}>{scenario.name}</option>
                ))}
              </select>
              {validationErrors.targetScenarioId && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.targetScenarioId}</p>
              )}
            </div>
          )}
          
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
              <option value="active">Aktif</option>
              <option value="inactive">Tidak Aktif</option>
            </select>
          </div>
        </div>
        
        {/* Webhook Configuration */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-800 border-b pb-2">Konfigurasi Webhook</h2>
            <button
              type="button"
              onClick={() => setShowWebhookInfo(!showWebhookInfo)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showWebhookInfo ? 'Sembunyikan Info' : 'Tampilkan Info'}
            </button>
          </div>
          
          {/* Webhook Info */}
          {showWebhookInfo && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="text-sm font-medium text-blue-800">Apa itu Webhook?</h3>
              <p className="mt-1 text-sm text-blue-600">
                Webhook adalah URL yang dapat dipanggil untuk memicu eksekusi script Ansible secara otomatis.
                Anda dapat mengintegrasikannya dengan sistem CI/CD, monitoring, atau alat otomatisasi lainnya.
              </p>
              <h3 className="mt-3 text-sm font-medium text-blue-800">Cara Menggunakan:</h3>
              <code className="mt-1 block text-xs bg-blue-100 p-2 rounded text-blue-800">
                curl -X POST {webhookUrl || 'https://example.com/api/webhook/ansible/[name]/[key]'} -H "Content-Type: application/json" -d {"'"}{"{"}"param1": "value1"{"}"}{"'"}
              </code>
            </div>
          )}
          
          {/* Webhook Key */}
          <div>
            <label htmlFor="webhookKey" className="block text-sm font-medium text-gray-700">
              Webhook Key
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <input
                type="text"
                id="webhookKey"
                value={webhookKey}
                onChange={(e) => setWebhookKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="webhook-secret-key"
              />
              <button
                type="button"
                onClick={generateWebhookKey}
                className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 sm:text-sm hover:bg-gray-100"
              >
                Generate
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Key rahasia untuk mengamankan endpoint webhook Anda.
            </p>
          </div>
          
          {/* Webhook URL (generated, read-only) */}
          {webhookUrl && (
            <div>
              <label htmlFor="webhookUrl" className="block text-sm font-medium text-gray-700">
                Webhook URL
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type="text"
                  id="webhookUrl"
                  value={webhookUrl}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(webhookUrl);
                    alert('URL webhook telah disalin ke clipboard');
                  }}
                  className="ml-2 inline-flex items-center px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-700 sm:text-sm hover:bg-gray-50"
                >
                  Salin
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                URL webhook yang akan dihasilkan setelah script disimpan.
              </p>
            </div>
          )}
        </div>
        
        {/* Script Content */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-800 border-b pb-2">Konten Script</h2>
          
          <div>
            <div className="flex justify-between">
              <label htmlFor="scriptContent" className="block text-sm font-medium text-gray-700">
                Script Bash (.sh) <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={generateDefaultScript}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Generate Template
              </button>
            </div>
            <textarea
              id="scriptContent"
              value={scriptContent}
              onChange={(e) => setScriptContent(e.target.value)}
              rows={15}
              className={`w-full px-3 py-2 border ${
                validationErrors.scriptContent
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              } font-mono text-sm`}
              placeholder="#!/bin/bash\n\n# Your script content here..."
            />
            {validationErrors.scriptContent && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.scriptContent}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Script bash yang akan dijalankan ketika webhook dipanggil. Ini biasanya berisi perintah untuk menjalankan Ansible.
            </p>
          </div>
          
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <h3 className="text-sm font-medium text-yellow-800">Tips untuk Script:</h3>
            <ul className="mt-1 list-disc list-inside text-sm text-yellow-700 space-y-1">
              <li>Pastikan script dimulai dengan <code className="bg-yellow-100 px-1">#!/bin/bash</code></li>
              <li>Tambahkan logging yang memadai untuk troubleshooting</li>
              <li>Gunakan exit code yang tepat (0 untuk sukses, non-zero untuk error)</li>
              <li>Script ini akan disimpan dan dijalankan oleh server Webhook</li>
            </ul>
          </div>
        </div>
        
        {/* Tombol Aksi */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate('/automation/ansible/server')}
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
            ) : isEditMode ? 'Simpan Perubahan' : 'Buat Script'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ServerForm; 