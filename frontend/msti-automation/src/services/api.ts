import axios from 'axios';

// Buat instance axios dengan konfigurasi default
const api = axios.create({
  baseURL: 'http://192.168.238.10:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 detik
});

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