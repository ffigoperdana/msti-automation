import { InfluxDB } from '@influxdata/influxdb-client';

/**
 * Create InfluxDB client with configurable timeout
 * @param {Object} dataSource - Data source configuration
 * @param {number} timeout - Timeout in milliseconds
 * @returns {InfluxDB} Configured InfluxDB client
 */
export const createInfluxDBClientWithTimeout = (dataSource, timeout = 60000) => {
    return new InfluxDB({
        url: dataSource.url,
        token: dataSource.token,
        timeout: timeout,
        transportOptions: {
            requestTimeout: timeout,
            keepAlive: true,
            keepAliveMsecs: Math.min(timeout / 2, 30000)
        }
    });
};

/**
 * Create InfluxDB client with default timeout configuration
 * @param {Object} dataSource - Data source configuration
 * @returns {InfluxDB} Configured InfluxDB client
 */
export const createInfluxDBClient = (dataSource) => {
    return createInfluxDBClientWithTimeout(dataSource, 60000);
};

// Timeout presets for different panel types
export const TIMEOUT_PRESETS = {
    REALTIME: 10000,      // 10 seconds
    SHORT: 60000,         // 1 minute  
    MEDIUM: 120000,       // 2 minutes
    LONG: 180000,         // 3 minutes
    VERY_LONG: 3600000    // 1 hour
};

export const getTimeoutLabel = (timeout) => {
    switch(timeout) {
        case TIMEOUT_PRESETS.REALTIME: return '10 seconds (Realtime)';
        case TIMEOUT_PRESETS.SHORT: return '60 seconds';
        case TIMEOUT_PRESETS.MEDIUM: return '120 seconds';
        case TIMEOUT_PRESETS.LONG: return '180 seconds';
        case TIMEOUT_PRESETS.VERY_LONG: return '1 hour';
        default: return `${timeout / 1000} seconds`;
    }
};