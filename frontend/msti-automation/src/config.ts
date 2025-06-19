export const API_URL = import.meta.env.VITE_API_URL || 'http://192.168.238.10:3001/api';

export const API_ENDPOINTS = {
  // Visualization endpoints
  DASHBOARDS: '/visualizations/dashboards',
  VISUALIZATIONS: '/visualizations',
  PANELS: '/visualizations/panels',
  FLUX_QUERY: '/visualizations/flux-query',
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