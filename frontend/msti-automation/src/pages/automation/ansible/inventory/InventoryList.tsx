import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// Interface untuk data inventory Ansible
interface AnsibleInventory {
  id: string;
  name: string;
  description: string;
  hostCount: number;
  groupCount: number;
  path: string;
  type: 'file' | 'directory' | 'dynamic';
  createdAt: string;
  updatedAt: string;
}

// Data dummy untuk daftar inventory
const MOCK_INVENTORIES: AnsibleInventory[] = [
  {
    id: '1',
    name: 'Web Servers',
    description: 'Server web untuk aplikasi produksi',
    hostCount: 8,
    groupCount: 2,
    path: '/etc/ansible/inventory/web',
    type: 'file',
    createdAt: '2025-04-10T12:00:00Z',
    updatedAt: '2025-04-15T10:30:00Z'
  },
  {
    id: '2',
    name: 'Database Servers',
    description: 'Server database untuk aplikasi produksi dan staging',
    hostCount: 5,
    groupCount: 3,
    path: '/etc/ansible/inventory/db',
    type: 'file',
    createdAt: '2025-04-12T09:15:00Z',
    updatedAt: '2025-04-18T14:20:00Z'
  },
  {
    id: '3',
    name: 'Load Balancers',
    description: 'Load balancer untuk semua aplikasi',
    hostCount: 3,
    groupCount: 1,
    path: '/etc/ansible/inventory/lb',
    type: 'file',
    createdAt: '2025-04-14T16:45:00Z',
    updatedAt: '2025-04-17T11:10:00Z'
  },
  {
    id: '4',
    name: 'Dynamic Cloud Servers',
    description: 'Inventory dinamis untuk server cloud',
    hostCount: 12,
    groupCount: 4,
    path: '/etc/ansible/inventory/cloud.py',
    type: 'dynamic',
    createdAt: '2025-04-16T08:30:00Z',
    updatedAt: '2025-04-19T09:40:00Z'
  }
];

const InventoryList: React.FC = () => {
  const [inventories, setInventories] = useState<AnsibleInventory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'file' | 'directory' | 'dynamic'>('all');

  // Simulasi fetching data dari API
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Simulasi loading delay
        await new Promise(resolve => setTimeout(resolve, 800));
        setInventories(MOCK_INVENTORIES);
      } catch (error) {
        console.error('Error fetching inventories:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter inventory berdasarkan pencarian dan filter tipe
  const filteredInventories = inventories.filter(inventory => {
    const matchesSearch = 
      inventory.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inventory.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inventory.path.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = 
      typeFilter === 'all' || inventory.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  // Menangani duplikasi inventory
  const handleDuplicateInventory = (id: string) => {
    const inventoryToDuplicate = inventories.find(inventory => inventory.id === id);
    if (!inventoryToDuplicate) return;

    const newInventory = {
      ...inventoryToDuplicate,
      id: Date.now().toString(),
      name: `${inventoryToDuplicate.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setInventories(prev => [...prev, newInventory]);
  };

  // Menangani penghapusan inventory
  const handleDeleteInventory = (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus inventory ini?')) {
      setInventories(prev => prev.filter(inventory => inventory.id !== id));
    }
  };

  // Mendapatkan label untuk tipe inventory
  const getTypeLabel = (type: 'file' | 'directory' | 'dynamic') => {
    switch (type) {
      case 'file':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">File</span>;
      case 'directory':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Directory</span>;
      case 'dynamic':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">Dynamic</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <h1 className="text-2xl font-semibold text-gray-800">Inventory Ansible</h1>
          <Link 
            to="/automation/ansible/inventory/new" 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah Inventory
          </Link>
        </div>
        
        {/* Search and Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-grow max-w-md">
            <input
              type="text"
              placeholder="Cari inventory..."
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
              onChange={(e) => setTypeFilter(e.target.value as 'all' | 'file' | 'directory' | 'dynamic')}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Semua Tipe</option>
              <option value="file">File</option>
              <option value="directory">Directory</option>
              <option value="dynamic">Dynamic</option>
            </select>
          </div>
          
          <div className="flex items-center">
            <span className="text-sm text-gray-500">
              Menampilkan {filteredInventories.length} dari {inventories.length} inventory
            </span>
          </div>
        </div>
      </div>
      
      {/* Inventories List */}
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
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Inventory</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipe</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Host & Grup</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Path</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Terakhir Diperbarui</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInventories.map((inventory) => (
                  <tr key={inventory.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{inventory.name}</div>
                      <div className="text-sm text-gray-500">{inventory.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getTypeLabel(inventory.type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <span className="font-medium">{inventory.hostCount}</span> host
                      </div>
                      <div className="text-sm text-gray-500">
                        <span className="font-medium">{inventory.groupCount}</span> grup
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="px-2 py-1 text-xs bg-gray-100 rounded break-all">{inventory.path}</code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(inventory.updatedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleDuplicateInventory(inventory.id)}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                          title="Duplikasi inventory"
                        >
                          Duplikat
                        </button>
                        <Link
                          to={`/automation/ansible/inventory/edit/${inventory.id}`}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDeleteInventory(inventory.id)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                          title="Hapus inventory"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Empty State */}
          {filteredInventories.length === 0 && (
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
              <h3 className="mt-2 text-lg font-medium text-gray-900">Tidak ada inventory ditemukan</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || typeFilter !== 'all'
                  ? 'Coba sesuaikan kriteria pencarian Anda'
                  : 'Mulai dengan menambahkan inventory Ansible baru'}
              </p>
              {!searchTerm && typeFilter === 'all' && (
                <Link
                  to="/automation/ansible/inventory/new"
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
                  Tambah Inventory
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InventoryList; 