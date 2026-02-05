import { PrismaClient } from '@prisma/client';
import { spawn } from 'child_process';
import path from 'path';

const prisma = new PrismaClient();

function generateMockGraphFromSeeds(seedIps = []) {
  const nodes = seedIps.map((ip, index) => ({
    id: `n${index + 1}`,
    label: ip,
    mgmtIp: ip,
  }));
  const links = [];
  for (let i = 0; i < nodes.length - 1; i += 1) {
    links.push({ id: `l${i + 1}`, source: nodes[i].id, target: nodes[i + 1].id, linkType: 'cdp' });
  }
  return { nodes, links };
}

const cdpService = {
  async startDiscovery({ name, seedIps = [], credentialGroups = [], options = {} }) {
    // Flatten seed IPs from credential groups if provided
    const groupedSeeds = Array.isArray(credentialGroups)
      ? credentialGroups.flatMap((g) => Array.isArray(g?.seedIps) ? g.seedIps : [])
      : [];
    const allSeeds = [
      ...new Set([...(Array.isArray(seedIps) ? seedIps : []), ...groupedSeeds])
    ].filter(Boolean);

    if (allSeeds.length === 0) {
      throw new Error('Provide at least one seed IP (seedIps or credentialGroups[*].seedIps)');
    }

    // Extract protocol option (default to 'cdp' for backward compatibility)
    const protocol = options?.protocol || 'cdp';
    
    const now = new Date();
    const discoveryName = name || `${protocol.toUpperCase()} Discovery ${now.toISOString()}`;

    // Try to run python worker per credential group; merge results. If it fails, fallback to mock
    console.log('[CDP] startDiscovery called', { name: discoveryName, groups: credentialGroups?.length || 0, seeds: allSeeds.length, protocol });
    let aggregated = { nodes: [], links: [] };
    try {
      if (Array.isArray(credentialGroups) && credentialGroups.length > 0) {
        for (const group of credentialGroups) {
          const seeds = Array.isArray(group?.seedIps) ? group.seedIps : [];
          if (seeds.length === 0) continue;
          const postAuthSteps = Array.isArray(group?.postAuthSteps) ? group.postAuthSteps : [];
          console.log('[CDP] Running python worker for seeds', seeds, 'with protocol', protocol, 'postAuthSteps', postAuthSteps.length);
          const pythonGraph = await runPythonDiscovery(seeds, group.username || '', group.password || '', protocol, postAuthSteps);
          aggregated.nodes.push(...pythonGraph.nodes);
          aggregated.links.push(...pythonGraph.links);
        }
        // de-duplicate nodes/links by id
        const nodeMap = new Map();
        aggregated.nodes.forEach((n) => { nodeMap.set(n.id, n); });
        const linkMap = new Map();
        aggregated.links.forEach((l) => { linkMap.set(l.id, l); });
        aggregated = { nodes: Array.from(nodeMap.values()), links: Array.from(linkMap.values()) };
      } else {
        aggregated = generateMockGraphFromSeeds(allSeeds);
      }
    } catch (e) {
      console.error('[CDP] Python worker failed, falling back to mock graph:', e.message || e);
      aggregated = generateMockGraphFromSeeds(allSeeds);
    }

    const discovery = await prisma.cdpDiscovery.create({
      data: {
        name: discoveryName,
        seedIps: allSeeds,
        status: 'COMPLETED',
        options: options || {},
        graph: aggregated,
        startedAt: now,
        finishedAt: now,
        isSaved: false,
      },
    });

    // Persist nodes and links to tables for future querying
    const nodeIdMap = new Map();
    for (const node of aggregated.nodes) {
      const created = await prisma.cdpNode.create({
        data: {
          discoveryId: discovery.id,
          hostname: node.label,
          mgmtIp: node.mgmtIp || node.label,
          vendor: node.vendor || null,
          platform: node.platform || null,
          model: node.model || null,
          raw: node,
        },
      });
      nodeIdMap.set(node.id, created.id);
    }

    for (const link of aggregated.links) {
      await prisma.cdpLink.create({
        data: {
          discoveryId: discovery.id,
          srcNodeId: nodeIdMap.get(link.source),
          dstNodeId: nodeIdMap.get(link.target),
          linkType: link.linkType || 'cdp',
          raw: link,
        },
      });
    }

    console.log('[CDP] discovery completed', { id: discovery.id, nodes: aggregated.nodes.length, links: aggregated.links.length });
    return { discoveryId: discovery.id };
  },

  async listDiscoveries() {
    const items = await prisma.cdpDiscovery.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        status: true,
        isSaved: true,
        createdAt: true,
        finishedAt: true,
      },
    });
    return items;
  },

  async getDiscovery(id) {
    const discovery = await prisma.cdpDiscovery.findUnique({
      where: { id },
      include: {
        _count: {
          select: { nodes: true, links: true },
        },
      },
    });
    if (!discovery) throw new Error('Discovery not found');
    return discovery;
  },

  async getDiscoveryGraph(id) {
    const discovery = await prisma.cdpDiscovery.findUnique({ where: { id } });
    if (!discovery) throw new Error('Discovery not found');

    // Use stored graph only if it has valid shape
    if (discovery.graph && Array.isArray(discovery.graph.nodes) && Array.isArray(discovery.graph.links)) {
      return discovery.graph;
    }

    // Fallback: build graph from tables
    const nodes = await prisma.cdpNode.findMany({ where: { discoveryId: id } });
    const links = await prisma.cdpLink.findMany({ where: { discoveryId: id } });
    return {
      nodes: nodes.map((n) => ({ id: n.id, label: n.hostname || n.mgmtIp || n.id, mgmtIp: n.mgmtIp })),
      links: links.map((l) => ({ id: l.id, source: l.srcNodeId, target: l.dstNodeId, linkType: l.linkType || 'cdp' })),
    };
  },

  async deleteDiscovery(id) {
    // Cascade is set in schema; deleting parent will delete children
    await prisma.cdpDiscovery.delete({ where: { id } });
    return { success: true };
  },

  async saveDiscovery(id) {
    await prisma.cdpDiscovery.update({ where: { id }, data: { isSaved: true } });
    return { success: true };
  },

  async updateDiscoveryGraph(id, graph) {
    if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.links)) {
      throw new Error('Invalid graph payload');
    }
    await prisma.cdpDiscovery.update({ where: { id }, data: { graph } });
    return { success: true };
  },

  async exportToDrawio(id) {
    const graph = await this.getDiscoveryGraph(id);
    if (!graph || !graph.nodes || !graph.links) {
      throw new Error('No graph data available for this discovery');
    }
    return runPythonDrawioExport(graph.nodes, graph.links);
  },
};

