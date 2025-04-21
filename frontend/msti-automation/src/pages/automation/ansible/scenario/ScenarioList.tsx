import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// Interface untuk tipe data Ansible Scenario
interface AnsibleScenario {
  id: string;
  name: string;
  description: string;
  configId: string;
  playbookFile: string;
  inventoryId?: string;
  tags?: string[];
  status: 'active' | 'inactive' | 'draft';
  lastRun?: string;
  createdAt: string;
  updatedAt: string;
}

// Data dummy untuk konfigurasi
const MOCK_CONFIGS: Record<string, string> = {
  '1': 'Default Config',
  '2': 'Staging Config',
  '3': 'Production Config'
};

// Data dummy untuk inventory
const MOCK_INVENTORIES: Record<string, string> = {
  '1': 'Web Servers',
  '2': 'Database Servers',
  '3': 'Load Balancers'
};

// Data dummy untuk skenario
const MOCK_SCENARIOS: AnsibleScenario[] = [
  {
    id: '1',
    name: 'Deploy Web Application',
    description: 'Menerapkan aplikasi web ke server produksi',
    configId: '3',
    playbookFile: 'deploy_web.yml',
    inventoryId: '1',
    tags: ['deploy', 'web', 'production'],
    status: 'active',
    lastRun: '2024-04-15T14:30:00Z',
    createdAt: '2024-04-01T10:00:00Z',
    updatedAt: '2024-04-15T14:30:00Z'
  },
  {
    id: '2',
    name: 'Database Backup',
    description: 'Melakukan backup database secara otomatis',
    configId: '2',
    playbookFile: 'backup_db.yml',
    inventoryId: '2',
    tags: ['backup', 'database', 'scheduled'],
    status: 'active',
    lastRun: '2024-04-20T02:00:00Z',
    createdAt: '2024-04-05T11:20:00Z',
    updatedAt: '2024-04-20T02:00:00Z'
  },
  {
    id: '3',
    name: 'Server Patching',
    description: 'Menerapkan patch keamanan ke semua server',
    configId: '1',
    playbookFile: 'security_patch.yml',
    status: 'draft',
    createdAt: '2024-04-18T09:15:00Z',
    updatedAt: '2024-04-18T09:15:00Z'
  },
  {
    id: '4',
    name: 'Load Balancer Configuration',
    description: 'Mengkonfigurasi pengaturan load balancer',
    configId: '3',
    playbookFile: 'lb_config.yml',
    inventoryId: '3',
    tags: ['config', 'network', 'load-balancer'],
    status: 'inactive',
    lastRun: '2024-04-10T16:45:00Z',
    createdAt: '2024-04-08T13:30:00Z',
    updatedAt: '2024-04-12T10:20:00Z'
  }
];

const ScenarioList: React.FC = () => {
  const [scenarios, setScenarios] = useState<AnsibleScenario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [configFilter, setConfigFilter] = useState<string>('all');

  // Simulasi fetch data dari API
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Simulasi network delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        setScenarios(MOCK_SCENARIOS);
      } catch (error) {
        console.error('Error fetching scenarios:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter skenario berdasarkan pencarian dan filter
  const filteredScenarios = scenarios.filter(scenario => {
    const matchesSearch = 
      scenario.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scenario.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (scenario.tags && scenario.tags.some(tag => 
        tag.toLowerCase().includes(searchTerm.toLowerCase())));
    
    const matchesStatus = 
      statusFilter === 'all' || scenario.status === statusFilter;
    
    const matchesConfig = 
      configFilter === 'all' || scenario.configId === configFilter;
    
    return matchesSearch && matchesStatus && matchesConfig;
  });

  // Format tanggal
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Render badge status
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Aktif</span>;
      case 'inactive':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Tidak Aktif</span>;
      case 'draft':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">Draft</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Skenario Ansible</h1>
          <p className="text-gray-600 mt-1">Kelola skenario otomatisasi menggunakan Ansible</p>
        </div>
        <Link 
          to="/automation/ansible/scenario/new" 
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Buat Skenario Baru
        </Link>
      </div>
      
      {/* Filter dan Pencarian */}
      <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div className="w-full md:w-1/3">
            <label htmlFor="search" className="sr-only">Cari</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                id="search"
                name="search"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Cari berdasarkan nama, deskripsi, atau tag"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-auto">
              <select
                id="status-filter"
                name="status-filter"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Tidak Aktif</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            
            <div className="w-full md:w-auto">
              <select
                id="config-filter"
                name="config-filter"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={configFilter}
                onChange={(e) => setConfigFilter(e.target.value)}
              >
                <option value="all">Semua Konfigurasi</option>
                {Object.entries(MOCK_CONFIGS).map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabel Skenario */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="flex items-center space-x-2">
              <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-gray-600">Memuat skenario...</span>
            </div>
          </div>
        ) : filteredScenarios.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">Tidak ada skenario yang ditemukan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Skenario</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Konfigurasi</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Playbook</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Terakhir Dijalankan</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dibuat Pada</th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredScenarios.map(scenario => (
                  <tr key={scenario.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{scenario.name}</div>
                      <div className="text-sm text-gray-500">{scenario.description}</div>
                      {scenario.tags && scenario.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {scenario.tags.map(tag => (
                            <span key={tag} className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {MOCK_CONFIGS[scenario.configId] || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {scenario.playbookFile}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderStatusBadge(scenario.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {scenario.lastRun ? formatDate(scenario.lastRun) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(scenario.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex space-x-2 justify-end">
                        <Link 
                          to={`/automation/ansible/scenario/${scenario.id}/run`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Jalankan
                        </Link>
                        <Link 
                          to={`/automation/ansible/scenario/${scenario.id}`}
                          className="text-blue-600 hover:text-blue-900"
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
        )}
      </div>
    </div>
  );
};

export default ScenarioList; 