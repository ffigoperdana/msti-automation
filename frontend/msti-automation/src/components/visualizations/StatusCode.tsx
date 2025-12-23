import React, { useEffect, useState } from 'react';
import metricService from '../../services/metricService';

interface StatusCodeProps {
  panelId?: string;
  queryResult?: any;
  options?: {
    serverName?: string;
    queryType?: 'http' | 'dns';
  };
}

interface Field {
  name: string;
  type: string;
  values: any[];
}

// DNS rcode mapping
const getDnsStatusText = (rcode: string): { text: string; color: string } => {
  if (rcode.toUpperCase() === 'NOERROR') {
    return { text: 'OK', color: 'green' };
  } else {
    return { text: rcode, color: 'red' };
  }
};

// HTTP Status Code mapping
const getHttpStatusText = (code: number): { text: string; color: string } => {
  if (code >= 200 && code < 300) {
    return { text: 'OK', color: 'green' };
  } else if (code === 404) {
    return { text: '404 Not Found', color: 'yellow' };
  } else if (code === 403) {
    return { text: '403 Forbidden', color: 'yellow' };
  } else if (code === 401) {
    return { text: '401 Unauthorized', color: 'yellow' };
  } else if (code >= 400 && code < 500) {
    return { text: `${code} Client Error`, color: 'yellow' };
  } else if (code === 500) {
    return { text: '500 Server Error', color: 'red' };
  } else if (code === 502) {
    return { text: '502 Bad Gateway', color: 'red' };
  } else if (code === 503) {
    return { text: '503 Service Unavailable', color: 'red' };
  } else if (code >= 500) {
    return { text: `${code} Server Error`, color: 'red' };
  } else {
    return { text: 'Unknown Status', color: 'gray' };
  }
};


