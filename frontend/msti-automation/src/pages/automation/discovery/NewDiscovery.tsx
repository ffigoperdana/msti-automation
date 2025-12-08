import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useCdpStore from '../../../store/cdpStore';

const NewDiscovery: React.FC = () => {
  const navigate = useNavigate();
  const { startDiscovery, loading } = useCdpStore();
  const [name, setName] = useState('');
  const [protocol, setProtocol] = useState<'cdp' | 'lldp' | 'both'>('cdp');
  const [groups, setGroups] = useState<{ ipsText: string; username: string; password: string }[]>([
    { ipsText: '', username: '', password: '' },
  ]);

  const parseIps = (text: string) => {
    return text
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const credentialGroups = groups
      .map((g) => ({ seedIps: parseIps(g.ipsText), username: g.username.trim(), password: g.password }))
      .filter((g) => g.seedIps.length > 0);
    const flatSeeds = credentialGroups.flatMap((g) => g.seedIps);
    if (flatSeeds.length === 0) {
      alert('Isi minimal satu IP address');
      return;
    }
    const discoveryId = await startDiscovery({ 
      name: name || undefined, 
      credentialGroups,
      options: { protocol },
    });
    navigate(`/automation/cdp/${discoveryId}`);
  };

  const addGroup = () => setGroups((prev) => [...prev, { ipsText: '', username: '', password: '' }]);
  const removeGroup = (idx: number) => setGroups((prev) => prev.filter((_, i) => i !== idx));

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-800">Create New Network Discovery</h1>
        <p className="text-gray-600 mt-1">Konfigurasi discovery dengan CDP, LLDP, atau kedua protokol sekaligus.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name (optional)</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. Core Site A" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Discovery Protocol</label>
          <div className="flex gap-4">
            <label className="flex items-center cursor-pointer">
              <input type="radio" name="protocol" value="cdp" checked={protocol === 'cdp'} onChange={(e) => setProtocol(e.target.value as 'cdp')} className="mr-2" />
              <span className="text-sm">CDP Only</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input type="radio" name="protocol" value="lldp" checked={protocol === 'lldp'} onChange={(e) => setProtocol(e.target.value as 'lldp')} className="mr-2" />
              <span className="text-sm">LLDP Only</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input type="radio" name="protocol" value="both" checked={protocol === 'both'} onChange={(e) => setProtocol(e.target.value as 'both')} className="mr-2" />
              <span className="text-sm">Both (CDP + LLDP)</span>
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-1">Select which neighbor discovery protocol to use for scanning network devices</p>
        </div>

        <div className="space-y-6">
          {groups.map((g, idx) => (
            <div key={idx} className="border rounded-md p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Credential Group {idx + 1}</h3>
                {groups.length > 1 && (
                  <button type="button" onClick={() => removeGroup(idx)} className="text-red-600 text-sm">Remove</button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seed IP Addresses</label>
                  <textarea value={g.ipsText} onChange={(e) => setGroups((prev) => prev.map((x, i) => i === idx ? { ...x, ipsText: e.target.value } : x))} className="w-full px-3 py-2 border border-gray-300 rounded-md h-36 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Satu IP per baris atau pisahkan dengan koma"></textarea>
                  <p className="text-xs text-gray-500 mt-1">Contoh: 10.0.0.1, 10.0.0.2</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input value={g.username} onChange={(e) => setGroups((prev) => prev.map((x, i) => i === idx ? { ...x, username: e.target.value } : x))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="cisco" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input type="password" value={g.password} onChange={(e) => setGroups((prev) => prev.map((x, i) => i === idx ? { ...x, password: e.target.value } : x))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="••••••" />
                </div>
              </div>
            </div>
          ))}

          <button type="button" onClick={addGroup} className="px-3 py-2 border rounded-md text-sm">+ Add Credential Group</button>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <button type="button" onClick={() => navigate('/automation/cdp')} className="px-4 py-2 border border-gray-300 rounded-md">Cancel</button>
          <button type="submit" disabled={loading.start} className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-60">
            {loading.start ? 'Generating...' : 'Generate Topology'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewDiscovery;


