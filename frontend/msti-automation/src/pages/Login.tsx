import React, { useState } from 'react';
import ServerForm from '../components/auth/ServerForm';
import LoginForm from '../components/auth/LoginForm';

const Login: React.FC = () => {
  const [showServerForm, setShowServerForm] = useState(false);

  const handleServerSubmit = (serverAddress: string, serverPort: string) => {
    localStorage.setItem('ip_host', serverAddress);
    localStorage.setItem('port', serverPort);
    setShowServerForm(false);
    console.log('Server settings saved:', serverAddress, serverPort);
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
        <div className="max-w-md w-full space-y-8">
          <div>
            <h1 className="text-[#31406e] font-bold text-2xl text-center">
              Welcome to MSInsight
            </h1>
          </div>

          {showServerForm ? (
            <ServerForm
              onSubmit={handleServerSubmit}
              onCancel={() => setShowServerForm(false)}
            />
          ) : (
            <LoginForm onSubmitServer={() => setShowServerForm(true)} />
          )}

          <div className="text-center">
            <p className="mt-8 text-[#ACACAC] text-xs">
              You need help? Click{' '}
              <a
                href="https://www.mastersystem.co.id/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-[#EA4644]"
              >
                Here
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 