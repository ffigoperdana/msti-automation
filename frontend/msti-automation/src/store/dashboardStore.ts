import { create } from 'zustand';
import { useApiStore } from './apiStore';

// Tipe data untuk panel query
export interface PanelQuery {
  id: string;
  refId: string; // Referensi query id (A, B, C, etc)
  dataSourceId: string;
  query: string; // InfluxQL or Flux query
  rawQuery: boolean;
}

// Tipe data untuk panel
export interface Panel {
  id: string;
  dashboardId: string;
  title: string;
  description?: string;
  type: 'timeseries' | 'gauge' | 'stat' | 'table' | 'heatmap' | 'interface';
  width: number;  // Grid width (1-12)
  height: number; // Grid height in units
  position: { x: number, y: number }; // Grid position
  options: {
    unit?: string;
    decimals?: number;
    min?: number;
    max?: number;
    thresholds?: {
      steps: Array<{
        value: number;
        color: string;
      }>;
    };
    // Fields untuk visualisasi interface
    deviceField?: string;
    nameField?: string;
    statusField?: string;
    speedField?: string;
    duplexField?: string;
    bytesInField?: string;
    bytesOutField?: string;
    errorsField?: string;
    [key: string]: any;
  };
  queries: PanelQuery[];
  createdAt: string;
  updatedAt: string;
}

// Tipe data untuk dashboard
export interface Dashboard {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  timeRange: {
    from: string;
    to: string;
  };
  refresh?: string; // Auto refresh interval
  panels: Panel[];
  createdAt: string;
  updatedAt: string;
}

// Query result data point
export interface TimeSeriesDataPoint {
  time: string;
  value: number;
  [key: string]: any;
}

// Query result
export interface QueryResult {
  refId: string;
  series: Array<{
    name: string;
    fields: string[];
    tags?: Record<string, string>;
    data: TimeSeriesDataPoint[];
  }>;
}

// API keys
export const DASHBOARD_API_KEYS = {
  // Dashboard keys
  GET_DASHBOARDS: 'get_dashboards',
  GET_DASHBOARD: 'get_dashboard',
  CREATE_DASHBOARD: 'create_dashboard',
  UPDATE_DASHBOARD: 'update_dashboard',
  DELETE_DASHBOARD: 'delete_dashboard',
  
  // Panel keys
  GET_PANELS: 'get_panels',
  GET_PANEL: 'get_panel',
  CREATE_PANEL: 'create_panel',
  UPDATE_PANEL: 'update_panel',
  DELETE_PANEL: 'delete_panel',
  
  // Query keys
  RUN_QUERY: 'run_query',
};

// Interface untuk DashboardState
interface DashboardState {
  // Dashboard state
  dashboards: Dashboard[];
  currentDashboard: Dashboard | null;
  
  // Panel state
  currentPanel: Panel | null;
  
  // Query results
  queryResults: Record<string, QueryResult>;
  
  // Dashboard actions
  fetchDashboards: () => Promise<Dashboard[]>;
  fetchDashboard: (id: string) => Promise<Dashboard>;
  createDashboard: (dashboard: Omit<Dashboard, 'id' | 'panels' | 'createdAt' | 'updatedAt'>) => Promise<Dashboard>;
  updateDashboard: (id: string, dashboard: Partial<Dashboard>) => Promise<Dashboard>;
  deleteDashboard: (id: string) => Promise<void>;
  
  // Panel actions
  fetchPanel: (id: string) => Promise<Panel>;
  createPanel: (dashboardId: string, panel: Omit<Panel, 'id' | 'dashboardId' | 'createdAt' | 'updatedAt'>) => Promise<Panel>;
  updatePanel: (id: string, panel: Partial<Panel>) => Promise<Panel>;
  deletePanel: (id: string) => Promise<void>;
  
  // Query actions
  runQueries: (queries: PanelQuery[]) => Promise<Record<string, QueryResult>>;
  
  // Current panel operations
  setCurrentPanel: (panel: Panel | null) => void;
  updateCurrentPanelQuery: (queryId: string, query: Partial<PanelQuery>) => void;
  addQueryToCurrentPanel: (dataSourceId: string) => void;
  removeQueryFromCurrentPanel: (queryId: string) => void;
  
  // Helper untuk cek loading status
  isLoading: (key: string) => boolean;
  
  // Helper untuk cek error
  getError: (key: string) => any;
  clearError: (key: string) => void;
}

