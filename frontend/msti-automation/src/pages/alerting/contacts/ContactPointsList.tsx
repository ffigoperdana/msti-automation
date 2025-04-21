import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// Interface untuk data contact point
interface ContactPoint {
  id: string;
  name: string;
  type: 'email' | 'slack' | 'webhook' | 'telegram';
  isDefault: boolean;
  settings: {
    email?: string[];
    emailSubject?: string;
    slackWebhookUrl?: string;
    slackChannel?: string;
    webhookUrl?: string;
    telegramBotToken?: string;
    telegramChatId?: string;
  };
  disableResolveMessage: boolean;
}

const ContactPointsList: React.FC = () => {
  // State untuk data dan tampilan UI
  const [contactPoints, setContactPoints] = useState<ContactPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  
  // Load data dummy contact point
  useEffect(() => {
    // Simulasi API call
    setTimeout(() => {
      try {
        const dummyData: ContactPoint[] = [
          {
            id: '1',
            name: 'Email DevOps',
            type: 'email',
            isDefault: true,
            settings: {
              email: ['devops@contoh.com', 'admin@contoh.com'],
              emailSubject: 'Alert: {{.commonLabels.alertname}}'
            },
            disableResolveMessage: false
          },
          {
            id: '2',
            name: 'Slack Monitoring',
            type: 'slack',
            isDefault: false,
            settings: {
              slackWebhookUrl: 'https://hooks.slack.com/services/xxx/yyy/zzz',
              slackChannel: '#monitoring'
            },
            disableResolveMessage: false
          },
          {
            id: '3',
            name: 'Production Webhook',
            type: 'webhook',
            isDefault: false,
            settings: {
              webhookUrl: 'https://example.com/api/alerts'
            },
            disableResolveMessage: true
          },
          {
            id: '4',
            name: 'Telegram Alerts',
            type: 'telegram',
            isDefault: false,
            settings: {
              telegramBotToken: '12345:ABC-DEF1234ghIkl-zyx57W2',
              telegramChatId: '-100123456789'
            },
            disableResolveMessage: false
          }
        ];
        
        setContactPoints(dummyData);
        setIsLoading(false);
      } catch (err) {
        setError('Terjadi kesalahan saat memuat data contact point');
        setIsLoading(false);
      }
    }, 1000);
  }, []);
  
  // Handler untuk menghapus contact point
  const handleDelete = (id: string) => {
    // Konfirmasi penghapusan
    if (window.confirm('Apakah Anda yakin ingin menghapus contact point ini?')) {
      setContactPoints(contactPoints.filter(cp => cp.id !== id));
    }
  };
  
  // Handler untuk mengubah contact point default
  const handleSetDefault = (id: string) => {
    setContactPoints(
      contactPoints.map(cp => ({
        ...cp,
        isDefault: cp.id === id
      }))
    );
  };
  
  // Filter contact point berdasarkan pencarian dan tipe
  const filteredContactPoints = contactPoints.filter(cp => {
    const matchesSearch = cp.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || cp.type === selectedType;
    return matchesSearch && matchesType;
  });
  
  // Mendapatkan label dan icon berdasarkan tipe contact point
  const getContactTypeInfo = (type: string) => {
    switch (type) {
      case 'email':
        return {
          label: 'Email',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
          )
        };
      case 'slack':
        return {
          label: 'Slack',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
          )
        };
      case 'webhook':
        return {
          label: 'Webhook',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          )
        };
      case 'telegram':
        return {
          label: 'Telegram',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
              <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
            </svg>
          )
        };
      default:
        return {
          label: 'Lainnya',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
          )
        };
    }
  };
  
  // Tampilkan ringkasan pengaturan contact point
  const renderContactSettings = (contact: ContactPoint) => {
    switch (contact.type) {
      case 'email':
        return (
          <div className="text-gray-500 text-sm">
            {contact.settings.email?.join(', ') || 'Tidak ada email'}
          </div>
        );
      case 'slack':
        return (
          <div className="text-gray-500 text-sm">
            {contact.settings.slackChannel || 'Default channel'} via webhook
          </div>
        );
      case 'webhook':
        return (
          <div className="text-gray-500 text-sm">
            {contact.settings.webhookUrl || 'URL tidak ditemukan'}
          </div>
        );
      case 'telegram':
        return (
          <div className="text-gray-500 text-sm">
            Chat ID: {contact.settings.telegramChatId || 'Tidak ada chat ID'}
          </div>
        );
      default:
        return null;
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Contact Points</h1>
            <p className="text-gray-600 mt-1">
              Kelola titik kontak untuk pemberitahuan alert
            </p>
          </div>
          <Link
            to="/alerting/contacts/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Tambah Contact Point
          </Link>
        </div>
      </div>
      
      {/* Filter dan Pencarian */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Cari contact point..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="w-full md:w-48">
            <select
              className="block w-full py-2 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="all">Semua Tipe</option>
              <option value="email">Email</option>
              <option value="slack">Slack</option>
              <option value="webhook">Webhook</option>
              <option value="telegram">Telegram</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Daftar Contact Point */}
      <div className="bg-white rounded-lg shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600 mb-2"></div>
            <p className="text-gray-600">Memuat contact points...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <div className="bg-red-50 p-4 rounded-md">
              <p className="text-red-600">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
              >
                Coba lagi
              </button>
            </div>
          </div>
        ) : filteredContactPoints.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">
              {searchQuery || selectedType !== 'all'
                ? 'Tidak ada contact point yang cocok dengan kriteria pencarian'
                : 'Belum ada contact point yang dibuat'}
            </p>
            {!searchQuery && selectedType === 'all' && (
              <Link
                to="/alerting/contacts/new"
                className="mt-2 inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
              >
                Tambah Contact Point
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nama
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipe
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pengaturan
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredContactPoints.map(contact => (
                  <tr key={contact.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">
                          {contact.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getContactTypeInfo(contact.type).icon}
                        <span className="ml-2 text-sm text-gray-900">
                          {getContactTypeInfo(contact.type).label}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderContactSettings(contact)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {contact.isDefault ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Default
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetDefault(contact.id)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Set default
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          to={`/alerting/contacts/edit/${contact.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(contact.id)}
                          className="text-red-600 hover:text-red-900 ml-3"
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
        )}
      </div>
    </div>
  );
};

export default ContactPointsList; 