// Dynamic API URL configuration for blue-green deployment
const getApiUrl = () => {
  // Priority: VITE_API_URL > localStorage > default
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Check localStorage for dynamic server configuration
  const serverAddress = localStorage.getItem('ip_host');
  const serverPort = localStorage.getItem('port');
  
  if (serverAddress && serverPort) {
    return `http://${serverAddress}:${serverPort}/api`;
  }
  
  // Default fallback
  return 'http://192.168.238.10:3001/api';
};

export const API_URL = getApiUrl();

export const API_ENDPOINTS = {
  // Visualization endpoints
  DASHBOARDS: '/visualizations/dashboards',
  VISUALIZATIONS: '/visualizations',
  PANELS: '/visualizations/panels',
  FLUX_QUERY: '/visualizations/flux-query',
  TIMESERIES_QUERY: '/visualizations/timeseries-query',
  VALIDATE_QUERY: '/visualizations/validate-query',
  VALIDATE_FLUX_QUERY: '/visualizations/validate-flux-query',
  
  // Data source endpoints
  DATA_SOURCES: '/sources',
  METRICS: '/sources/metrics',
  SOURCE_METRICS: '/sources/metrics',
  DATA_SOURCE_METRICS: (id: string) => `/sources/${id}/metrics`,
  DATA_SOURCE_QUERY: (id: string) => `/sources/${id}/query`,
  
  // Query endpoints
  QUERY: '/visualizations/query'
};

export const DEFAULT_PANEL_CONFIG = {
  width: 12,
  height: 8,
  options: {}
};