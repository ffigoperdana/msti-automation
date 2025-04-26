import { create } from 'zustand';
import { useApiStore } from './apiStore';

// Tipe data untuk Ansible Server
export interface AnsibleServer {
  id: string;
  name: string;
  url: string;
  username?: string;
  password?: string;
  sshKey?: string;
  status: 'online' | 'offline' | 'error';
  createdAt: string;
  updatedAt: string;
}

// Tipe data untuk Ansible Config
export interface AnsibleConfig {
  id: string;
  name: string;
  serverId: string;
  configPath: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// Tipe data untuk Ansible Inventory
export interface AnsibleInventory {
  id: string;
  name: string;
  serverId: string;
  content: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// Tipe data untuk Ansible Scenario (atau Playbook)
export interface AnsibleScenario {
  id: string;
  name: string;
  serverId: string;
  inventoryId: string;
  configId?: string;
  playbookPath: string;
  description?: string;
  lastRunStatus?: 'success' | 'failed' | 'running' | 'none';
  lastRunTime?: string;
  createdAt: string;
  updatedAt: string;
}

// API keys untuk automasi Ansible
export const ANSIBLE_API_KEYS = {
  // Server keys
  GET_SERVERS: 'get_ansible_servers',
  GET_SERVER: 'get_ansible_server',
  CREATE_SERVER: 'create_ansible_server',
  UPDATE_SERVER: 'update_ansible_server',
  DELETE_SERVER: 'delete_ansible_server',
  CHECK_SERVER: 'check_ansible_server',
  
  // Config keys
  GET_CONFIGS: 'get_ansible_configs',
  GET_CONFIG: 'get_ansible_config',
  CREATE_CONFIG: 'create_ansible_config',
  UPDATE_CONFIG: 'update_ansible_config',
  DELETE_CONFIG: 'delete_ansible_config',
  
  // Inventory keys
  GET_INVENTORIES: 'get_ansible_inventories',
  GET_INVENTORY: 'get_ansible_inventory',
  CREATE_INVENTORY: 'create_ansible_inventory',
  UPDATE_INVENTORY: 'update_ansible_inventory',
  DELETE_INVENTORY: 'delete_ansible_inventory',
  
  // Scenario/Playbook keys
  GET_SCENARIOS: 'get_ansible_scenarios',
  GET_SCENARIO: 'get_ansible_scenario',
  CREATE_SCENARIO: 'create_ansible_scenario',
  UPDATE_SCENARIO: 'update_ansible_scenario',
  DELETE_SCENARIO: 'delete_ansible_scenario',
  RUN_SCENARIO: 'run_ansible_scenario',
  GET_SCENARIO_LOGS: 'get_ansible_scenario_logs',
};

// Interface untuk state Ansible
interface AnsibleState {
  // Server state
  servers: AnsibleServer[];
  currentServer: AnsibleServer | null;
  
  // Config state
  configs: AnsibleConfig[];
  currentConfig: AnsibleConfig | null;
  
  // Inventory state
  inventories: AnsibleInventory[];
  currentInventory: AnsibleInventory | null;
  
  // Scenario state
  scenarios: AnsibleScenario[];
  currentScenario: AnsibleScenario | null;
  scenarioLogs: Record<string, string>;
  
