// src/controllers/visualizationController.js
import { PrismaClient } from '@prisma/client';
import { InfluxDB } from '@influxdata/influxdb-client';
import metricService from '../services/metricService.js';
import { createInfluxDBClientWithTimeout } from '../utils/influxConfig.js';
import fs from 'fs';
import path from 'path';


const prisma = new PrismaClient();

// Data Source Controllers
export const getDataSources = async(req, res) => {
    try {
        const sources = await prisma.dataSource.findMany();
        res.json(sources);
    } catch (error) {
        console.error('Error getting data sources:', error);
        res.status(500).json({ error: 'Failed to get data sources' });
    }
};

export const getDataSourceMetrics = async(req, res) => {
    try {
        const { id } = req.params;

        const dataSource = await prisma.dataSource.findUnique({
            where: { id }
        });

        if (!dataSource) {
            return res.status(404).json({ error: 'Data source not found' });
        }

        // Buat InfluxDB client
        const client = new InfluxDB({
            url: dataSource.url,
            token: dataSource.token
        });

        const queryApi = client.getQueryApi(dataSource.organization);

        // Query untuk mendapatkan semua measurements
        const query = `
      import "influxdata/influxdb/schema"
      schema.measurements(bucket: "${dataSource.database}")
    `;

        const result = await new Promise((resolve, reject) => {
            const measurements = [];
            queryApi.queryRows(query, {
                next(row, tableMeta) {
                    const measurement = tableMeta.toObject(row)._value;
                    measurements.push(measurement);
                },
                error(error) {
                    reject(error);
                },
                complete() {
                    resolve(measurements);
                },
            });
        });

        res.json(result);
    } catch (error) {
        console.error('Error getting data source metrics:', error);
        res.status(500).json({ error: 'Failed to get metrics' });
    }
};

