import { InfluxDB } from '@influxdata/influxdb-client';

class FlowAnalyticService {
  async executeFlowQueries(dataSource, sourceQuery, destinationQuery) {
    try {
      console.log('=== FLOW ANALYTIC EXECUTION START ===');
      console.log('Data Source:', dataSource.name, dataSource.url);
      console.log('Source Query:', sourceQuery);
      console.log('Destination Query:', destinationQuery);
      
      // Create InfluxDB client
      const client = new InfluxDB({
        url: dataSource.url,
        token: dataSource.token,
      });

      const queryApi = client.getQueryApi(dataSource.organization);

      // Execute source query
      console.log('Executing source query...');
      const sourceData = await this.executeQuery(queryApi, sourceQuery);
      console.log('Source data received:', sourceData.length, 'records');
      console.log('Source data sample:', JSON.stringify(sourceData.slice(0, 3), null, 2));
      
      // Execute destination query
      console.log('Executing destination query...');
      const destinationData = await this.executeQuery(queryApi, destinationQuery);
      console.log('Destination data received:', destinationData.length, 'records');
      console.log('Destination data sample:', JSON.stringify(destinationData.slice(0, 3), null, 2));

      // Process and format the results
      const result = this.formatFlowData(sourceData, destinationData);
      
      console.log('=== FORMATTED RESULT ===');
      console.log('Nodes:', JSON.stringify(result.nodes, null, 2));
      console.log('Links:', JSON.stringify(result.links, null, 2));
      console.log('=== FLOW ANALYTIC EXECUTION END ===');

      return result;
    } catch (error) {
      console.error('Error executing flow queries:', error);
      throw error;
    }
  }

  async executeQuery(queryApi, query) {
    return new Promise((resolve, reject) => {
      const rows = [];
      queryApi.queryRows(query, {
        next(row, tableMeta) {
          const o = tableMeta.toObject(row);
          rows.push(o);
        },
        error(error) {
          reject(error);
        },
        complete() {
          resolve(rows);
        },
      });
    });
  }

  formatFlowData(sourceData, destinationData) {
    // Extract source and destination IPs from the query results
    const sourceInfo = this.extractFlowInfo(sourceData, 'source');
    const destinationInfo = this.extractFlowInfo(destinationData, 'destination');

    // Build the flow path visualization data
    const nodes = [];
    const links = [];

    // Create source node
    if (sourceInfo.ip) {
      nodes.push({
        id: sourceInfo.ip,
        label: sourceInfo.ip,
        mgmtIp: sourceInfo.ip,
        type: sourceInfo.type || 'vm',
        role: 'source',
      });
    }

    // Create gateway node (middle node - typically the switch/router)
    const gatewayIp = sourceInfo.gateway || 'GATEWAY';
    const gatewayLabel = sourceInfo.gatewayName || gatewayIp;
    nodes.push({
      id: gatewayIp,
      label: gatewayLabel,
      mgmtIp: gatewayIp,
      type: 'switch',
      role: 'gateway',
    });

    // Create destination node
    if (destinationInfo.ip) {
      nodes.push({
        id: destinationInfo.ip,
        label: destinationInfo.ip,
        mgmtIp: destinationInfo.ip,
        type: destinationInfo.type || 'vm',
        role: 'destination',
      });
    }

    // Create links
    if (sourceInfo.ip) {
      links.push({
        id: 'link-source-gateway',
        source: sourceInfo.ip,
        target: gatewayIp,
        linkType: 'flow',
        srcIfName: sourceInfo.srcInterface,
        dstIfName: sourceInfo.dstInterface,
      });
    }

    if (destinationInfo.ip) {
      links.push({
        id: 'link-gateway-destination',
        source: gatewayIp,
        target: destinationInfo.ip,
        linkType: 'flow',
        srcIfName: destinationInfo.srcInterface,
        dstIfName: destinationInfo.dstInterface,
      });
    }

    return {
      nodes,
      links,
      sourceData: sourceInfo,
      destinationData: destinationInfo,
      rawSourceData: sourceData,
      rawDestinationData: destinationData,
    };
  }

  extractFlowInfo(data, type) {
    if (!data || data.length === 0) {
      return {
        ip: null,
        gateway: null,
        gatewayName: null,
        type: 'vm',
        srcInterface: 'vmnic5',
        dstInterface: 'Eth1/1',
      };
    }

    // From your InfluxDB structure:
    // - _field: 'src' or 'dst'
    // - _value: IP address (e.g., '11.11.11.11', '10.10.10.10')
    // - source: Gateway IP (e.g., '192.168.238.101')
    // - _measurement: 'netflow'
    
    // Get the first valid IP from _value
    let ip = null;
    const validIps = new Set();
    
    data.forEach(row => {
      if (row._value && typeof row._value === 'string') {
        // Check if it's a valid IP address
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (ipRegex.test(row._value)) {
          validIps.add(row._value);
        }
      }
    });

    // Get the most common IP (or first one)
    if (validIps.size > 0) {
      ip = Array.from(validIps)[0];
    }

    // Extract gateway from 'source' field
    const firstRow = data[0];
    const gateway = firstRow.source || '192.168.238.101';
    const gatewayName = 'TELEMETRY-SW'; // You can make this configurable

    // Extract interface information if available
    const srcInterface = firstRow.in_interface || firstRow.ingress_interface || 'vmnic5';
    const dstInterface = firstRow.out_interface || firstRow.egress_interface || 
                        (type === 'source' ? 'Eth1/1' : 'Eth1/2');

    return {
      ip,
      gateway,
      gatewayName,
      type: 'vm',
      srcInterface,
      dstInterface,
    };
  }
}

export default new FlowAnalyticService();
