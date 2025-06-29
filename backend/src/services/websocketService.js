import { WebSocketServer } from 'ws';
import metricService from './metricService.js';

class WebSocketService {
  constructor() {
    this.clients = new Set();
    this.metricIntervals = new Map(); // Menyimpan interval untuk setiap client
  }

  initialize(server) {
    if (!server) {
      throw new Error('HTTP server is required for WebSocket initialization');
    }
    
    this.wss = new WebSocketServer({ 
      server: server,
      perMessageDeflate: false // Disable compression for better performance
    });

    this.wss.on('connection', (ws) => {
      console.log('New client connected');
      this.clients.add(ws);

      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(ws, data);
        } catch (error) {
          console.error('Error handling message:', error);
          ws.send(JSON.stringify({ error: 'Invalid message format' }));
        }
      });

      ws.on('close', () => {
        console.log('Client disconnected');
        this.clients.delete(ws);
        // Bersihkan interval yang terkait dengan client
        this.clearClientIntervals(ws);
      });

      // Kirim pesan welcome
      ws.send(JSON.stringify({ type: 'info', message: 'Connected to MSTI monitoring server' }));
    });
  }

  async handleMessage(ws, data) {
    switch (data.type) {
      case 'subscribe':
        await this.handleSubscription(ws, data);
        break;
      case 'unsubscribe':
        this.handleUnsubscription(ws, data);
        break;
      default:
        ws.send(JSON.stringify({ error: 'Unknown message type' }));
    }
  }

  async handleSubscription(ws, data) {
    const { dataSourceId, queryConfig, refreshInterval = 10000 } = data;
    
    // Buat ID unik untuk subscription ini
    const subscriptionId = `${dataSourceId}-${JSON.stringify(queryConfig)}`;
    
    // Hapus interval yang ada jika sudah ada
    this.clearSubscriptionInterval(ws, subscriptionId);

    // Buat interval baru untuk query metrics
    const intervalId = setInterval(async () => {
      try {
        const result = await metricService.executeFluxQuery(
          dataSourceId,
          queryConfig.query,
          queryConfig.variables
        );

        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({
            type: 'metric_update',
            subscriptionId,
            data: result
          }));
        }
      } catch (error) {
        console.error('Error fetching metrics:', error);
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({
            type: 'error',
            subscriptionId,
            error: 'Failed to fetch metrics'
          }));
        }
      }
    }, refreshInterval);

    // Simpan interval untuk client ini
    if (!this.metricIntervals.has(ws)) {
      this.metricIntervals.set(ws, new Map());
    }
    this.metricIntervals.get(ws).set(subscriptionId, intervalId);

    // Kirim data pertama kali
    const initialData = await metricService.executeFluxQuery(
      dataSourceId,
      queryConfig.query,
      queryConfig.variables
    );
    
    ws.send(JSON.stringify({
      type: 'metric_update',
      subscriptionId,
      data: initialData
    }));
  }

  handleUnsubscription(ws, data) {
    const { subscriptionId } = data;
    this.clearSubscriptionInterval(ws, subscriptionId);
  }

  clearSubscriptionInterval(ws, subscriptionId) {
    const clientIntervals = this.metricIntervals.get(ws);
    if (clientIntervals && clientIntervals.has(subscriptionId)) {
      clearInterval(clientIntervals.get(subscriptionId));
      clientIntervals.delete(subscriptionId);
    }
  }

  clearClientIntervals(ws) {
    const clientIntervals = this.metricIntervals.get(ws);
    if (clientIntervals) {
      for (const intervalId of clientIntervals.values()) {
        clearInterval(intervalId);
      }
      this.metricIntervals.delete(ws);
    }
  }

  broadcast(message) {
    for (const client of this.clients) {
      if (client.readyState === client.OPEN) {
        client.send(JSON.stringify(message));
      }
    }
  }
}

export default new WebSocketService(); 