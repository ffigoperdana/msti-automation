import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// Interface untuk data Server Script
interface ServerScript {
  id: string;
  name: string;
  description: string;
  scriptPath: string;
  webhookUrl: string;
  type: 'playbook' | 'adhoc' | 'module';
  targetConfig: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
  lastRun?: string;
  lastRunStatus?: 'success' | 'failed' | 'running' | 'pending';
}

// Data dummy untuk daftar server script
const MOCK_SCRIPTS: ServerScript[] = [
  {
    id: '1',
    name: 'Deploy Web App',
    description: 'Script untuk deploy aplikasi web',
    scriptPath: '/var/ansible/scripts/deploy_web.sh',
    webhookUrl: 'https://hooks.example.com/ansible/deploy-web',
    type: 'playbook',
    targetConfig: 'Production Config',
    status: 'active',
    createdAt: '2025-04-15T12:00:00Z',
    updatedAt: '2025-04-18T10:30:00Z',
    lastRun: '2025-04-18T10:30:00Z',
    lastRunStatus: 'success'
  },
  {
    id: '2',
    name: 'Update Database Config',
    description: 'Script untuk mengupdate konfigurasi database',
    scriptPath: '/var/ansible/scripts/update_db_config.sh',
    webhookUrl: 'https://hooks.example.com/ansible/update-db',
    type: 'playbook',
    targetConfig: 'Database Config',
    status: 'active',
    createdAt: '2025-04-16T09:15:00Z',
    updatedAt: '2025-04-17T14:20:00Z',
    lastRun: '2025-04-17T14:20:00Z',
    lastRunStatus: 'success'
  },
  {
    id: '3',
    name: 'Restart Services',
    description: 'Script untuk restart layanan pada server',
    scriptPath: '/var/ansible/scripts/restart_services.sh',
    webhookUrl: 'https://hooks.example.com/ansible/restart',
    type: 'adhoc',
    targetConfig: 'Web Servers Config',
    status: 'active',
    createdAt: '2025-04-14T16:45:00Z',
    updatedAt: '2025-04-19T11:10:00Z',
    lastRun: '2025-04-19T11:10:00Z',
    lastRunStatus: 'failed'
  },
  {
    id: '4',
    name: 'Check Disk Space',
    description: 'Script untuk memeriksa ruang disk pada semua server',
    scriptPath: '/var/ansible/scripts/check_disk.sh',
    webhookUrl: 'https://hooks.example.com/ansible/check-disk',
    type: 'module',
    targetConfig: 'All Servers',
    status: 'active',
    createdAt: '2025-04-13T08:30:00Z',
    updatedAt: '2025-04-16T09:40:00Z',
    lastRun: '2025-04-20T07:15:00Z',
    lastRunStatus: 'running'
  },
  {
    id: '5',
    name: 'Backup Database',
    description: 'Script untuk backup database secara otomatis',
    scriptPath: '/var/ansible/scripts/backup_db.sh',
    webhookUrl: 'https://hooks.example.com/ansible/backup-db',
    type: 'playbook',
    targetConfig: 'Database Config',
    status: 'inactive',
    createdAt: '2025-04-12T11:20:00Z',
    updatedAt: '2025-04-14T13:30:00Z'
  }
];

