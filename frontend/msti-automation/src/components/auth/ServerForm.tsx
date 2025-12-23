import React, { useState } from 'react';

interface ServerFormProps {
  onSubmit: (serverAddress: string, serverPort: string) => void;
  onCancel: () => void;
}

const ServerForm: React.FC<ServerFormProps> = ({ onSubmit, onCancel }) => {
  const [address, setAddress] = useState('10.20.50.125');
  const [port, setPort] = useState('3001');
  const [environment, setEnvironment] = useState<'blue' | 'green'>('blue');

  const handleEnvironmentChange = (env: 'blue' | 'green') => {
    setEnvironment(env);
    // Auto-set port based on environment
    setPort(env === 'blue' ? '3001' : '3003');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(address, port);
  };
  

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#31406e] text-center mb-6">
          Konfigurasi Server
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Environment Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Environment
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="environment"
                  value="blue"
                  checked={environment === 'blue'}
                  onChange={() => handleEnvironmentChange('blue')}
                  className="mr-2"
                />
                <span className="text-sm text-blue-600 font-medium">Blue(Production)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="environment"
                  value="green"
                  checked={environment === 'green'}
                  onChange={() => handleEnvironmentChange('green')}
                  className="mr-2"
                />
                <span className="text-sm text-green-600 font-medium">Green  (Staging)</span>
              </label>
            </div>
          </div>

          {/* Server Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alamat Server
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="192.168.238.10"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          {/* Server Port */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Port Server
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="3001"
              value={port}
              onChange={(e) => setPort(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Blue: 3001, Green: 3003
            </p>
          </div>

          {/* Environment Info */}
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="text-sm text-gray-600">
              <strong>Environment:</strong> {environment === 'blue' ? 'Blue (Production)' : 'Green (Staging)'}
            </p>
            <p className="text-sm text-gray-600">
              <strong>URL:</strong> http://{address}:{port}/api
            </p>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-4 bg-[#31406e] text-white rounded-md hover:bg-[#2a3660]"
            >
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ServerForm; 