import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import ErrorModal from './ErrorModal';

interface LoginFormProps {
  onSubmitServer: () => void;
}

interface SavedServer {
  address: string;
  port: string;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSubmitServer }) => {
  const { login, checkSession, isLoading } = useAuthStore();
  const navigate = useNavigate();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savedServer, setSavedServer] = useState<SavedServer | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({
    title: '',
    message: '',
    status: 'error' as 'error' | 'success',
  });

  // Load saved server on mount
  useEffect(() => {
    const address = localStorage.getItem('ip_host');
    const port = localStorage.getItem('port');
    if (address && port) {
      setSavedServer({ address, port });
    }
  }, []);

  // Error message mapping
  const getErrorContent = (status: number | string) => {
    const errorMap: Record<string | number, any> = {
      401: {
        title: 'Authentication Failed',
        message: 'Invalid username or password. Please check your credentials and try again.',
      },
      404: {
        title: 'Server Not Found',
        message: 'Unable to connect to the server. Please check your server configuration and try again.',
      },
      500: {
        title: 'Server Error',
        message: 'An internal server error occurred. Please try again later or contact support if the problem persists.',
      },
      success: {
        title: 'Login Successful',
        message: 'You have been successfully logged in. Redirecting...',
        status: 'success',
      },
      default: {
        title: 'Connection Error',
        message: 'An error occurred while connecting to the server. Please check your internet connection and try again.',
      },
    };

    return errorMap[status] || errorMap.default;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!savedServer || isLoading) return;

    try {
      const success = await login(
        savedServer.address,
        savedServer.port,
        username,
        password
      );

      if (success) {
        // Show success modal
        setModalContent(getErrorContent('success'));
        setShowModal(true);

        // Wait a bit then check session and navigate
        setTimeout(async () => {
          await checkSession(); // Ensure session is properly loaded
          navigate('/dashboard', { replace: true });
        }, 1500);
      }
    } catch (error: any) {
      const status = error.response?.status || 'default';
      setModalContent(getErrorContent(status));
      setShowModal(true);
    }
  };

  // Toggle password visibility
  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {/* Server Configuration Section */}
        <div className="text-center">
          {!savedServer ? (
            <div className="text-center mb-6 text-[#ACACAC] text-xs">
              Please find your server here
              <button
                type="button"
                className="ml-1 underline text-[#EA4644]"
                onClick={onSubmitServer}
              >
                Submit Server
              </button>
            </div>
          ) : (
            <div className="mb-6 mx-auto max-w-full">
              <div className="rounded-lg p-3 border border-gray-100">
                <div className="items-center justify-between">
                  <span className="text-[#505050] text-xs">
                    Server Configuration :
                  </span>
                  <span className="text-[#ACACAC] text-xs">
                    {savedServer.address}:{savedServer.port}
                  </span>
                  <button
                    type="button"
                    className="ml-2 text-xs underline text-[#EA4644]"
                    onClick={onSubmitServer}
                  >
                    change
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Login Fields */}
        <div className="space-y-4">
          <div>
            <label htmlFor="username" className="block mb-2 text-xs text-[#505050]">
              Username
            </label>
            <input
              type="text"
              id="username"
              required
              className={`w-full p-2 text-xs rounded-md border border-gray-300 focus:ring-red-500 focus:border-red-500 ${
                isLoading ? 'opacity-50' : ''
              }`}
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="relative">
            <label htmlFor="password" className="block mb-2 text-xs text-[#505050]">
              Password
            </label>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className={`w-full p-2 pr-10 text-xs rounded-md border border-gray-300 focus:ring-red-500 focus:border-red-500 ${
                isLoading ? 'opacity-50' : ''
              }`}
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={togglePassword}
              className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600"
              disabled={isLoading}
            >
              {showPassword ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                  <line x1="3" y1="3" x2="21" y2="21"></line>
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!savedServer || isLoading}
          className="w-full py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg text-xs font-semibold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block"
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
              Signing in...
            </>
          ) : (
            'Login'
          )}
        </button>
      </form>

      {/* Status Modal */}
      <ErrorModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalContent.title}
        message={modalContent.message}
        status={modalContent.status}
      />
    </div>
  );
};

export default LoginForm; 