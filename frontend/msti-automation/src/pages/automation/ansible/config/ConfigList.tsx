import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// Interface untuk data konfigurasi Ansible
interface AnsibleConfig {
  id: string;
  name: string;
  description: string;
  ansiblePath: string;
  playbookPath: string;
  createdAt: string;
  updatedAt: string;
  defaultInventory?: string;
}

// Data dummy untuk daftar konfigurasi
const MOCK_CONFIGS: AnsibleConfig[] = [
  {
    id: '1',
    name: 'Default Config',
    description: 'Konfigurasi default untuk server produksi',
    ansiblePath: '/usr/bin/ansible',
    playbookPath: '/etc/ansible/playbooks',
    createdAt: '2025-04-10T12:00:00Z',
    updatedAt: '2025-04-15T10:30:00Z',
    defaultInventory: '1'
  },
  {
    id: '2',
    name: 'Staging Config',
    description: 'Konfigurasi untuk server staging',
    ansiblePath: '/usr/bin/ansible',
    playbookPath: '/home/ansible/staging/playbooks',
    createdAt: '2025-04-12T09:15:00Z',
    updatedAt: '2025-04-18T14:20:00Z',
    defaultInventory: '2'
  },
  {
    id: '3',
    name: 'Development Config',
    description: 'Konfigurasi untuk server development',
    ansiblePath: '/usr/bin/ansible',
    playbookPath: '/home/ansible/dev/playbooks',
    createdAt: '2025-04-14T16:45:00Z',
    updatedAt: '2025-04-17T11:10:00Z'
  }
];

// Data dummy untuk inventory
interface InventoryItem {
  name: string;
}

interface InventoryRecord {
  [key: string]: InventoryItem;
}

const MOCK_INVENTORIES: InventoryRecord = {
  '1': { name: 'Web Servers' },
  '2': { name: 'Database Servers' },
  '3': { name: 'Load Balancers' }
};

const ConfigList: React.FC = () => {
  const [configs, setConfigs] = useState<AnsibleConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Simulasi fetching data dari API
  useEffect(() => {
    // Dalam implementasi nyata, ini akan menjadi panggilan API
    const fetchData = async () => {
      try {
        // Simulasi loading delay
        await new Promise(resolve => setTimeout(resolve, 800));
        setConfigs(MOCK_CONFIGS);
      } catch (error) {
        console.error('Error fetching configs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Helper untuk mendapatkan nama inventory default
  const getDefaultInventoryName = (inventoryId?: string) => {
    if (!inventoryId) return 'Tidak ada';
    return MOCK_INVENTORIES[inventoryId]?.name || 'Tidak diketahui';
  };

  // Filter konfigurasi berdasarkan pencarian
  const filteredConfigs = configs.filter(config => 
    config.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    config.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    config.playbookPath.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Menangani duplikasi konfigurasi
  const handleDuplicateConfig = (id: string) => {
    const configToDuplicate = configs.find(config => config.id === id);
    if (!configToDuplicate) return;

    const newConfig = {
      ...configToDuplicate,
      id: Date.now().toString(),
      name: `${configToDuplicate.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setConfigs(prev => [...prev, newConfig]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <h1 className="text-2xl font-semibold text-gray-800">Konfigurasi Ansible</h1>
          <Link 
            to="/automation/ansible/config/new" 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah Konfigurasi
          </Link>
        </div>
        
        {/* Search */}
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-grow max-w-md">
            <input
              type="text"
              placeholder="Cari konfigurasi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <svg 
              className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          <div className="flex items-center">
            <span className="text-sm text-gray-500">
              Menampilkan {filteredConfigs.length} dari {configs.length} konfigurasi
            </span>
          </div>
        </div>
      </div>
      
      {/* Configs List */}
      {isLoading ? (
        <div className="bg-white p-8 rounded-lg shadow-sm flex justify-center">
          <svg 
            className="animate-spin h-8 w-8 text-blue-500" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            ></circle>
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Konfigurasi</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Path</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inventory Default</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Terakhir Diperbarui</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredConfigs.map((config) => (
                  <tr key={config.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{config.name}</div>
                      <div className="text-sm text-gray-500">{config.description}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-900">
                        <div className="mb-1">
                          <span className="font-semibold">Ansible:</span>{' '}
                          <code className="px-1 py-0.5 bg-gray-100 rounded">{config.ansiblePath}</code>
                        </div>
                        <div>
                          <span className="font-semibold">Playbook:</span>{' '}
                          <code className="px-1 py-0.5 bg-gray-100 rounded">{config.playbookPath}</code>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getDefaultInventoryName(config.defaultInventory)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(config.updatedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleDuplicateConfig(config.id)}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                          title="Duplikasi konfigurasi"
                        >
                          Duplikat
                        </button>
                        <Link
                          to={`/automation/ansible/config/edit/${config.id}`}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Empty State */}
          {filteredConfigs.length === 0 && (
            <div className="bg-white p-8 text-center">
              <svg 
                className="mx-auto h-12 w-12 text-gray-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1} 
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">Tidak ada konfigurasi ditemukan</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm
                  ? 'Coba sesuaikan kriteria pencarian Anda'
                  : 'Mulai dengan menambahkan konfigurasi Ansible baru'}
              </p>
              {!searchTerm && (
                <Link
                  to="/automation/ansible/config/new"
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <svg 
                    className="-ml-1 mr-2 h-5 w-5" 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 20 20" 
                    fill="currentColor" 
                    aria-hidden="true"
                  >
                    <path 
                      fillRule="evenodd" 
                      d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" 
                      clipRule="evenodd" 
                    />
                  </svg>
                  Tambah Konfigurasi
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConfigList;