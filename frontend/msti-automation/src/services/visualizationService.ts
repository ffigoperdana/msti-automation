import { API_ENDPOINTS } from '../config';

export interface Query {
  refId: string;
  query: string;
  dataSourceId: string;
}

export interface Panel {
  id?: string;
  name: string;
  type: string;
  config: {
    description?: string;
    width: number;
    height: number;
    options: Record<string, any>;
  };
  position?: {
    x: number;
    y: number;
  };
  dataSourceId: string;
  queries?: Query[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Dashboard {
  id?: string;
  name: string;
  type: 'dashboard';
  config: {
    description?: string;
    tags?: string[];
  };
  panels?: Panel[];
  createdAt: string;
  updatedAt?: string;
}

type FetchApiFunction = <T>(url: string, options?: RequestInit) => Promise<T>;

export const visualizationService = {
  // Dashboard endpoints
  async getDashboards(fetchApi: FetchApiFunction) {
    return fetchApi(API_ENDPOINTS.DASHBOARDS) as Promise<Dashboard[]>;
  },

  async getDashboard(fetchApi: FetchApiFunction, id: string) {
    return fetchApi(`${API_ENDPOINTS.DASHBOARDS}/${id}`) as Promise<Dashboard>;
  },

  async createDashboard(fetchApi: FetchApiFunction, data: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>) {
    return fetchApi(API_ENDPOINTS.DASHBOARDS, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<Dashboard>;
  },

  async updateDashboard(fetchApi: FetchApiFunction, id: string, data: Partial<Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>>) {
    return fetchApi(`${API_ENDPOINTS.DASHBOARDS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }) as Promise<Dashboard>;
  },

  async deleteDashboard(fetchApi: FetchApiFunction, id: string) {
    return fetchApi(`${API_ENDPOINTS.DASHBOARDS}/${id}`, {
      method: 'DELETE',
    }) as Promise<void>;
  },

  // Panel endpoints
  async createPanel(fetchApi: FetchApiFunction, dashboardId: string, data: Omit<Panel, 'id' | 'createdAt' | 'updatedAt'>) {
    return fetchApi(`${API_ENDPOINTS.DASHBOARDS}/${dashboardId}/panels`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<Panel>;
  },

  async updatePanel(fetchApi: FetchApiFunction, id: string, data: Partial<Omit<Panel, 'id' | 'createdAt' | 'updatedAt'>>) {
    return fetchApi(`${API_ENDPOINTS.PANELS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }) as Promise<Panel>;
  },

  async deletePanel(fetchApi: FetchApiFunction, id: string) {
    return fetchApi(`${API_ENDPOINTS.PANELS}/${id}`, {
      method: 'DELETE',
    }) as Promise<void>;
  },

  // Query endpoints
  async validateQuery(fetchApi: FetchApiFunction, dataSourceId: string, query: string) {
    return fetchApi(`${API_ENDPOINTS.DATA_SOURCES}/${dataSourceId}/query`, {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  },

  async executeQuery(fetchApi: FetchApiFunction, dataSourceId: string, queryConfig: any) {
    return fetchApi(`${API_ENDPOINTS.DATA_SOURCES}/${dataSourceId}/query`, {
      method: 'POST',
      body: JSON.stringify({ queryConfig }),
    });
  },
}; 