export const executeDataSourceQuery = async(req, res) => {
    try {
        const { id } = req.params;
        const { query } = req.body;

        const dataSource = await prisma.dataSource.findUnique({
            where: { id }
        });

        if (!dataSource) {
            return res.status(404).json({ error: 'Data source not found' });
        }

        // Buat InfluxDB client
        const client = new InfluxDB({
            url: dataSource.url,
            token: dataSource.token
        });

        const queryApi = client.getQueryApi(dataSource.organization);

        // Execute query
        const result = await new Promise((resolve, reject) => {
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

        // Format hasil untuk frontend
        const formattedResult = {
            state: "Done",
            series: [{
                name: "Query Result",
                refId: "A",
                meta: {
                    executedQueryString: query
                },
                fields: [{
                        name: "Time",
                        type: "time",
                        values: result.map(row => new Date(row._time).getTime()),
                        config: {
                            unit: "time"
                        }
                    },
                    {
                        name: "Value",
                        type: "string",
                        values: result.map(row => {
                            // Jika _value adalah string, gunakan langsung
                            if (typeof row._value === 'string') {
                                return row._value.toUpperCase();
                            }
                            // Jika _value adalah number, konversi ke UP/DOWN
                            if (typeof row._value === 'number') {
                                return row._value === 1 ? 'UP' : 'DOWN';
                            }
                            // Jika operSt ada, gunakan itu
                            if (row.operSt) {
                                return row.operSt.toUpperCase();
                            }
                            return 'UNKNOWN';
                        }),
                        config: {
                            unit: "status"
                        }
                    }
                ],
                length: result.length
            }]
        };

        res.json(formattedResult);
    } catch (error) {
        console.error('Error executing query:', error);
        res.status(500).json({ error: 'Failed to execute query' });
    }
};

// Execute raw Flux query
export const executeFluxQuery = async(req, res) => {
    try {
        const { dataSourceId, query } = req.body;

        const dataSource = await prisma.dataSource.findUnique({
            where: { id: dataSourceId }
        });

        if (!dataSource) {
            return res.status(404).json({ error: 'Data source not found' });
        }

        const client = new InfluxDB({
            url: dataSource.url,
            token: dataSource.token
        });

        const queryApi = client.getQueryApi(dataSource.organization);
        const result = await metricService.executeFluxQuery(queryApi, query);

        res.json(result);
    } catch (error) {
        console.error('Error executing Flux query:', error);
        res.status(500).json({ error: 'Failed to execute query' });
    }
};

// Execute query untuk visualisasi dengan timeout konfigurasi
export const executeVisualizationQuery = async(req, res) => {
    try {
        const { dataSourceId, queryConfig, timeout } = req.body;
        const dataSource = await prisma.dataSource.findUnique({
            where: { id: dataSourceId }
        });

        if (!dataSource) {
            return res.status(404).json({ error: "Data source not found" });
        }

        // Use custom timeout if provided, otherwise use default
        const queryTimeout = timeout || 60000;
        const influxDB = createInfluxDBClientWithTimeout(dataSource, queryTimeout);

        const queryApi = influxDB.getQueryApi(dataSource.organization);
        const result = await metricService.executeQuery(queryApi, queryConfig);
        res.json(result);
    } catch (error) {
        console.error('Error executing query:', error);
        res.status(500).json({ error: error.message || "Failed to execute query" });
    }
};

// Update panel with timeout configuration
export const updatePanel = async(req, res) => {
    try {
        const { id } = req.params;
        const { title, description, type, width, height, position, options, dataSourceId, queries, refreshInterval } = req.body;

        await prisma.query.deleteMany({
            where: { visualizationId: id }
        });

        const panel = await prisma.visualization.update({
            where: { id },
            data: {
                name: title,
                type,
                refreshInterval: refreshInterval || 10000, // Add refresh interval
                config: {
                    description,
                    width: width || 12,
                    height: height || 8,
                    options: options || {}
                },
                position,
                dataSourceId,
                queries: {
                    create: queries?.map(query => ({
                        refId: query.refId,
                        query: query.query,
                        dataSourceId: query.dataSourceId
                    })) || []
                }
            },
            include: {
                dataSource: true,
                queries: true
            }
        });

        res.json(panel);
    } catch (error) {
        console.error('Error updating panel:', error);
        res.status(500).json({ error: 'Failed to update panel' });
    }
};

// Create panel with timeout configuration
export const createPanel = async(req, res) => {
    try {
        const { dashboardId } = req.params;
        const { title, description, type, width, height, position, options, dataSourceId, queries, refreshInterval } = req.body;

        const panel = await prisma.visualization.create({
            data: {
                name: title,
                type,
                refreshInterval: refreshInterval || 10000, // Add refresh interval
                config: {
                    description,
                    width: width || 12,
                    height: height || 8,
                    options: options || {}
                },
                position,
                dataSourceId,
                dashboardId,
                queries: {
                    create: queries?.map(query => ({
                        refId: query.refId,
                        query: query.query,
                        dataSourceId: query.dataSourceId
                    })) || []
                }
            },
            include: {
                dataSource: true,
                queries: true
            }
        });

        res.json(panel);
    } catch (error) {
        console.error('Error creating panel:', error);
        res.status(500).json({ error: 'Failed to create panel' });
    }
};

// Execute panel query with custom timeout
export const executePanelQuery = async(req, res) => {
    try {
        const { id } = req.params;
        const { forceRefresh } = req.query;

        const panel = await prisma.visualization.findUnique({
            where: { id },
            include: {
                dataSource: true,
                queries: true
            }
        });

        if (!panel) {
            return res.status(404).json({ error: 'Panel not found' });
        }

        if (!panel.dataSource) {
            return res.status(400).json({ error: 'Panel has no data source configured' });
        }

        // Use panel's refresh interval as timeout
        const timeout = panel.refreshInterval || 10000;
        const client = createInfluxDBClientWithTimeout(panel.dataSource, timeout);

        const queryApi = client.getQueryApi(panel.dataSource.organization);

        const results = [];
        for (const query of panel.queries) {
            try {
                // Check if this is a TimeSeries panel - use manual processing
                const isTimeSeries = panel.type === 'timeseries';
                
                if (isTimeSeries) {
                    // BYPASS BUG: Use raw query instead of metricService for TimeSeries
                    const rawData = await metricService.runQuery(queryApi, query.query);
                    console.log('🔥 RAW DATA LENGTH:', rawData?.length);
                    
                    // DEBUG: Check actual raw data structure
                    if (rawData && rawData.length > 0) {
                        console.log('🔥 SAMPLE RAW ROW:', JSON.stringify(rawData[0], null, 2));
                        console.log('🔥 RAW ROW KEYS:', Object.keys(rawData[0]));
                        console.log('🔥 RAW ROW ID FIELD:', rawData[0].id);
                    }
                    
                    // Manual processing to preserve all interfaces
                    const groupedByInterface = {};
                    rawData.forEach(row => {
                      const interfaceId = row.id || 'unknown';
                      const key = `${row._measurement}::${row._field}::${interfaceId}`;
                      
                      if (!groupedByInterface[key]) {
                        groupedByInterface[key] = [];
                      }
                      groupedByInterface[key].push(row);
                    });
                    
                    console.log('🔥 GROUPED INTERFACES:', Object.keys(groupedByInterface).length);
                    
                    // Create series for each interface with CORRECT format
                    const series = Object.entries(groupedByInterface).map(([key, rows]) => {
                      const [measurement, field, interfaceId] = key.split('::');
                      
                      // Sort by time
                      rows.sort((a, b) => new Date(a._time) - new Date(b._time));
                      
                      return {
                        name: `${field} (${interfaceId})`,
                        data: rows.map(row => [
                          new Date(row._time).getTime(),
                          Number(row._value) || 0
                        ]),
                        labels: {
                          measurement: measurement,
                          field: field,
                          id: interfaceId,
                          source: rows[0].source
                        }
                      };
                    });
                    
                    var result = {
                      state: "Done",
                      series: series
                    };
                    
                    console.log('🔥 MANUAL RESULT SERIES COUNT:', result.series.length);
                    console.log('🔥 FIRST SERIES NAME:', result.series[0]?.name);
                    console.log('🔥 FIRST SERIES DATA LENGTH:', result.series[0]?.data?.length);
                } else {
                    // Use original metricService for other panels (Chord, etc.)
                    var result = await metricService.executeFluxQuery(queryApi, query.query);
                }

                console.log('🔥 RESULT TYPE:', typeof result);
                console.log('🔥 RESULT HAS SERIES:', !!result?.series);
                results.push({
                    refId: query.refId,
                    result: result
                });
            } catch (queryError) {
                console.error(`Error executing query ${query.refId}:`, queryError);
                results.push({
                    refId: query.refId,
                    error: queryError.message
                });
            }
        }

        console.log('🔥 FINAL RESULTS LENGTH:', results.length);
        console.log('🔥 SENDING RESPONSE...');
        res.json(results);
    } catch (error) {
        console.error('🚨 ERROR executing panel query:', error);
        console.error('🚨 ERROR STACK:', error.stack);
        res.status(500).json({ error: 'Failed to execute panel query', details: error.message });
    }
};

// Get all dashboards
export const getDashboards = async(req, res) => {
    try {
        const dashboards = await prisma.visualization.findMany({
            where: {
                type: 'dashboard',
                dashboardId: null
            },
            include: {
                panels: {
                    include: {
                        dataSource: true
                    }
                },
                variables: true
            }
        });
        res.json(dashboards);
    } catch (error) {
        console.error('Error getting dashboards:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get single dashboard
export const getDashboard = async(req, res) => {
    try {
        const { id } = req.params;
        const dashboard = await prisma.visualization.findUnique({
            where: { id },
            include: {
                panels: {
                    include: {
                        dataSource: true,
                        queries: true
                    }
                },
                variables: true
            }
        });

        if (!dashboard) {
            return res.status(404).json({ error: 'Dashboard not found' });
        }

        // Transform dashboard data for frontend
        const transformedDashboard = {
            ...dashboard,
            panels: dashboard.panels.map(panel => ({
                id: panel.id,
                title: panel.name,
                type: panel.type,
                description: panel.config?.description || '',
                width: panel.config?.width || 12,
                height: panel.config?.height || 8,
                options: panel.config?.options || {},
                position: panel.position || { x: 0, y: 0 },
                dataSourceId: panel.dataSourceId,
                refreshInterval: panel.refreshInterval || 30000, // Add refreshInterval field
                queries: panel.queries.map(q => ({
                    refId: q.refId,
                    query: q.query,
                    dataSourceId: q.dataSourceId
                }))
            }))
        };

        res.json(transformedDashboard);
    } catch (error) {
        console.error('Error getting dashboard:', error);
        res.status(500).json({ error: error.message });
    }
};

// Create new dashboard
export const createDashboard = async(req, res) => {
    try {
        const { name, description, tags, panels } = req.body;

        const dashboard = await prisma.visualization.create({
            data: {
                name,
                type: 'dashboard',
                config: {
                    description,
                    tags
                },
                panels: {
                    create: panels?.map(panel => ({
                        name: panel.title,
                        type: panel.type,
                        config: {
                            description: panel.description,
                            width: panel.width || 12,
                            height: panel.height || 8,
                            options: panel.options || {}
                        },
                        position: panel.position || { x: 0, y: 0 },
                        dataSourceId: panel.dataSourceId,
                        queries: {
                            create: panel.queries?.map(q => ({
                                refId: q.refId,
                                query: q.query,
                                dataSourceId: panel.dataSourceId
                            }))
                        }
                    }))
                }
            },
            include: {
                panels: {
                    include: {
                        queries: true
                    }
                }
            }
        });

        res.json(dashboard);
    } catch (error) {
        console.error('Error creating dashboard:', error);
        res.status(500).json({ error: error.message });
    }
};

// Update dashboard
export const updateDashboard = async(req, res) => {
    try {
        const { id } = req.params;
        const { name, description, tags } = req.body;

        const dashboard = await prisma.visualization.update({
            where: { id },
            data: {
                name,
                config: {
                    description,
                    tags
                }
            },
            include: {
                panels: {
                    include: {
                        queries: true
                    }
                }
            }
        });

        res.json(dashboard);
    } catch (error) {
        console.error('Error updating dashboard:', error);
        res.status(500).json({ error: error.message });
    }
};

// Delete dashboard
export const deleteDashboard = async(req, res) => {
    try {
        const { id } = req.params;
        await prisma.visualization.delete({
            where: { id }
        });
        res.json({ message: 'Dashboard deleted successfully' });
    } catch (error) {
        console.error('Error deleting dashboard:', error);
        res.status(500).json({ error: error.message });
    }
};

// Delete panel
export const deletePanel = async(req, res) => {
    try {
        const { id } = req.params;
        await prisma.visualization.delete({
            where: { id }
        });
        res.json({ message: 'Panel deleted successfully' });
    } catch (error) {
        console.error('Error deleting panel:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get metrics data
export const getMetrics = async(req, res) => {
    try {
        const { dataSourceId } = req.query;

        if (!dataSourceId) {
            return res.status(400).json({ error: 'Data source ID is required' });
        }

        const dataSource = await prisma.dataSource.findUnique({
            where: { id: dataSourceId }
        });

        if (!dataSource) {
            return res.status(404).json({ error: 'Data source not found' });
        }

        const client = new InfluxDB({
            url: dataSource.url,
            token: dataSource.token
        });

        const queryApi = client.getQueryApi(dataSource.organization);

        // Query untuk mendapatkan semua measurements
        const query = `
      import "influxdata/influxdb/schema"
      schema.measurements(bucket: "${dataSource.database}")
    `;

        const measurements = await new Promise((resolve, reject) => {
            const results = [];
            queryApi.queryRows(query, {
                next(row, tableMeta) {
                    const measurement = tableMeta.toObject(row)._value;
                    results.push(measurement);
                },
                error(error) {
                    reject(error);
                },
                complete() {
                    resolve(results);
                },
            });
        });

        res.json(measurements);
    } catch (error) {
        console.error('Error fetching metrics:', error);
        res.status(500).json({ error: "Failed to fetch metrics" });
    }
};

// Query validation
export const validateQuery = async (req, res) => {
    try {
        const { dataSourceId, query, panelType = 'time-series' } = req.body;

        if (!dataSourceId || !query) {
            return res.status(400).json({ 
                valid: false, 
                error: 'dataSourceId and query are required' 
            });
        }

        // Get data source
        const dataSource = await prisma.dataSource.findUnique({
            where: { id: dataSourceId }
        });

        if (!dataSource) {
            return res.status(404).json({ 
                valid: false, 
                error: 'Data source not found' 
            });
        }

        // Create InfluxDB client
        const client = new InfluxDB({
            url: dataSource.url,
            token: dataSource.token
        });

        const queryApi = client.getQueryApi(dataSource.organization);

        // Execute query with limit for validation
        const testQuery = query.includes('|> limit(') ? query : `${query} |> limit(n: 10)`;
        
        const rawResult = await new Promise((resolve, reject) => {
            const rows = [];
            queryApi.queryRows(testQuery, {
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

        // Create simple debug info
        const debugInfo = {
            timestamp: new Date().toISOString(),
            panelType: panelType,
            query: query,
            dataSource: dataSource.name,
            totalRows: rawResult.length,
            sampleRows: rawResult.slice(0, 5),
            allFields: [...new Set(rawResult.flatMap(row => Object.keys(row)))]
        };

        // Save to debug file
        const debugFileName = `debug_${panelType.replace('-', '_')}_validation.json`;
        const debugPath = path.join(process.cwd(), debugFileName);
        fs.writeFileSync(debugPath, JSON.stringify(debugInfo, null, 2));

        res.json({
            valid: true,
            message: `Query is valid for ${panelType} panel`,
            rowCount: rawResult.length,
            fields: debugInfo.allFields,
            debugFile: debugPath,
            panelType: panelType
        });

    } catch (error) {
        console.error('Query validation error:', error);
        res.status(500).json({ 
            valid: false, 
            error: error.message 
        });
    }
};

// Helper function to extract interface ID for validation
function extractInterfaceIdForValidation(row) {
    // Try common interface field patterns
    if (row.interface) return row.interface;
    if (row.ifName) return row.ifName;
    if (row.id) return row.id;
    if (row.name) return row.name;
    
    // Try regex patterns for interface names
    const interfaceRegex = /(?:eth|fa|gi|te|hu)[\d\/\.\-]+/i;
    for (const [key, value] of Object.entries(row)) {
        if (typeof value === 'string' && interfaceRegex.test(value)) {
            return value;
        }
    }
    
    // Try common SNMP interface fields
    if (row.ifDescr) return row.ifDescr;
    if (row.ifAlias) return row.ifAlias;
    
    // Use table name if available
    if (row.table) return row.table;
    
    // Generate from host + source if available
    if (row.host && row.source) {
        return `${row.host}-${row.source}`;
    }
    
    // Use measurement + field as fallback
    const measurement = row._measurement || 'unknown';
    const field = row._field || 'value';
    return `${measurement}-${field}`;
}

// Helper function to validate data structure for different panel types
function validateDataForPanelType(rawData, panelType) {
    const validation = {
        isValid: true,
        warnings: [],
        suggestions: [],
        requiredFields: [],
        detectedFields: []
    };

    if (!rawData || rawData.length === 0) {
        validation.isValid = false;
        validation.warnings.push('No data returned from query');
        return validation;
    }

    const allFields = [...new Set(rawData.flatMap(row => Object.keys(row)))];
    validation.detectedFields = allFields;

    switch (panelType) {
        case 'time-series':
        case 'timeseries':
            validation.requiredFields = ['_time', '_value'];
            if (!allFields.includes('_time')) {
                validation.warnings.push('Missing _time field for time series visualization');
            }
            if (!allFields.includes('_value')) {
                validation.warnings.push('Missing _value field for time series visualization');
            }
            
            // Check for interface identification
            const interfaceFields = ['interface', 'ifName', 'id', 'name', 'host', 'source'];
            const hasInterfaceField = interfaceFields.some(field => allFields.includes(field));
            if (!hasInterfaceField) {
                validation.suggestions.push('Consider adding interface identification fields for better series grouping');
            }
            break;

        case 'gauge':
            validation.requiredFields = ['_value'];
            if (!allFields.includes('_value')) {
                validation.warnings.push('Missing _value field for gauge visualization');
            }
            if (rawData.length > 1) {
                validation.suggestions.push('Gauge works best with single value - consider using |> last() or |> mean()');
            }
            break;

        case 'table':
            validation.requiredFields = ['_time'];
            if (!allFields.includes('_time')) {
                validation.suggestions.push('Consider including _time field for table sorting');
            }
            validation.suggestions.push(`Table will display ${allFields.length} columns: ${allFields.join(', ')}`);
            break;

        case 'interface':
        case 'interface-status':
            validation.requiredFields = ['_value', 'interface'];
            const hasInterface = allFields.some(field => 
                field.includes('interface') || field.includes('ifName') || field === 'id'
            );
            if (!hasInterface) {
                validation.warnings.push('Missing interface identification field');
                validation.suggestions.push('Add interface field or use ifName/id for interface identification');
            }
            break;

        case 'chord-diagram':
            validation.requiredFields = ['source', 'target', '_value'];
            if (!allFields.includes('source') && !allFields.includes('target')) {
                validation.warnings.push('Chord diagram requires source and target fields');
            }
            break;

        default:
            validation.suggestions.push(`Unknown panel type: ${panelType}. Basic validation applied.`);
    }

    return validation;
}

// Validate Flux Query
export const validateFluxQuery = async(req, res) => {
    try {
        const { dataSourceId, query } = req.body;

        const dataSource = await prisma.dataSource.findUnique({
            where: { id: dataSourceId }
        });

        if (!dataSource) {
            return res.status(404).json({ error: 'Data source tidak ditemukan' });
        }

        const client = new InfluxDB({
            url: dataSource.url,
            token: dataSource.token
        });

        const queryApi = client.getQueryApi(dataSource.organization);

        try {
            // Use the same generic executeFluxQuery logic instead of hardcoded interface status
            console.log('🔧 VALIDATE CONTEXT - About to call executeFluxQuery');
            console.log('🔧 QueryApi type:', typeof queryApi);
            console.log('🔧 Query:', query);
            
            const result = await metricService.executeFluxQuery(queryApi, query);
            
            console.log('🔧 VALIDATE RESULT - Series count:', result?.series?.length);

            res.json({
                valid: true,
                data: result
            });
        } catch (queryError) {
            // Jika ada error syntax atau eksekusi
            console.error('Query execution error:', queryError);
            res.status(400).json({
                error: queryError.message || 'Query tidak valid',
                details: queryError.stack
            });
        }
    } catch (error) {
        console.error('Error validating Flux query:', error);
        res.status(500).json({ error: 'Gagal memvalidasi query' });
    }
};

// Get panel
export const getPanel = async(req, res) => {
    try {
        const { id } = req.params;
        const panel = await prisma.visualization.findUnique({
            where: { id },
            include: {
                dataSource: true,
                queries: true
            }
        });

        if (!panel) {
            return res.status(404).json({ error: 'Panel not found' });
        }

        res.json(panel);
    } catch (error) {
        console.error('Error getting panel:', error);
        res.status(500).json({ error: error.message });
    }
};

// Execute TimeSeries Query (standardized like other panel types)
export const executeTimeSeriesQuery = async (req, res) => {
    try {
        const { dataSourceId, query, timeRange } = req.body;

        if (!dataSourceId || !query) {
            return res.status(400).json({ error: 'dataSourceId and query are required' });
        }

        const dataSource = await prisma.dataSource.findUnique({
            where: { id: dataSourceId }
        });

        if (!dataSource) {
            return res.status(404).json({ error: 'Data source not found' });
        }

        const client = new InfluxDB({
            url: dataSource.url,
            token: dataSource.token
        });

        const queryApi = client.getQueryApi(dataSource.organization);

        // Execute the query
        const rawResult = await new Promise((resolve, reject) => {
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

        // Simple data transformation for TimeSeries
        const series = [{
            name: "TimeSeries Data",
            fields: [
                {
                    name: "Time",
                    type: "time",
                    values: rawResult.map(row => new Date(row._time).getTime())
                },
                {
                    name: "Value", 
                    type: "number",
                    values: rawResult.map(row => row._value)
                }
            ]
        }];

        res.json({
            state: "Done",
            series: series
        });

    } catch (error) {
        console.error('Error executing TimeSeries query:', error);
        res.status(500).json({ error: error.message });
    }
};