import React, { useState } from 'react';

interface ServerFormProps {
  onSubmit: (serverData: { address: string; port: string }) => void;
  onCancel: () => void;
}

const ServerForm: React.FC<ServerFormProps> = ({ onSubmit, onCancel }) => {
  const [address, setAddress] = useState('192.168.238.10');
  const [port, setPort] = useState('3001');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ address, port });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#31406e] text-center mb-4">
          Server Configuration
        </h2>
        <p className="text-xs text-[#ACACAC] text-center mb-6">
          Please configure your server connection
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="address" className="block mb-2 text-xs text-[#505050]">
            Server Address
          </label>
          <input
            type="text"
            id="address"
            required
            className="w-full p-2 text-xs rounded-md border border-gray-300 focus:ring-red-500 focus:border-red-500"
            placeholder="192.168.238.10"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="port" className="block mb-2 text-xs text-[#505050]">
            Port
          </label>
          <input
            type="text"
            id="port"
            required
            className="w-full p-2 text-xs rounded-md border border-gray-300 focus:ring-red-500 focus:border-red-500"
            placeholder="3001"
            value={port}
            onChange={(e) => setPort(e.target.value)}
          />
        </div>

        <div className="flex space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors duration-200"
          >
            Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
};

export default ServerForm; 