// Membuat store untuk Dashboard
export const useDashboardStore = create<DashboardState>((set, get) => {
  // Akses ke API store
  const apiStore = useApiStore;
  
  return {
    // Initial state
    dashboards: [],
    currentDashboard: null,
    currentPanel: null,
    queryResults: {},
    
    // Dashboard methods
    fetchDashboards: async () => {
      try {
        const dashboards = await apiStore.getState().get<Dashboard[]>('/visualizations/dashboards', DASHBOARD_API_KEYS.GET_DASHBOARDS);
        set({ dashboards });
        return dashboards;
      } catch (error) {
        console.error('Error fetching dashboards:', error);
        throw error;
      }
    },
    
    fetchDashboard: async (id) => {
      const key = `${DASHBOARD_API_KEYS.GET_DASHBOARD}_${id}`;
      try {
        const dashboard = await apiStore.getState().get<Dashboard>(`/visualizations/dashboards/${id}`, key);
        set({ currentDashboard: dashboard });
        return dashboard;
      } catch (error) {
        console.error(`Error fetching dashboard with id ${id}:`, error);
        throw error;
      }
    },
    
    createDashboard: async (dashboard) => {
      try {
        // Pastikan panels ada sebagai array kosong jika tidak ada
        const dashboardWithPanels = {
          ...dashboard,
          panels: []
        };
        
        const newDashboard = await apiStore.getState().post<Dashboard>('/visualizations/dashboards', dashboardWithPanels, DASHBOARD_API_KEYS.CREATE_DASHBOARD);
        set(state => ({
          dashboards: [...state.dashboards, newDashboard],
          currentDashboard: newDashboard
        }));
        return newDashboard;
      } catch (error) {
        console.error('Error creating dashboard:', error);
        throw error;
      }
    },
    
    updateDashboard: async (id, dashboard) => {
      const key = `${DASHBOARD_API_KEYS.UPDATE_DASHBOARD}_${id}`;
      try {
        const updatedDashboard = await apiStore.getState().put<Dashboard>(`/visualizations/dashboards/${id}`, dashboard, key);
        set(state => ({
          dashboards: state.dashboards.map(d => d.id === id ? updatedDashboard : d),
          currentDashboard: updatedDashboard
        }));
        return updatedDashboard;
      } catch (error) {
        console.error(`Error updating dashboard with id ${id}:`, error);
        throw error;
      }
    },
    
    deleteDashboard: async (id) => {
      const key = `${DASHBOARD_API_KEYS.DELETE_DASHBOARD}_${id}`;
      try {
        await apiStore.getState().delete<void>(`/visualizations/dashboards/${id}`, key);
        set(state => ({
          dashboards: state.dashboards.filter(d => d.id !== id),
          currentDashboard: state.currentDashboard?.id === id ? null : state.currentDashboard
        }));
      } catch (error) {
        console.error(`Error deleting dashboard with id ${id}:`, error);
        throw error;
      }
    },
    
    // Panel methods
    fetchPanel: async (id) => {
      const key = `${DASHBOARD_API_KEYS.GET_PANEL}_${id}`;
      try {
        const panel = await apiStore.getState().get<Panel>(`/visualizations/panels/${id}`, key);
        set({ currentPanel: panel });
        return panel;
      } catch (error) {
        console.error(`Error fetching panel with id ${id}:`, error);
        throw error;
      }
    },
    
    createPanel: async (dashboardId, panel) => {
      try {
        // Tambahkan dashboardId ke panel
        const panelWithDashboard = {
          ...panel,
          dashboardId
        };
        
        const newPanel = await apiStore.getState().post<Panel>('/visualizations/panels', panelWithDashboard, DASHBOARD_API_KEYS.CREATE_PANEL);
        
        // Update currentDashboard jika panel dibuat untuk dashboard saat ini
        if (get().currentDashboard?.id === dashboardId) {
          set(state => {
            const updatedDashboard = {
              ...state.currentDashboard!,
              panels: [...state.currentDashboard!.panels, newPanel]
            };
            
            return {
              currentDashboard: updatedDashboard,
              dashboards: state.dashboards.map(d => 
                d.id === dashboardId ? updatedDashboard : d
              ),
              currentPanel: newPanel
            };
          });
        }
        
        return newPanel;
      } catch (error) {
        console.error('Error creating panel:', error);
        throw error;
      }
    },
    
    updatePanel: async (id, panel) => {
      const key = `${DASHBOARD_API_KEYS.UPDATE_PANEL}_${id}`;
      try {
        const updatedPanel = await apiStore.getState().put<Panel>(`/visualizations/panels/${id}`, panel, key);
        
        // Update currentPanel jika ini adalah panel yang sedang diedit
        if (get().currentPanel?.id === id) {
          set({ currentPanel: updatedPanel });
        }
        
        // Update dashboard jika panel ini merupakan bagian dari dashboard saat ini
        if (get().currentDashboard) {
          set(state => {
            const dashboardId = updatedPanel.dashboardId;
            const isPanelInCurrentDashboard = state.currentDashboard?.panels.some(p => p.id === id);
            
            if (isPanelInCurrentDashboard) {
              const updatedDashboard = {
                ...state.currentDashboard!,
                panels: state.currentDashboard!.panels.map(p => 
                  p.id === id ? updatedPanel : p
                )
              };
              
              return {
                currentDashboard: updatedDashboard,
                dashboards: state.dashboards.map(d => 
                  d.id === dashboardId ? updatedDashboard : d
                )
              };
            }
            
            return {}; // No changes
          });
        }
        
        return updatedPanel;
      } catch (error) {
        console.error(`Error updating panel with id ${id}:`, error);
        throw error;
      }
    },
    
    deletePanel: async (id) => {
      const key = `${DASHBOARD_API_KEYS.DELETE_PANEL}_${id}`;
      try {
        await apiStore.getState().delete<void>(`/visualizations/panels/${id}`, key);
        
        // Update dashboard jika panel ini merupakan bagian dari dashboard saat ini
        const currentPanel = get().currentPanel;
        if (currentPanel?.id === id && get().currentDashboard) {
          const dashboardId = currentPanel.dashboardId;
          
          set(state => {
            const isPanelInCurrentDashboard = state.currentDashboard?.panels.some(p => p.id === id);
            
            if (isPanelInCurrentDashboard) {
              const updatedDashboard = {
                ...state.currentDashboard!,
                panels: state.currentDashboard!.panels.filter(p => p.id !== id)
              };
              
              return {
                currentDashboard: updatedDashboard,
                dashboards: state.dashboards.map(d => 
                  d.id === dashboardId ? updatedDashboard : d
                ),
                currentPanel: null
              };
            }
            
            return { currentPanel: null }; // Reset current panel
          });
        }
      } catch (error) {
        console.error(`Error deleting panel with id ${id}:`, error);
        throw error;
      }
    },
    
    // Query methods
    runQueries: async (queries) => {
      // Create a unique key for this batch of queries
      const key = `${DASHBOARD_API_KEYS.RUN_QUERY}_${Date.now()}`;
      
      try {
        const results = await apiStore.getState().post<Record<string, QueryResult>>(
          '/visualizations/query',
          { queries },
          key
        );
        
        // Merge dengan hasil yang sudah ada
        set(state => ({
          queryResults: { ...state.queryResults, ...results }
        }));
        
        return results;
      } catch (error) {
        console.error('Error running queries:', error);
        throw error;
      }
    },
    
    // Current panel operations
    setCurrentPanel: (panel) => {
      set({ currentPanel: panel });
    },
    
    updateCurrentPanelQuery: (queryId, queryUpdate) => {
      set(state => {
        if (!state.currentPanel) return {};
        
        const updatedQueries = state.currentPanel.queries.map(q => 
          q.id === queryId ? { ...q, ...queryUpdate } : q
        );
        
        return {
          currentPanel: {
            ...state.currentPanel,
            queries: updatedQueries
          }
        };
      });
    },
    
    addQueryToCurrentPanel: (dataSourceId) => {
      set(state => {
        if (!state.currentPanel) return {};
        
        // Generate temp ID for new query
        const tempId = `temp-${Date.now()}`;
        const refId = String.fromCharCode(65 + state.currentPanel.queries.length); // A, B, C, ...
        
        const newQuery: PanelQuery = {
          id: tempId,
          refId,
          dataSourceId,
          query: '',
          rawQuery: true
        };
        
        return {
          currentPanel: {
            ...state.currentPanel,
            queries: [...state.currentPanel.queries, newQuery]
          }
        };
      });
    },
    
    removeQueryFromCurrentPanel: (queryId) => {
      set(state => {
        if (!state.currentPanel) return {};
        
        return {
          currentPanel: {
            ...state.currentPanel,
            queries: state.currentPanel.queries.filter(q => q.id !== queryId)
          }
        };
      });
    },
    
    // Helper untuk cek loading status
    isLoading: (key) => {
      return apiStore.getState().loading[key] || false;
    },
    
    // Helper untuk cek error
    getError: (key) => {
      return apiStore.getState().errors[key];
    },
    
    // Helper untuk menghapus error
    clearError: (key) => {
      apiStore.getState().clearError(key);
    }
  };
}); 