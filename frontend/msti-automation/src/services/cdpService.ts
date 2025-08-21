import api from './api';

export interface CredentialGroup {
  seedIps: string[];
  username: string;
  password: string;
}

export interface StartDiscoveryPayload {
  name?: string;
  seedIps?: string[];
  credentialGroups?: CredentialGroup[];
  options?: Record<string, unknown>;
}

export const cdpService = {
  async startDiscovery(payload: StartDiscoveryPayload): Promise<{ discoveryId: string }> {
    const { data } = await api.post('/cdp/discover', payload, { timeout: 180000 });
    return data;
  },

  async listDiscoveries() {
    const { data } = await api.get('/cdp/discoveries');
    return data as Array<{ id: string; name?: string; status: string; isSaved: boolean; createdAt: string; finishedAt?: string }>;
  },

  async getDiscovery(id: string) {
    const { data } = await api.get(`/cdp/discoveries/${id}`);
    return data as { id: string; name?: string; status: string; isSaved: boolean; createdAt: string; finishedAt?: string; _count?: { nodes: number; links: number } };
  },

  async getDiscoveryGraph(id: string) {
    const { data } = await api.get(`/cdp/discoveries/${id}/graph`);
    return data as { nodes: Array<{ id: string; label: string; mgmtIp?: string }>; links: Array<{ id: string; source: string; target: string; linkType?: string }> };
  },

  async saveDiscovery(id: string) {
    const { data } = await api.post(`/cdp/discoveries/${id}/save`);
    return data as { success: boolean };
  },

  async deleteDiscovery(id: string) {
    const { data } = await api.delete(`/cdp/discoveries/${id}`);
    return data as { success: boolean };
  },

  async updateDiscoveryGraph(id: string, graph: { nodes: Array<{ id: string; label: string; mgmtIp?: string; type?: string }>; links: Array<{ id: string; source: string; target: string; linkType?: string }> }) {
    const { data } = await api.put(`/cdp/discoveries/${id}/graph`, { graph });
    return data as { success: boolean };
  },
};

export default cdpService;