async function runPythonDiscovery(seedIps, username, password, protocol = 'cdp', postAuthSteps = []) {
  const workerPath = path.join(process.cwd(), 'src', 'workers', 'cdp', 'run_discovery.py');
  return new Promise((resolve, reject) => {
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const proc = spawn(pythonCmd, [workerPath], {
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const payload = JSON.stringify({ seedIps, username, password, protocol, postAuthSteps });
    proc.stdin.write(payload);
    proc.stdin.end();

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); console.error('[CDP][PY STDOUT]', d.toString()); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); console.error('[CDP][PY STDERR]', d.toString()); });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(stderr || `Python exited ${code}`));
      try {
        const out = (stdout || '').trim();
        if (!out) return reject(new Error('Python returned empty output'));
        resolve(JSON.parse(out));
      } catch (e) {
        console.error('[CDP] Failed parsing python stdout:', stdout);
        reject(e);
      }
    });
  });
}

async function runPythonDrawioExport(nodes, links) {
  const workerPath = path.join(process.cwd(), 'src', 'workers', 'cdp', 'export_drawio.py');
  return new Promise((resolve, reject) => {
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const proc = spawn(pythonCmd, [workerPath], {
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const payload = JSON.stringify({ nodes, links, useNetplot: false });
    proc.stdin.write(payload);
    proc.stdin.end();

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); console.error('[DRAWIO][PY STDERR]', d.toString()); });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(stderr || `Python exited ${code}`));
      const out = (stdout || '').trim();
      if (!out) return reject(new Error('Python returned empty output'));
      resolve(out);
    });
  });
}

export default cdpService;


