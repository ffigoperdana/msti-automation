import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';

interface ServerConfig {
  address: string;
  port: string;
  environment: 'blue' | 'green' | 'custom';
}

const DevLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, checkSession, isLoading } = useAuthStore();
  
  // Server config state
  const [showServerForm, setShowServerForm] = useState(true);
  const [serverConfig, setServerConfig] = useState<ServerConfig>({
    address: localStorage.getItem('ip_host') || 'localhost',
    port: localStorage.getItem('port') || '3001',
    environment: 'custom'
  });
  
  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'testing' | 'success' | 'failed'>('none');

  const presetEnvironments = [
    { name: 'blue' as const, label: 'Blue (Production)', address: '10.20.50.125', port: '3001' },
    { name: 'green' as const, label: 'Green (Staging)', address: '10.20.50.125', port: '3003' },
    { name: 'custom' as const, label: 'Custom / Localhost', address: '', port: '' }
  ];

  const handlePresetSelect = (preset: typeof presetEnvironments[0]) => {
    if (preset.name === 'custom') {
      setServerConfig({
        address: 'localhost',
        port: '3001',
        environment: 'custom'
      });
    } else {
      setServerConfig({
        address: preset.address,
        port: preset.port,
        environment: preset.name
      });
    }
    setConnectionStatus('none');
  };

  const testConnection = async () => {
    setConnectionStatus('testing');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(
        `http://${serverConfig.address}:${serverConfig.port}/health`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        setConnectionStatus('success');
      } else {
        setConnectionStatus('failed');
      }
    } catch {
      setConnectionStatus('failed');
    }
  };

  const handleServerSubmit = () => {
    localStorage.setItem('ip_host', serverConfig.address);
    localStorage.setItem('port', serverConfig.port);
    localStorage.setItem('environment', serverConfig.environment);
    setShowServerForm(false);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const success = await login(
        serverConfig.address,
        serverConfig.port,
        username,
        password
      );

      if (success) {
        await checkSession();
        navigate('/dashboard', { replace: true });
      } else {
        setError('Invalid username or password');
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Invalid username or password');
      } else if (err.response?.status === 404) {
        setError('Server not found');
      } else {
        setError('Connection error. Please check server configuration.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Left Side - Branding */}
      <div className="w-1/2 bg-white p-12 flex flex-col justify-between">
        <div>
          <div className="h-8 w-auto mb-4">
            <h1 className="text-2xl font-bold text-[#ca3f3b]">MSTI</h1>
          </div>
          <p className="text-3xl font-bold mt-4">
            <span className="text-[#ca3f3b]">The Network Automation</span>
            <span className="text-[#31406e]"> in your Hand!</span>
          </p>
        </div>
        <div className="flex-grow flex justify-center items-center">
          <div className="max-w-[70%] max-h-[70%] flex items-center justify-center">
            <div className="w-64 h-64 bg-gradient-to-br from-[#ca3f3b] to-[#31406e] rounded-full flex items-center justify-center">
              <div className="text-white text-6xl font-bold">MSTI</div>
            </div>
          </div>
        </div>
        
        {/* Dev Mode Indicator */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-yellow-700 font-medium text-sm">Development Mode</span>
          </div>
          <p className="text-yellow-600 text-xs mt-1">
            Manual server configuration for development and testing
          </p>
        </div>
      </div>

      {/* Right Side - Forms */}
      <div className="w-1/2 bg-[#F1F4F7] p-12 flex flex-col items-center justify-center">
        <div className="max-w-md w-full space-y-6">
          <div>
            <h1 className="text-[#31406e] font-bold text-2xl text-center">
              Development Login
            </h1>
            <p className="text-center text-gray-500 text-sm mt-2">
              Configure server manually for development
            </p>
          </div>

          {showServerForm ? (
            /* Server Configuration Form */
            <div className="space-y-4">
              {/* Environment Presets */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick Select Environment
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {presetEnvironments.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handlePresetSelect(preset)}
                      className={`
                        px-3 py-2 text-sm rounded-lg border-2 transition-all
                        ${serverConfig.environment === preset.name
                          ? 'border-[#ca3f3b] bg-red-50 text-[#ca3f3b]'
                          : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Server Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Server Address
                </label>
                <input
                  type="text"
                  value={serverConfig.address}
                  onChange={(e) => {
                    setServerConfig({ ...serverConfig, address: e.target.value, environment: 'custom' });
                    setConnectionStatus('none');
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ca3f3b]"
                  placeholder="localhost or 10.20.50.125"
                />
              </div>

              {/* Server Port */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Server Port
                </label>
                <input
                  type="text"
                  value={serverConfig.port}
                  onChange={(e) => {
                    setServerConfig({ ...serverConfig, port: e.target.value, environment: 'custom' });
                    setConnectionStatus('none');
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ca3f3b]"
                  placeholder="3001"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Blue: 3001 | Green: 3003 | Local Dev: 3001
                </p>
              </div>

              {/* Connection Test */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={testConnection}
                  disabled={connectionStatus === 'testing'}
                  className="flex-1 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                >
                  {connectionStatus === 'testing' ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Testing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Test Connection
                    </>
                  )}
                </button>
              </div>

              {/* Connection Status */}
              {connectionStatus !== 'none' && connectionStatus !== 'testing' && (
                <div className={`
                  p-3 rounded-lg flex items-center gap-2
                  ${connectionStatus === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}
                `}>
                  {connectionStatus === 'success' ? (
                    <>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Connection successful!</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span>Connection failed. Check address and port.</span>
                    </>
                  )}
                </div>
              )}

              {/* Continue Button */}
              <button
                type="button"
                onClick={handleServerSubmit}
                className="w-full py-3 bg-[#ca3f3b] text-white rounded-lg hover:bg-[#b53835] transition-all font-semibold"
              >
                Continue to Login
              </button>
            </div>
          ) : (
            /* Login Form */
            <div className="space-y-4">
              {/* Server Info */}
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-gray-500 text-sm">Server: </span>
                    <span className="font-mono text-gray-700">
                      {serverConfig.address}:{serverConfig.port}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowServerForm(true)}
                    className="text-sm text-[#ca3f3b] hover:underline"
                  >
                    Change
                  </button>
                </div>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="username" className="block mb-2 text-sm text-gray-700">
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ca3f3b]"
                    placeholder="Enter your username"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block mb-2 text-sm text-gray-700">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ca3f3b]"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || isLoading}
                  className={`
                    w-full py-3 rounded-lg font-semibold text-white transition-all
                    ${isSubmitting || isLoading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-[#ca3f3b] hover:bg-[#b53835]'
                    }
                  `}
                >
                  {isSubmitting || isLoading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            </div>
          )}

          {/* Footer Links */}
          <div className="text-center space-y-2">
            <Link
              to="/login"
              className="text-sm text-[#ca3f3b] hover:underline font-medium"
            >
              ← Back to Auto-Detection Login
            </Link>
            <p className="text-xs text-gray-400">
              Need help?{' '}
              <a
                href="https://www.mastersystem.co.id/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-[#EA4644]"
              >
                Click Here
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevLoginPage;
