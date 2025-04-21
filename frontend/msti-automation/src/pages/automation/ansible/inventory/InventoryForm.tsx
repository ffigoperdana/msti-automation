import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// Interface untuk data inventory Ansible
interface AnsibleInventory {
  id: string;
  name: string;
  description: string;
  path: string;
  type: 'file' | 'directory' | 'dynamic';
  content?: string;
}

// Interface untuk data grup yang diurai dari teks inventory
interface InventoryGroup {
  name: string;
  hosts: string[];
}

// Interface untuk validasi error
interface ValidationErrors {
  name?: string;
  path?: string;
  type?: string;
  content?: string;
}

// Data dummy untuk edit mode
const MOCK_INVENTORIES: Record<string, AnsibleInventory> = {
  '1': {
    id: '1',
    name: 'Web Servers',
    description: 'Server web untuk aplikasi produksi',
    path: '/etc/ansible/inventory/web',
    type: 'file',
    content: `[webservers]
web1.example.com ansible_host=192.168.1.100
web2.example.com ansible_host=192.168.1.101
web3.example.com ansible_host=192.168.1.102

[webservers:vars]
http_port=80
https_port=443

[dbservers]
db1.example.com ansible_host=192.168.1.200
db2.example.com ansible_host=192.168.1.201`
  },
  '2': {
    id: '2',
    name: 'Database Servers',
    description: 'Server database untuk aplikasi produksi dan staging',
    path: '/etc/ansible/inventory/db',
    type: 'file',
    content: `[dbservers]
db1.example.com ansible_host=192.168.1.200
db2.example.com ansible_host=192.168.1.201

[dbservers:vars]
postgres_port=5432
backup_enabled=true`
  },
  '3': {
    id: '3',
    name: 'Load Balancers',
    description: 'Load balancer untuk semua aplikasi',
    path: '/etc/ansible/inventory/lb',
    type: 'file',
    content: `[loadbalancers]
lb1.example.com ansible_host=192.168.1.50
lb2.example.com ansible_host=192.168.1.51
lb3.example.com ansible_host=192.168.1.52

[loadbalancers:vars]
nginx_port=80
ssl_enabled=true`
  },
  '4': {
    id: '4',
    name: 'Dynamic Cloud Servers',
    description: 'Inventory dinamis untuk server cloud',
    path: '/etc/ansible/inventory/cloud.py',
    type: 'dynamic',
    content: `#!/usr/bin/env python
# Dynamic inventory script for cloud servers

import json
import subprocess
import sys

def get_inventory():
    inventory = {
        "cloud_servers": {
            "hosts": ["cloud1", "cloud2", "cloud3"],
            "vars": {
                "ansible_user": "cloud-admin",
                "ansible_ssh_private_key_file": "/etc/ansible/keys/cloud.pem"
            }
        },
        "_meta": {
            "hostvars": {
                "cloud1": {"ansible_host": "10.0.1.10"},
                "cloud2": {"ansible_host": "10.0.1.11"},
                "cloud3": {"ansible_host": "10.0.1.12"}
            }
        }
    }
    return inventory

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--list':
        print(json.dumps(get_inventory()))
    else:
        print(json.dumps({}))`
  }
};

const InventoryForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = id !== undefined && id !== 'new';
  
  // State untuk data form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [path, setPath] = useState('');
  const [type, setType] = useState<'file' | 'directory' | 'dynamic'>('file');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [groups, setGroups] = useState<InventoryGroup[]>([]);

  // Memuat data saat edit mode
  useEffect(() => {
    if (isEditMode) {
      setIsLoading(true);
      // Simulasi API call untuk mendapatkan data inventory
      const loadInventoryData = async () => {
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          const inventoryData = MOCK_INVENTORIES[id];
          
          if (inventoryData) {
            setName(inventoryData.name);
            setDescription(inventoryData.description || '');
            setPath(inventoryData.path);
            setType(inventoryData.type);
            if (inventoryData.content) {
              setContent(inventoryData.content);
              // Parse groups dari content
              setGroups(parseInventoryGroups(inventoryData.content));
            }
          } else {
            alert('Inventory tidak ditemukan');
            navigate('/automation/ansible/inventory');
          }
        } catch (error) {
          console.error('Error loading inventory:', error);
          alert('Gagal memuat data inventory');
        } finally {
          setIsLoading(false);
        }
      };

      loadInventoryData();
    }
  }, [id, isEditMode, navigate]);

  // Parse dan ekstrak grup dari content inventory
  const parseInventoryGroups = (content: string): InventoryGroup[] => {
    const lines = content.split('\n');
    const groups: InventoryGroup[] = [];
    let currentGroup: InventoryGroup | null = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip komentar atau baris kosong
      if (trimmedLine.startsWith('#') || trimmedLine === '') continue;
      
      // Cek apakah baris ini adalah header grup: [nama_grup]
      const groupMatch = trimmedLine.match(/^\[(.*?)(?:\:vars)?\]$/);
      if (groupMatch) {
        // Jika ada match dan bukan :vars, maka ini adalah grup baru
        if (!trimmedLine.includes(':vars')) {
          // Simpan grup sebelumnya jika ada
          if (currentGroup) groups.push(currentGroup);
          
          // Buat grup baru
          currentGroup = {
            name: groupMatch[1],
            hosts: []
          };
        }
        continue;
      }
      
      // Jika ada grup aktif dan baris ini tidak berisi '=', anggap sebagai host
      if (currentGroup && !trimmedLine.includes('=')) {
        // Ambil nama host (bagian sebelum spasi pertama)
        const hostParts = trimmedLine.split(/\s+/);
        if (hostParts[0]) {
          currentGroup.hosts.push(hostParts[0]);
        }
      }
    }
    
    // Tambahkan grup terakhir jika ada
    if (currentGroup) groups.push(currentGroup);
    
    return groups;
  };

  // Validasi form sebelum submit
  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};
    
    if (!name.trim()) {
      errors.name = 'Nama inventory wajib diisi';
    }
    
    if (!path.trim()) {
      errors.path = 'Path inventory wajib diisi';
    }
    
    if (!type) {
      errors.type = 'Tipe inventory wajib dipilih';
    }
    
    if (type === 'file' && !content.trim()) {
      errors.content = 'Konten inventory wajib diisi';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handler untuk submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // Simulasi API call untuk menyimpan data
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Redirect ke halaman daftar inventory setelah sukses
      alert(isEditMode ? 'Inventory berhasil diperbarui' : 'Inventory baru berhasil ditambahkan');
      navigate('/automation/ansible/inventory');
    } catch (error) {
      console.error('Error saving inventory:', error);
      alert('Gagal menyimpan inventory');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler untuk cancel button
  const handleCancel = () => {
    navigate('/automation/ansible/inventory');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold text-gray-800">
            {isEditMode ? 'Edit Inventory' : 'Tambah Inventory Baru'}
          </h1>
        </div>
      </div>

      {/* Form */}
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
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900">Informasi Dasar</h2>
            
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nama Inventory <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`mt-1 block w-full px-3 py-2 border ${
                  validationErrors.name ? 'border-red-500' : 'border-gray-300'
                } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                placeholder="Contoh: Production Servers"
              />
              {validationErrors.name && (
                <p className="mt-1 text-sm text-red-500">{validationErrors.name}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Deskripsi
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Deskripsi singkat tentang inventory ini"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="path" className="block text-sm font-medium text-gray-700">
                  Path <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="path"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  className={`mt-1 block w-full px-3 py-2 border ${
                    validationErrors.path ? 'border-red-500' : 'border-gray-300'
                  } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  placeholder="/etc/ansible/inventory/production"
                />
                {validationErrors.path && (
                  <p className="mt-1 text-sm text-red-500">{validationErrors.path}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                  Tipe <span className="text-red-500">*</span>
                </label>
                <select
                  id="type"
                  value={type}
                  onChange={(e) => setType(e.target.value as 'file' | 'directory' | 'dynamic')}
                  className={`mt-1 block w-full px-3 py-2 border ${
                    validationErrors.type ? 'border-red-500' : 'border-gray-300'
                  } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                >
                  <option value="file">File</option>
                  <option value="directory">Directory</option>
                  <option value="dynamic">Dynamic (Script)</option>
                </select>
                {validationErrors.type && (
                  <p className="mt-1 text-sm text-red-500">{validationErrors.type}</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Inventory Content */}
          {type === 'file' && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-gray-900">Konten Inventory</h2>
              
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                  Konten File <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => {
                    const newContent = e.target.value;
                    setContent(newContent);
                    setGroups(parseInventoryGroups(newContent));
                  }}
                  rows={12}
                  className={`mt-1 block w-full px-3 py-2 border ${
                    validationErrors.content ? 'border-red-500' : 'border-gray-300'
                  } rounded-md shadow-sm font-mono text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  placeholder="[webservers]\nweb1.example.com\nweb2.example.com"
                />
                {validationErrors.content && (
                  <p className="mt-1 text-sm text-red-500">{validationErrors.content}</p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  Format inventori Ansible standar. Grup dalam format [nama_grup] diikuti dengan daftar host.
                </p>
              </div>
            </div>
          )}
          
          {/* Script Content */}
          {type === 'dynamic' && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-gray-900">Konten Script</h2>
              
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                  Konten Script <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={12}
                  className={`mt-1 block w-full px-3 py-2 border ${
                    validationErrors.content ? 'border-red-500' : 'border-gray-300'
                  } rounded-md shadow-sm font-mono text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  placeholder="#!/usr/bin/env python\n# Dynamic inventory script"
                />
                {validationErrors.content && (
                  <p className="mt-1 text-sm text-red-500">{validationErrors.content}</p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  Script harus mematuhi protokol Ansible Dynamic Inventory: menghasilkan JSON yang valid saat dipanggil dengan parameter --list.
                </p>
              </div>
            </div>
          )}
          
          {/* Preview Groups */}
          {type === 'file' && groups.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-gray-900">Preview Grup dan Host</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.map((group, index) => (
                  <div key={index} className="border border-gray-200 rounded-md p-4">
                    <h3 className="font-medium text-gray-800 mb-2">[{group.name}]</h3>
                    <ul className="space-y-1">
                      {group.hosts.length > 0 ? (
                        group.hosts.map((host, hostIndex) => (
                          <li key={hostIndex} className="text-sm text-gray-600">{host}</li>
                        ))
                      ) : (
                        <li className="text-sm text-gray-400 italic">Tidak ada host</li>
                      )}
                    </ul>
                    <div className="mt-2 text-xs text-gray-500">
                      {group.hosts.length} host
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={isSubmitting}
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <svg 
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" 
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
                  Menyimpan...
                </>
              ) : (
                'Simpan Inventory'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default InventoryForm; 