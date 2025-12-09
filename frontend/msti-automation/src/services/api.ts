import axios from 'axios';
import { API_URL } from '../config';

// Dynamic API URL configuration
const getBaseURL = () => {
  // Check localStorage for dynamic server configuration (updated at runtime)
  const serverAddress = localStorage.getItem('ip_host');
  const serverPort = localStorage.getItem('port');
  
  if (serverAddress && serverPort) {
    return `http://${serverAddress}:${serverPort}/api`;
  }
  
  // Fallback to config
  return API_URL;
};

// Buat instance axios dengan konfigurasi default
const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 detik
  withCredentials: true, // CRITICAL: Send cookies with requests
});

// Update baseURL when localStorage changes
const updateBaseURL = () => {
  api.defaults.baseURL = getBaseURL();
};

// Listen for storage changes
window.addEventListener('storage', updateBaseURL);

// Export function to manually update baseURL
export const updateApiBaseURL = updateBaseURL;

// Interceptor untuk request
api.interceptors.request.use(
  (config) => {
    // Mendapatkan token dari localStorage jika ada
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor untuk response
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handling error umum
    if (error.response && error.response.status === 401) {
      // Handle unauthorized, misalnya redirect ke halaman login
      localStorage.removeItem('accessToken');
      // window.location.href = '/login';
    }
    
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export default api; 