const StatusCode: React.FC<StatusCodeProps> = ({ panelId }) => {
  const [status, setStatus] = useState<string>('Unknown');
  const [statusColor, setStatusColor] = useState<string>('gray');
  const [serverName, setServerName] = useState<string>('Unknown Server');
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!panelId) {
        setError('No panel ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Execute panel query - this returns either 2 queries (HTTP) or 1 query (DNS)
        const response = await metricService.executePanelQuery(panelId);
        console.log('🔍 StatusCode executePanelQuery response:', JSON.stringify(response, null, 2));
        
        // Response structure:
        // HTTP mode: [{refId: 'statusCode', result: {...}}, {refId: 'responseTime', result: {...}}]
        // DNS mode: [{refId: 'dns', result: {...}}]
        if (!Array.isArray(response) || response.length === 0) {
          throw new Error('No query results received');
        }

        // Check if this is DNS mode (single query)
        const isDnsMode = response.length === 1 && response[0].refId === 'dns';
        
        if (isDnsMode) {
          // DNS Mode - single query returns both rcode and query_time_ms
          const dnsResult = response[0];
          if (!dnsResult?.result?.series?.[0]) {
            throw new Error('No DNS data found');
          }

          const dnsSeries = dnsResult.result.series[0];
          const dnsFields = dnsSeries.fields;
          
          console.log('✅ Detected query type: DNS (single query mode)');
          console.log('🔍 DNS fields:', dnsFields.map((f: Field) => ({ name: f.name, labels: (f as any).labels })));

          // Extract domain name (for DNS, show domain not server)
          let extractedDomain = 'Unknown Domain';
          dnsFields.forEach((field: any) => {
            if (field.labels) {
              extractedDomain = field.labels.domain || extractedDomain;
            }
          });
          if (extractedDomain === 'Unknown Domain' && dnsSeries.tags) {
            extractedDomain = dnsSeries.tags.domain || extractedDomain;
          }
          setServerName(extractedDomain);
          console.log('✅ Extracted domain:', extractedDomain);

          // Extract rcode from field labels (not as separate field!)
          let rcodeValue: string | null = null;
          dnsFields.forEach((field: any) => {
            if (field.labels && field.labels.rcode) {
              rcodeValue = field.labels.rcode;
            }
          });

          if (rcodeValue) {
            const statusInfo = getDnsStatusText(rcodeValue);
            setStatus(statusInfo.text);
            setStatusColor(statusInfo.color);
            console.log('✅ Set DNS status:', statusInfo.text, 'from rcode:', rcodeValue);
          } else {
            console.error('❌ No rcode found in field labels. Available fields:', dnsFields.map((f: Field) => f.name));
            setStatus('No rcode');
            setStatusColor('red');
          }

          // Extract query_time_ms (response time)
          const timeField = dnsFields.find((f: Field) => f.name === 'query_time_ms' || f.name === '_value');
          if (timeField && timeField.values.length > 0) {
            const timeValue = timeField.values[timeField.values.length - 1];
            const time = typeof timeValue === 'number' ? timeValue : parseFloat(timeValue);
            if (!isNaN(time)) {
              setResponseTime(time);
              console.log('✅ Set DNS response time:', time, 'ms');
            }
          }
        } else {
          // HTTP Mode - 2 separate queries
          if (response.length < 2) {
            throw new Error('Expected 2 query results for HTTP mode (statusCode and responseTime)');
          }

          // HTTP Mode - 2 separate queries
          if (response.length < 2) {
            throw new Error('Expected 2 query results for HTTP mode (statusCode and responseTime)');
          }

          // Find statusCode and responseTime results
          const statusCodeResult = response.find((r: any) => r.refId === 'statusCode');
          const responseTimeResult = response.find((r: any) => r.refId === 'responseTime');

          if (!statusCodeResult?.result?.series?.[0]) {
            throw new Error('No status code data found');
          }

          // Extract status code value
          const statusSeries = statusCodeResult.result.series[0];
          const statusFields = statusSeries.fields;
          
          // Extract server name from labels or tags
          let extractedServer = 'Unknown Server';
          statusFields.forEach((field: any) => {
            if (field.labels) {
              extractedServer = field.labels.server || field.labels.domain || field.labels.host || field.labels.url || extractedServer;
            }
          });
          if (extractedServer === 'Unknown Server' && statusSeries.tags) {
            extractedServer = statusSeries.tags.server || statusSeries.tags.domain || statusSeries.tags.host || statusSeries.tags.url || extractedServer;
          }
          setServerName(extractedServer);

          // Detect query type
          let detectedType: 'http' | 'dns' | 'unknown' = 'unknown';
          statusFields.forEach((field: any) => {
            if (field.labels) {
              if (field.labels.tag1 === 'http' || field.labels._measurement === 'http_response') {
                detectedType = 'http';
              } else if (field.labels.tag1 === 'dns' || field.labels._measurement === 'dns_query') {
                detectedType = 'dns';
              }
            }
          });
          if (detectedType === 'unknown' && statusSeries.tags) {
            if (statusSeries.tags.tag1 === 'http' || statusSeries.tags._measurement === 'http_response') {
              detectedType = 'http';
            } else if (statusSeries.tags.tag1 === 'dns' || statusSeries.tags._measurement === 'dns_query') {
              detectedType = 'dns';
            }
          }
          
          // Check field names as last resort
          if (detectedType === 'unknown') {
            const fieldNames = statusFields.map((f: Field) => f.name.toLowerCase());
            if (fieldNames.includes('http_response_code') || fieldNames.includes('status_code')) {
              detectedType = 'http';
            } else if (fieldNames.includes('rcode') || fieldNames.includes('query_time_ms')) {
              detectedType = 'dns';
            }
          }
          
          console.log('✅ Detected query type:', detectedType);

          // Extract status code value
          let statusValue: any = null;
          
          // Look for the actual field name (http_response_code, rcode) OR _value
          const valueField = statusFields.find((f: Field) => 
            f.name === 'http_response_code' || 
            f.name === 'status_code' || 
            f.name === 'rcode' ||
            f.name === '_value' || 
            f.name === 'Value' || 
            f.name === 'value'
          );
          
          if (valueField && valueField.values.length > 0) {
            statusValue = valueField.values[valueField.values.length - 1];
            console.log('✅ Found status value in field:', valueField.name, 'value:', statusValue);
          }

          if (statusValue === null || statusValue === undefined) {
            console.error('❌ No status code value found. Available fields:', statusFields.map((f: Field) => f.name));
            throw new Error('No status code value found');
          }

          // Process based on type
          if (detectedType === 'http') {
            const statusCode = typeof statusValue === 'number' ? statusValue : parseFloat(statusValue);
            if (!isNaN(statusCode)) {
              const statusInfo = getHttpStatusText(statusCode);
              setStatus(statusInfo.text);
              setStatusColor(statusInfo.color);
              console.log('✅ Set HTTP status:', statusInfo.text, 'color:', statusInfo.color);
            } else {
              setStatus('Down');
              setStatusColor('red');
            }
          } else if (detectedType === 'dns') {
            const rcode = String(statusValue);
            const statusInfo = getDnsStatusText(rcode);
            setStatus(statusInfo.text);
            setStatusColor(statusInfo.color);
            console.log('✅ Set DNS status:', statusInfo.text, 'color:', statusInfo.color);
          } else {
            setStatus('Unknown Type');
            setStatusColor('gray');
          }

          // Extract response time
          if (responseTimeResult?.result?.series?.[0]) {
            const timeSeries = responseTimeResult.result.series[0];
            const timeFields = timeSeries.fields;
            
            // Look for response_time or query_time_ms OR _value
            const timeValueField = timeFields.find((f: Field) => 
              f.name === 'response_time' ||
              f.name === 'query_time_ms' ||
              f.name === '_value' || 
              f.name === 'Value' || 
              f.name === 'value'
            );
            
            if (timeValueField && timeValueField.values.length > 0) {
              const timeValue = timeValueField.values[timeValueField.values.length - 1];
              const time = typeof timeValue === 'number' ? timeValue : parseFloat(timeValue);
              if (!isNaN(time)) {
                setResponseTime(time);
                console.log('✅ Set response time:', time, 'ms');
              }
            }
          }
        }
        
      } catch (err: any) {
        console.error('StatusCode component error:', err);
        setError(err.message || 'Failed to fetch status data');
        setStatus('Error');
        setStatusColor('red');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [panelId]);

  // Color scheme mapping
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'green':
        return {
          bg: 'bg-green-50',
          text: 'text-green-600',
          border: 'border-green-200'
        };
      case 'red':
        return {
          bg: 'bg-red-50',
          text: 'text-red-600',
          border: 'border-red-200'
        };
      case 'yellow':
        return {
          bg: 'bg-yellow-50',
          text: 'text-yellow-600',
          border: 'border-yellow-200'
        };
      default:
        return {
          bg: 'bg-gray-50',
          text: 'text-gray-600',
          border: 'border-gray-200'
        };
    }
  };

  const colorClasses = getColorClasses(statusColor);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 rounded-lg bg-gray-50 h-full min-h-[200px]">
        <div className="animate-pulse flex flex-col items-center space-y-4">
          <div className="h-4 bg-gray-200 rounded w-32"></div>
          <div className="h-12 bg-gray-200 rounded w-24"></div>
          <div className="h-3 bg-gray-200 rounded w-28"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-6 rounded-lg bg-red-50 h-full min-h-[200px]">
        <div className="text-red-500 text-center">
          <div className="text-4xl mb-2">⚠️</div>
          <div className="text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 ${colorClasses.bg} ${colorClasses.border} h-full min-h-[200px]`}>
      {/* Server Name - Small text at top */}
      <div className="text-sm text-gray-600 mb-3 font-medium text-center break-all px-2">
        {serverName}
      </div>

      {/* Status - Large prominent text */}
      <div className={`text-6xl font-bold ${colorClasses.text} mb-3`}>
        {status}
      </div>

      {/* Response Time - Small text at bottom */}
      {responseTime !== null && (
        <div className="text-sm text-gray-500 font-medium">
          Response Time: {responseTime.toFixed(2)} ms
        </div>
      )}
    </div>
  );
};

export default StatusCode;
