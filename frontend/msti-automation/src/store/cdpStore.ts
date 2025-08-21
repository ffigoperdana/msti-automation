import { create } from 'zustand';
import cdpService, { StartDiscoveryPayload } from '../services/cdpService';

export type CdpDiscoverySummary = { id: string; name?: string; status: string; isSaved: boolean; createdAt: string; finishedAt?: string };
export type GraphNode = { id: string; label: string; mgmtIp?: string; x?: number; y?: number };
export type GraphLink = { id: string; source: string; target: string; linkType?: string };
export type ProgressEvent = { type: 'progress' | 'node' | 'link' | 'done' | 'error'; message?: string; percent?: number; payload?: any; ts: string };

interface CdpState {
  discoveries: CdpDiscoverySummary[];
  selectedDiscovery?: { id: string; name?: string; status: string; isSaved: boolean; createdAt: string; finishedAt?: string; _count?: { nodes: number; links: number } };
  graph?: { nodes: GraphNode[]; links: GraphLink[] };
  progressEvents: ProgressEvent[];
  loading: { list: boolean; detail: boolean; graph: boolean; start: boolean };
  fetchList: () => Promise<void>;
  startDiscovery: (payload: StartDiscoveryPayload) => Promise<string>;
  fetchDetail: (id: string) => Promise<void>;
  fetchGraph: (id: string) => Promise<void>;
  deleteDiscovery: (id: string) => Promise<void>;
  saveDiscovery: (id: string) => Promise<void>;
  saveGraphLayout: (id: string) => Promise<void>;
  updatePositions: (pos: Record<string, { x: number; y: number }>) => void;
  clear: () => void;
}

const useCdpStore = create<CdpState>((set, get) => ({
  discoveries: [],
  progressEvents: [],
  loading: { list: false, detail: false, graph: false, start: false },

  async fetchList() {
    set((s) => ({ loading: { ...s.loading, list: true } }));
    try {
      const items = await cdpService.listDiscoveries();
      set({ discoveries: items });
    } finally {
      set((s) => ({ loading: { ...s.loading, list: false } }));
    }
  },

  async startDiscovery(payload) {
    set((s) => ({ loading: { ...s.loading, start: true } }));
    try {
      const { discoveryId } = await cdpService.startDiscovery(payload);
      return discoveryId;
    } finally {
      set((s) => ({ loading: { ...s.loading, start: false } }));
    }
  },

  async fetchDetail(id) {
    set((s) => ({ loading: { ...s.loading, detail: true } }));
    try {
      const item = await cdpService.getDiscovery(id);
      set({ selectedDiscovery: item });
    } finally {
      set((s) => ({ loading: { ...s.loading, detail: false } }));
    }
  },

  async fetchGraph(id) {
    set((s) => ({ loading: { ...s.loading, graph: true } }));
    try {
      const graph = await cdpService.getDiscoveryGraph(id);
      set({ graph });
    } finally {
      set((s) => ({ loading: { ...s.loading, graph: false } }));
    }
  },

  async deleteDiscovery(id) {
    await cdpService.deleteDiscovery(id);
    const { discoveries } = get();
    set({ discoveries: discoveries.filter((d) => d.id !== id) });
  },

  async saveDiscovery(id) {
    await cdpService.saveDiscovery(id);
    const { selectedDiscovery } = get();
    if (selectedDiscovery && selectedDiscovery.id === id) {
      set({ selectedDiscovery: { ...selectedDiscovery, isSaved: true } });
    }
  },

  async saveGraphLayout(id) {
    const { graph } = get();
    if (!graph) return;
    await cdpService.updateDiscoveryGraph(id, graph as any);
  },

  updatePositions(pos) {
    const { graph, selectedDiscovery } = get();
    if (!graph) return;
    const nodes = graph.nodes.map((n) => ({ ...n, x: pos[n.id]?.x ?? n.x, y: pos[n.id]?.y ?? n.y }));
    set({ graph: { ...graph, nodes } });
    if (selectedDiscovery) {
      set({ selectedDiscovery: { ...selectedDiscovery, isSaved: false } });
    }
  },

  clear() {
    set({ selectedDiscovery: undefined, graph: undefined, progressEvents: [] });
  },
}));

export default useCdpStore;


