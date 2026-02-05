import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';

interface EnvironmentStatus {
  name: 'blue' | 'green';
  label: string;
  port: string;
  frontendPort: string;
  status: 'operational' | 'unavailable' | 'checking';
  statusLabel: string;
}

const AutoLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, checkSession, isLoading } = useAuthStore();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedEnv, setSelectedEnv] = useState<'blue' | 'green' | null>(null);
  const [environments, setEnvironments] = useState<EnvironmentStatus[]>([
    {
      name: 'blue',
      label: 'Production (Blue)',
      port: '3001',
      frontendPort: '5172',
      status: 'checking',
      statusLabel: 'Checking...'
    },
    {
      name: 'green',
      label: 'Staging (Green)',
      port: '3003',
      frontendPort: '5173',
      status: 'checking',
      statusLabel: 'Checking...'
    }
  ]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get server address from current hostname or default
  const getServerAddress = () => {
    const hostname = window.location.hostname;
    // If running locally, use the VPS IP
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return '10.20.50.125';
    }
    return hostname;
  };

  const serverAddress = getServerAddress();

  // Check environment health on mount
  useEffect(() => {
    const checkEnvironments = async () => {
      const updatedEnvs = await Promise.all(
        environments.map(async (env) => {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(
              `http://${serverAddress}:${env.port}/health`,
              { 
                signal: controller.signal,
                mode: 'cors'
              }
            );
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
              return {
                ...env,
                status: 'operational' as const,
                statusLabel: 'Systems Operational'
              };
            } else {
              return {
                ...env,
                status: 'unavailable' as const,
                statusLabel: 'Server Error'
              };
            }
          } catch {
            return {
              ...env,
              status: 'unavailable' as const,
              statusLabel: 'Server Unavailable'
            };
          }
        })
      );
      
      setEnvironments(updatedEnvs);
      
      // Auto-select first operational environment
      const operational = updatedEnvs.find(e => e.status === 'operational');
      if (operational && !selectedEnv) {
        setSelectedEnv(operational.name);
      }
    };

    checkEnvironments();
    
    // Re-check every 30 seconds
    const interval = setInterval(checkEnvironments, 30000);
    return () => clearInterval(interval);
  }, [serverAddress]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!selectedEnv) {
      setError('Please select an environment');
      return;
    }

    const env = environments.find(e => e.name === selectedEnv);
    if (!env || env.status !== 'operational') {
      setError('Selected environment is not available');
      return;
    }

    setIsSubmitting(true);

    try {
      // Save server config to localStorage
      localStorage.setItem('ip_host', serverAddress);
      localStorage.setItem('port', env.port);
      localStorage.setItem('environment', env.name);

      const success = await login(serverAddress, env.port, username, password);
      
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
        setError('Server not found. Please check the connection.');
      } else {
        setError('Connection error. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (env: EnvironmentStatus) => {
    const baseClasses = "flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all";
    
    const statusConfig = {
      operational: {
        bg: 'bg-green-50',
        border: selectedEnv === env.name ? 'border-green-500' : 'border-green-200',
        dot: 'bg-green-500',
        text: 'text-green-700'
      },
      unavailable: {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        dot: 'bg-gray-400',
        text: 'text-gray-500'
      },
      checking: {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        dot: 'bg-yellow-500 animate-pulse',
        text: 'text-yellow-700'
      }
    };

    const config = statusConfig[env.status];
    const isSelectable = env.status === 'operational';
    const isSelected = selectedEnv === env.name;

    return (
      <button
        type="button"
        onClick={() => isSelectable && setSelectedEnv(env.name)}
        disabled={!isSelectable}
        className={`
          ${baseClasses} 
          ${config.bg} 
          ${config.border}
          ${isSelectable ? 'cursor-pointer hover:shadow-md' : 'cursor-not-allowed opacity-60'}
          ${isSelected ? 'ring-2 ring-offset-2 ring-green-500' : ''}
          w-full
        `}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${config.dot}`}></div>
            <div className="text-left">
              <div className={`font-semibold ${env.name === 'blue' ? 'text-blue-700' : 'text-green-700'}`}>
                {env.label}
              </div>
              <div className={`text-sm ${config.text}`}>
                {env.statusLabel}
              </div>
            </div>
          </div>
          {isSelected && (
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      </button>
    );
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
      </div>

      {/* Right Side - Login Form */}
      <div className="w-1/2 bg-[#F1F4F7] p-12 flex flex-col items-center justify-center">
        <div className="max-w-md w-full space-y-6">
          <div>
            <h1 className="text-[#31406e] font-bold text-2xl text-center">
              Welcome to MSTI
            </h1>
            <p className="text-center text-gray-500 text-sm mt-2">
              Select an environment and sign in
            </p>
          </div>

          {/* Environment Status Badges */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Environment Status
            </label>
            {environments.map((env) => (
              <div key={env.name}>
                {getStatusBadge(env)}
              </div>
            ))}
          </div>

          {/* Server Info */}
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Server:</span>
              <span className="font-mono text-gray-700">{serverAddress}</span>
            </div>
            {selectedEnv && (
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-500">Port:</span>
                <span className="font-mono text-gray-700">
                  {environments.find(e => e.name === selectedEnv)?.port}
                </span>
              </div>
            )}
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ca3f3b] focus:border-transparent"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ca3f3b] focus:border-transparent"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={!selectedEnv || isSubmitting || isLoading}
              className={`
                w-full py-3 rounded-lg font-semibold text-white transition-all
                ${!selectedEnv || isSubmitting || isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-[#ca3f3b] hover:bg-[#b53835]'
                }
              `}
            >
              {isSubmitting || isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Footer Links */}
          <div className="text-center space-y-2">
            <Link
              to="/dev"
              className="text-sm text-gray-500 hover:text-[#ca3f3b] underline"
            >
              Manual Server Configuration (Dev Mode)
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

export default AutoLoginPage;
