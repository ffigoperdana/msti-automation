import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useCdpStore from '../../../store/cdpStore';

interface PostAuthStep {
  type: 'command' | 'password';
  value: string;
}

interface CredentialGroupState {
  ipsText: string;
  username: string;
  password: string;
  postAuthSteps: PostAuthStep[];
}

const NewDiscovery: React.FC = () => {
  const navigate = useNavigate();
  const { startDiscovery } = useCdpStore();
  const [name, setName] = useState('');
  const [protocol, setProtocol] = useState<'cdp' | 'lldp' | 'both'>('cdp');
  const [groups, setGroups] = useState<CredentialGroupState[]>([
    { ipsText: '', username: '', password: '', postAuthSteps: [] },
  ]);
  
  // Local loading state for better control
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Elapsed time tracker
  useEffect(() => {
    if (isGenerating) {
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isGenerating]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const parseIps = (text: string) => {
    return text
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const credentialGroups = groups
      .map((g) => ({
        seedIps: parseIps(g.ipsText),
        username: g.username.trim(),
        password: g.password,
        postAuthSteps: g.postAuthSteps.filter((s) => s.value.trim() !== ''),
      }))
      .filter((g) => g.seedIps.length > 0);
    const flatSeeds = credentialGroups.flatMap((g) => g.seedIps);
    if (flatSeeds.length === 0) {
      alert('Isi minimal satu IP address');
      return;
    }
    
    // Start loading with message
    setIsGenerating(true);
    setErrorMessage(null);
    setLoadingMessage('Connecting to devices...');
    
    try {
      // Update message after a brief delay to show progress
      const updateMessages = [
        { delay: 3000, msg: 'Authenticating with credentials...' },
        { delay: 8000, msg: 'Running CDP/LLDP discovery commands...' },
        { delay: 15000, msg: 'Parsing neighbor information...' },
        { delay: 30000, msg: 'Building topology graph...' },
        { delay: 60000, msg: 'Discovery is taking longer than expected, please wait...' },
      ];
      
      const messageTimers = updateMessages.map(({ delay, msg }) =>
        setTimeout(() => setLoadingMessage(msg), delay)
      );
      
      const discoveryId = await startDiscovery({ 
        name: name || undefined, 
        credentialGroups,
        options: { protocol },
      });
      
      // Clear message timers
      messageTimers.forEach(clearTimeout);
      
      // Success - redirect to topology view
      setLoadingMessage('Discovery complete! Redirecting...');
      setTimeout(() => {
        navigate(`/automation/cdp/${discoveryId}`);
      }, 500);
    } catch (error) {
      console.error('Discovery failed:', error);
      setIsGenerating(false);
      const errMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      setErrorMessage(errMsg);
    }
  };

  const addGroup = () => setGroups((prev) => [...prev, { ipsText: '', username: '', password: '', postAuthSteps: [] }]);
  const removeGroup = (idx: number) => setGroups((prev) => prev.filter((_, i) => i !== idx));

  // Post-auth step handlers
  const addPostAuthStep = (groupIdx: number, type: 'command' | 'password') => {
    setGroups((prev) =>
      prev.map((g, i) =>
        i === groupIdx ? { ...g, postAuthSteps: [...g.postAuthSteps, { type, value: '' }] } : g
      )
    );
  };

  const updatePostAuthStep = (groupIdx: number, stepIdx: number, value: string) => {
    setGroups((prev) =>
      prev.map((g, i) =>
        i === groupIdx
          ? {
              ...g,
              postAuthSteps: g.postAuthSteps.map((s, j) => (j === stepIdx ? { ...s, value } : s)),
            }
          : g
      )
    );
  };

  const removePostAuthStep = (groupIdx: number, stepIdx: number) => {
    setGroups((prev) =>
      prev.map((g, i) =>
        i === groupIdx
          ? { ...g, postAuthSteps: g.postAuthSteps.filter((_, j) => j !== stepIdx) }
          : g
      )
    );
  };

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

              {/* Post-Authentication Steps */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">Post-Authentication Steps</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => addPostAuthStep(idx, 'command')}
                      className="px-2 py-1 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100"
                    >
                      + Add Command
                    </button>
                    <button
                      type="button"
                      onClick={() => addPostAuthStep(idx, 'password')}
                      className="px-2 py-1 text-xs bg-green-50 text-green-600 border border-green-200 rounded hover:bg-green-100"
                    >
                      + Add Password
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-2">Add commands (e.g., "en 14") and passwords for privilege escalation after login</p>
                
                {g.postAuthSteps.length > 0 && (
                  <div className="space-y-2">
                    {g.postAuthSteps.map((step, stepIdx) => (
                      <div key={stepIdx} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-16">Step {stepIdx + 1}:</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            step.type === 'command'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {step.type === 'command' ? 'Command' : 'Password'}
                        </span>
                        <input
                          type={step.type === 'password' ? 'password' : 'text'}
                          value={step.value}
                          onChange={(e) => updatePostAuthStep(idx, stepIdx, e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder={step.type === 'command' ? 'e.g., en 14' : '••••••'}
                        />
                        <button
                          type="button"
                          onClick={() => removePostAuthStep(idx, stepIdx)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          <button type="button" onClick={addGroup} className="px-3 py-2 border rounded-md text-sm">+ Add Credential Group</button>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <button type="button" onClick={() => navigate('/automation/cdp')} disabled={isGenerating} className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={isGenerating} className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-60 flex items-center gap-2">
            {isGenerating ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </>
            ) : 'Generate Topology'}
          </button>
        </div>
      </form>
      
      {/* Loading Overlay Modal */}
      {isGenerating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center shadow-2xl">
            <div className="mb-4">
              <svg className="animate-spin h-12 w-12 mx-auto text-blue-600" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Discovering Network Topology</h3>
            <p className="text-gray-600 text-sm mb-2">{loadingMessage}</p>
            <p className="text-blue-600 font-mono text-sm mb-4">Elapsed: {formatTime(elapsedSeconds)}</p>
            <p className="text-xs text-gray-400">This may take a few minutes depending on the network size...</p>
          </div>
        </div>
      )}
      
      {/* Error Modal */}
      {errorMessage && !isGenerating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-lg mx-4 text-center shadow-2xl">
            <div className="mb-4">
              <svg className="h-12 w-12 mx-auto text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Discovery Failed</h3>
            <p className="text-red-600 text-sm mb-4 break-words">{errorMessage}</p>
            <button 
              onClick={() => setErrorMessage(null)}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewDiscovery;