  // Server actions
  fetchServers: () => Promise<AnsibleServer[]>;
  fetchServer: (id: string) => Promise<AnsibleServer>;
  createServer: (server: Omit<AnsibleServer, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<AnsibleServer>;
  updateServer: (id: string, server: Partial<AnsibleServer>) => Promise<AnsibleServer>;
  deleteServer: (id: string) => Promise<void>;
  checkServerStatus: (id: string) => Promise<'online' | 'offline' | 'error'>;
  
  // Config actions
  fetchConfigs: (serverId?: string) => Promise<AnsibleConfig[]>;
  fetchConfig: (id: string) => Promise<AnsibleConfig>;
  createConfig: (config: Omit<AnsibleConfig, 'id' | 'createdAt' | 'updatedAt'>) => Promise<AnsibleConfig>;
  updateConfig: (id: string, config: Partial<AnsibleConfig>) => Promise<AnsibleConfig>;
  deleteConfig: (id: string) => Promise<void>;
  
  // Inventory actions
  fetchInventories: (serverId?: string) => Promise<AnsibleInventory[]>;
  fetchInventory: (id: string) => Promise<AnsibleInventory>;
  createInventory: (inventory: Omit<AnsibleInventory, 'id' | 'createdAt' | 'updatedAt'>) => Promise<AnsibleInventory>;
  updateInventory: (id: string, inventory: Partial<AnsibleInventory>) => Promise<AnsibleInventory>;
  deleteInventory: (id: string) => Promise<void>;
  
  // Scenario actions
  fetchScenarios: (serverId?: string) => Promise<AnsibleScenario[]>;
  fetchScenario: (id: string) => Promise<AnsibleScenario>;
  createScenario: (scenario: Omit<AnsibleScenario, 'id' | 'lastRunStatus' | 'lastRunTime' | 'createdAt' | 'updatedAt'>) => Promise<AnsibleScenario>;
  updateScenario: (id: string, scenario: Partial<AnsibleScenario>) => Promise<AnsibleScenario>;
  deleteScenario: (id: string) => Promise<void>;
  runScenario: (id: string) => Promise<void>;
  fetchScenarioLogs: (id: string) => Promise<string>;
  
  // Helper untuk mengecek status loading
  isLoading: (key: string) => boolean;
  
  // Helper untuk mengecek error
  getError: (key: string) => any;
  clearError: (key: string) => void;
}

// Membuat store untuk Ansible
export const useAnsibleStore = create<AnsibleState>((set, get) => {
  // Akses ke API store
  const apiStore = useApiStore;
  
  return {
    // Initial state
    servers: [],
    currentServer: null,
    configs: [],
    currentConfig: null,
    inventories: [],
    currentInventory: null,
    scenarios: [],
    currentScenario: null,
    scenarioLogs: {},
    
    // Server methods
    fetchServers: async () => {
      try {
        const servers = await apiStore.getState().get<AnsibleServer[]>('/ansible-configs/servers', ANSIBLE_API_KEYS.GET_SERVERS);
        set({ servers });
        return servers;
      } catch (error) {
        console.error('Error fetching Ansible servers:', error);
        throw error;
      }
    },
    
    fetchServer: async (id: string) => {
      const key = `${ANSIBLE_API_KEYS.GET_SERVER}_${id}`;
      try {
        const server = await apiStore.getState().get<AnsibleServer>(`/ansible-configs/servers/${id}`, key);
        set({ currentServer: server });
        return server;
      } catch (error) {
        console.error(`Error fetching Ansible server with id ${id}:`, error);
        throw error;
      }
    },
    
    createServer: async (server) => {
      try {
        const newServer = await apiStore.getState().post<AnsibleServer>('/ansible-configs/servers', server, ANSIBLE_API_KEYS.CREATE_SERVER);
        set(state => ({ 
          servers: [...state.servers, newServer],
          currentServer: newServer
        }));
        return newServer;
      } catch (error) {
        console.error('Error creating Ansible server:', error);
        throw error;
      }
    },
    
    updateServer: async (id, server) => {
      const key = `${ANSIBLE_API_KEYS.UPDATE_SERVER}_${id}`;
      try {
        const updatedServer = await apiStore.getState().put<AnsibleServer>(`/ansible-configs/servers/${id}`, server, key);
        set(state => ({
          servers: state.servers.map(s => s.id === id ? updatedServer : s),
          currentServer: updatedServer
        }));
        return updatedServer;
      } catch (error) {
        console.error(`Error updating Ansible server with id ${id}:`, error);
        throw error;
      }
    },
    
    deleteServer: async (id) => {
      const key = `${ANSIBLE_API_KEYS.DELETE_SERVER}_${id}`;
      try {
        await apiStore.getState().delete<void>(`/ansible-configs/servers/${id}`, key);
        set(state => ({
          servers: state.servers.filter(s => s.id !== id),
          currentServer: state.currentServer?.id === id ? null : state.currentServer
        }));
      } catch (error) {
        console.error(`Error deleting Ansible server with id ${id}:`, error);
        throw error;
      }
    },
    
    checkServerStatus: async (id) => {
      const key = `${ANSIBLE_API_KEYS.CHECK_SERVER}_${id}`;
      try {
        const status = await apiStore.getState().get<{status: 'online' | 'offline' | 'error'}>(`/ansible-configs/servers/${id}/check`, key);
        set(state => ({
          servers: state.servers.map(s => s.id === id ? {...s, status: status.status} : s),
          currentServer: state.currentServer?.id === id ? {...state.currentServer, status: status.status} : state.currentServer
        }));
        return status.status;
      } catch (error) {
        console.error(`Error checking Ansible server status with id ${id}:`, error);
        throw error;
      }
    },
    
    // Config methods
    fetchConfigs: async (serverId) => {
      const url = serverId ? `/ansible-configs/servers/${serverId}/configs` : '/ansible-configs/configs';
      try {
        const configs = await apiStore.getState().get<AnsibleConfig[]>(url, ANSIBLE_API_KEYS.GET_CONFIGS);
        set({ configs });
        return configs;
      } catch (error) {
        console.error('Error fetching Ansible configs:', error);
        throw error;
      }
    },
    
    fetchConfig: async (id) => {
      const key = `${ANSIBLE_API_KEYS.GET_CONFIG}_${id}`;
      try {
        const config = await apiStore.getState().get<AnsibleConfig>(`/ansible-configs/configs/${id}`, key);
        set({ currentConfig: config });
        return config;
      } catch (error) {
        console.error(`Error fetching Ansible config with id ${id}:`, error);
        throw error;
      }
    },
    
    createConfig: async (config) => {
      try {
        const newConfig = await apiStore.getState().post<AnsibleConfig>('/ansible-configs/configs', config, ANSIBLE_API_KEYS.CREATE_CONFIG);
        set(state => ({ 
          configs: [...state.configs, newConfig],
          currentConfig: newConfig
        }));
        return newConfig;
      } catch (error) {
        console.error('Error creating Ansible config:', error);
        throw error;
      }
    },
    
    updateConfig: async (id, config) => {
      const key = `${ANSIBLE_API_KEYS.UPDATE_CONFIG}_${id}`;
      try {
        const updatedConfig = await apiStore.getState().put<AnsibleConfig>(`/ansible-configs/configs/${id}`, config, key);
        set(state => ({
          configs: state.configs.map(c => c.id === id ? updatedConfig : c),
          currentConfig: updatedConfig
        }));
        return updatedConfig;
      } catch (error) {
        console.error(`Error updating Ansible config with id ${id}:`, error);
        throw error;
      }
    },
    
    deleteConfig: async (id) => {
      const key = `${ANSIBLE_API_KEYS.DELETE_CONFIG}_${id}`;
      try {
        await apiStore.getState().delete<void>(`/ansible-configs/configs/${id}`, key);
        set(state => ({
          configs: state.configs.filter(c => c.id !== id),
          currentConfig: state.currentConfig?.id === id ? null : state.currentConfig
        }));
      } catch (error) {
        console.error(`Error deleting Ansible config with id ${id}:`, error);
        throw error;
      }
    },
    
    // Inventory methods
    fetchInventories: async (serverId) => {
      const url = serverId ? `/ansible-configs/servers/${serverId}/inventories` : '/ansible-configs/inventories';
      try {
        const inventories = await apiStore.getState().get<AnsibleInventory[]>(url, ANSIBLE_API_KEYS.GET_INVENTORIES);
        set({ inventories });
        return inventories;
      } catch (error) {
        console.error('Error fetching Ansible inventories:', error);
        throw error;
      }
    },
    
    fetchInventory: async (id) => {
      const key = `${ANSIBLE_API_KEYS.GET_INVENTORY}_${id}`;
      try {
        const inventory = await apiStore.getState().get<AnsibleInventory>(`/ansible-configs/inventories/${id}`, key);
        set({ currentInventory: inventory });
        return inventory;
      } catch (error) {
        console.error(`Error fetching Ansible inventory with id ${id}:`, error);
        throw error;
      }
    },
    
    createInventory: async (inventory) => {
      try {
        const newInventory = await apiStore.getState().post<AnsibleInventory>('/ansible-configs/inventories', inventory, ANSIBLE_API_KEYS.CREATE_INVENTORY);
        set(state => ({ 
          inventories: [...state.inventories, newInventory],
          currentInventory: newInventory
        }));
        return newInventory;
      } catch (error) {
        console.error('Error creating Ansible inventory:', error);
        throw error;
      }
    },
    
    updateInventory: async (id, inventory) => {
      const key = `${ANSIBLE_API_KEYS.UPDATE_INVENTORY}_${id}`;
      try {
        const updatedInventory = await apiStore.getState().put<AnsibleInventory>(`/ansible-configs/inventories/${id}`, inventory, key);
        set(state => ({
          inventories: state.inventories.map(i => i.id === id ? updatedInventory : i),
          currentInventory: updatedInventory
        }));
        return updatedInventory;
      } catch (error) {
        console.error(`Error updating Ansible inventory with id ${id}:`, error);
        throw error;
      }
    },
    
    deleteInventory: async (id) => {
      const key = `${ANSIBLE_API_KEYS.DELETE_INVENTORY}_${id}`;
      try {
        await apiStore.getState().delete<void>(`/ansible-configs/inventories/${id}`, key);
        set(state => ({
          inventories: state.inventories.filter(i => i.id !== id),
          currentInventory: state.currentInventory?.id === id ? null : state.currentInventory
        }));
      } catch (error) {
        console.error(`Error deleting Ansible inventory with id ${id}:`, error);
        throw error;
      }
    },
    
    // Scenario/Playbook methods
    fetchScenarios: async (serverId) => {
      const url = serverId ? `/ansible-configs/servers/${serverId}/scenarios` : '/ansible-configs/scenarios';
      try {
        const scenarios = await apiStore.getState().get<AnsibleScenario[]>(url, ANSIBLE_API_KEYS.GET_SCENARIOS);
        set({ scenarios });
        return scenarios;
      } catch (error) {
        console.error('Error fetching Ansible scenarios:', error);
        throw error;
      }
    },
    
    fetchScenario: async (id) => {
      const key = `${ANSIBLE_API_KEYS.GET_SCENARIO}_${id}`;
      try {
        const scenario = await apiStore.getState().get<AnsibleScenario>(`/ansible-configs/scenarios/${id}`, key);
        set({ currentScenario: scenario });
        return scenario;
      } catch (error) {
        console.error(`Error fetching Ansible scenario with id ${id}:`, error);
        throw error;
      }
    },
    
    createScenario: async (scenario) => {
      try {
        const newScenario = await apiStore.getState().post<AnsibleScenario>('/ansible-configs/scenarios', scenario, ANSIBLE_API_KEYS.CREATE_SCENARIO);
        set(state => ({ 
          scenarios: [...state.scenarios, newScenario],
          currentScenario: newScenario
        }));
        return newScenario;
      } catch (error) {
        console.error('Error creating Ansible scenario:', error);
        throw error;
      }
    },
    
    updateScenario: async (id, scenario) => {
      const key = `${ANSIBLE_API_KEYS.UPDATE_SCENARIO}_${id}`;
      try {
        const updatedScenario = await apiStore.getState().put<AnsibleScenario>(`/ansible-configs/scenarios/${id}`, scenario, key);
        set(state => ({
          scenarios: state.scenarios.map(s => s.id === id ? updatedScenario : s),
          currentScenario: updatedScenario
        }));
        return updatedScenario;
      } catch (error) {
        console.error(`Error updating Ansible scenario with id ${id}:`, error);
        throw error;
      }
    },
    
    deleteScenario: async (id) => {
      const key = `${ANSIBLE_API_KEYS.DELETE_SCENARIO}_${id}`;
      try {
        await apiStore.getState().delete<void>(`/ansible-configs/scenarios/${id}`, key);
        set(state => ({
          scenarios: state.scenarios.filter(s => s.id !== id),
          currentScenario: state.currentScenario?.id === id ? null : state.currentScenario
        }));
      } catch (error) {
        console.error(`Error deleting Ansible scenario with id ${id}:`, error);
        throw error;
      }
    },
    
    runScenario: async (id) => {
      const key = `${ANSIBLE_API_KEYS.RUN_SCENARIO}_${id}`;
      try {
        await apiStore.getState().post<void>(`/ansible-configs/scenarios/${id}/run`, {}, key);
        
        // Update status to running
        set(state => ({
          scenarios: state.scenarios.map(s => s.id === id ? {...s, lastRunStatus: 'running', lastRunTime: new Date().toISOString()} : s),
          currentScenario: state.currentScenario?.id === id 
            ? {...state.currentScenario, lastRunStatus: 'running', lastRunTime: new Date().toISOString()} 
            : state.currentScenario
        }));
      } catch (error) {
        console.error(`Error running Ansible scenario with id ${id}:`, error);
        
        // Update status to failed on error
        set(state => ({
          scenarios: state.scenarios.map(s => s.id === id ? {...s, lastRunStatus: 'failed'} : s),
          currentScenario: state.currentScenario?.id === id 
            ? {...state.currentScenario, lastRunStatus: 'failed'} 
            : state.currentScenario
        }));
        
        throw error;
      }
    },
    
    fetchScenarioLogs: async (id) => {
      const key = `${ANSIBLE_API_KEYS.GET_SCENARIO_LOGS}_${id}`;
      try {
        const response = await apiStore.getState().get<{logs: string}>(`/ansible-configs/scenarios/${id}/logs`, key);
        
        set(state => ({
          scenarioLogs: { ...state.scenarioLogs, [id]: response.logs }
        }));
        
        return response.logs;
      } catch (error) {
        console.error(`Error fetching logs for Ansible scenario with id ${id}:`, error);
        throw error;
      }
    },
    
    // Helper untuk cek loading status
    isLoading: (key: string) => {
      return apiStore.getState().loading[key] || false;
    },
    
    // Helper untuk mengambil error
    getError: (key: string) => {
      return apiStore.getState().errors[key];
    },
    
    // Helper untuk menghapus error
    clearError: (key: string) => {
      apiStore.getState().clearError(key);
    }
  };
}); 