const ServerList: React.FC = () => {
  const [scripts, setScripts] = useState<ServerScript[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Simulasi fetching data dari API
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Simulasi loading delay
        await new Promise(resolve => setTimeout(resolve, 800));
        setScripts(MOCK_SCRIPTS);
      } catch (error) {
        console.error('Error fetching scripts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter scripts berdasarkan pencarian dan filter
  const filteredScripts = scripts.filter(script => {
    const matchesSearch = 
      script.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      script.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      script.scriptPath.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = 
      typeFilter === 'all' || script.type === typeFilter;
    
    const matchesStatus = 
      statusFilter === 'all' || script.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // Mendapatkan label untuk tipe script
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'playbook':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">Playbook</span>;
      case 'adhoc':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Ad-hoc</span>;
      case 'module':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">Module</span>;
      default:
        return null;
    }
  };

  // Mendapatkan label untuk status terakhir
  const getLastRunStatusLabel = (status?: string) => {
    if (!status) return null;

    switch (status) {
      case 'success':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Berhasil</span>;
      case 'failed':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Gagal</span>;
      case 'running':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 flex items-center">
            <svg className="animate-spin -ml-0.5 mr-1.5 h-2 w-2 text-blue-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Berjalan
          </span>
        );
      case 'pending':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Menunggu</span>;
      default:
        return null;
    }
  };

  // Menangani duplikasi script
  const handleDuplicateScript = (id: string) => {
    const scriptToDuplicate = scripts.find(script => script.id === id);
    if (!scriptToDuplicate) return;

    const newScript = {
      ...scriptToDuplicate,
      id: Date.now().toString(),
      name: `${scriptToDuplicate.name} (Copy)`,
      webhookUrl: `${scriptToDuplicate.webhookUrl}-copy`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastRun: undefined,
      lastRunStatus: undefined
    };

    setScripts(prev => [...prev, newScript]);
  };

  // Format tanggal
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Menangani trigger webhook
  const handleTriggerWebhook = (id: string) => {
    alert(`Webhoo untuk script dengan ID ${id} telah dipicu!`);
    
    // Di aplikasi nyata, kita akan mengirim permintaan ke server untuk memicu webhook
    // Dan memperbarui status pada tampilan
    
    setScripts(prev => 
      prev.map(script => {
        if (script.id === id) {
          return {
            ...script,
            lastRun: new Date().toISOString(),
            lastRunStatus: 'running',
            updatedAt: new Date().toISOString()
          };
        }
        return script;
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <h1 className="text-2xl font-semibold text-gray-800">Server Scripts Ansible</h1>
          <Link 
            to="/automation/ansible/server/new" 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah Server Script
          </Link>
        </div>
        
        {/* Search and Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-grow max-w-md">
            <input
              type="text"
              placeholder="Cari script..."
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
          
          <div className="flex-shrink-0">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Semua Tipe</option>
              <option value="playbook">Playbook</option>
              <option value="adhoc">Ad-hoc</option>
              <option value="module">Module</option>
            </select>
          </div>
          
          <div className="flex-shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Tidak Aktif</option>
            </select>
          </div>
          
          <div className="flex items-center">
            <span className="text-sm text-gray-500">
              Menampilkan {filteredScripts.length} dari {scripts.length} script
            </span>
          </div>
        </div>
      </div>
      
      {/* Scripts List */}
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
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Script</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipe</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target Config</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Terakhir Dijalankan</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredScripts.map((script) => (
                  <tr key={script.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{script.name}</div>
                      <div className="text-sm text-gray-500">{script.description}</div>
                      <div className="mt-1">
                        <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{script.scriptPath}</code>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getTypeLabel(script.type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {script.targetConfig}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {script.status === 'active' ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Aktif</span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">Tidak Aktif</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{formatDate(script.lastRun)}</div>
                      {script.lastRunStatus && (
                        <div className="mt-1">{getLastRunStatusLabel(script.lastRunStatus)}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleTriggerWebhook(script.id)}
                          disabled={script.status === 'inactive' || script.lastRunStatus === 'running'}
                          className={`px-3 py-1 rounded ${
                            script.status === 'inactive' || script.lastRunStatus === 'running'
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                          }`}
                          title={script.status === 'inactive' ? 'Script tidak aktif' : 'Jalankan script'}
                        >
                          Jalankan
                        </button>
                        <button
                          onClick={() => handleDuplicateScript(script.id)}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                          title="Duplikasi script"
                        >
                          Duplikat
                        </button>
                        <Link
                          to={`/automation/ansible/server/edit/${script.id}`}
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
          {filteredScripts.length === 0 && (
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
                  d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
                />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">Tidak ada script yang ditemukan</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || typeFilter !== 'all' || statusFilter !== 'all'
                  ? 'Coba sesuaikan kriteria pencarian Anda'
                  : 'Mulai dengan menambahkan script server Ansible baru'}
              </p>
              {!searchTerm && typeFilter === 'all' && statusFilter === 'all' && (
                <Link
                  to="/automation/ansible/server/new"
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
                  Tambah Server Script
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ServerList; 