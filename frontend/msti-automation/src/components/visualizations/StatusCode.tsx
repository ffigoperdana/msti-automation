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

const StatusCode: React.FC<StatusCodeProps> = ({ panelId, queryResult, options }) => {
  const [status, setStatus] = useState<string>('Unknown');
  const [statusColor, setStatusColor] = useState<string>('gray');
  const [serverName, setServerName] = useState<string>('Unknown Server');
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!panelId) {
        processQueryResult();
        return;
      }

      try {
        setLoading(true);
        const response = await metricService.executePanelQuery(panelId);
        console.log('🔍 StatusCode executePanelQuery response:', JSON.stringify(response, null, 2));
        processResponse(response);
      } catch (err) {
        console.error('StatusCode component error:', err);
        setError('Failed to fetch status data');
        setStatus('Down');
        setStatusColor('red');
      } finally {
        setLoading(false);
      }
    };

    const processQueryResult = () => {
      try {
        setLoading(true);
        console.log('🔍 StatusCode processQueryResult - queryResult:', JSON.stringify(queryResult, null, 2));
        if (queryResult && Object.keys(queryResult).length > 0) {
          processResponse(queryResult);
        } else {
          setStatus('No Data');
          setStatusColor('gray');
          setError('No data received');
          console.log('❌ No queryResult data');
        }
      } catch (err) {
        console.error('Error processing query result:', err);
        setError('Failed to process data');
        setStatus('Error');
        setStatusColor('red');
      } finally {
        setLoading(false);
      }
    };

    const processResponse = (response: any) => {
      try {
        console.log('🔍 StatusCode processResponse - Full response:', JSON.stringify(response, null, 2));
        
        // Handle different response structures
        let seriesData = null;
        
        // Case 1: Array response from executePanelQuery: [{refId, result: {series: [...]}}]
        if (Array.isArray(response) && response.length > 0) {
          console.log('✅ Response is array, accessing first element');
          const firstResult = response[0];
          if (firstResult?.result?.series && Array.isArray(firstResult.result.series)) {
            console.log('✅ Found series in result.series');
            seriesData = firstResult.result;
          }
        }
        // Case 2: Direct series array (from validateFluxQuery sometimes)
        else if (response?.series && Array.isArray(response.series)) {
          console.log('✅ Found direct series array');
          seriesData = response;
        }
        // Case 3: Nested in query result object (from validateFluxQuery)
        else if (response && typeof response === 'object' && !Array.isArray(response)) {
          const firstQueryKey = Object.keys(response)[0];
          const firstQueryResult = response[firstQueryKey];
          
          if (firstQueryResult?.series && Array.isArray(firstQueryResult.series)) {
            console.log('✅ Found nested series in query result object');
            seriesData = firstQueryResult;
          }
        }
        
        if (!seriesData?.series?.[0]?.fields) {
          console.log('❌ No series or fields found in response structure');
          console.log('❌ Response type:', Array.isArray(response) ? 'array' : typeof response);
          console.log('❌ Response length/keys:', Array.isArray(response) ? response.length : Object.keys(response || {}));
          console.log('❌ Series data:', seriesData);
          setStatus('No Data');
          setStatusColor('gray');
          return;
        }

        const fields = seriesData.series[0].fields;
        const tags = seriesData.series[0].tags || {};
        
        console.log('🔍 All fields with details:', fields.map((f: Field) => ({ 
          name: f.name, 
          type: f.type, 
          labels: (f as any).labels,
          sampleValue: (f as any).values?.[0]
        })));
        console.log('🔍 Tags:', tags);

        // FIRST: Try to extract server name from field labels (InfluxDB 2.x style)
        let extractedServerName = options?.serverName || 'Unknown Server';
        fields.forEach((field: any) => {
          if (field.labels) {
            const serverFromLabel = field.labels.server || field.labels.domain || field.labels.host || field.labels.url;
            if (serverFromLabel && extractedServerName === 'Unknown Server') {
              extractedServerName = serverFromLabel;
              console.log('✅ Extracted server from field labels:', serverFromLabel);
            }
          }
        });
        
        // SECOND: Try tags if not found in labels
        if (extractedServerName === 'Unknown Server') {
          extractedServerName = tags.server || tags.domain || tags.host || tags.url || 'Unknown Server';
          if (extractedServerName !== 'Unknown Server') {
            console.log('✅ Extracted server from tags:', extractedServerName);
          }
        }
        
        setServerName(extractedServerName);

        // Determine query type
        const queryType = options?.queryType || detectQueryType(tags, fields);
        console.log('✅ Detected query type:', queryType);

        if (queryType === 'http') {
          processHttpResponse(fields);
        } else if (queryType === 'dns') {
          processDnsResponse(fields);
        } else {
          console.log('❌ Unknown query type');
          setStatus('Unknown Type');
          setStatusColor('gray');
        }
      } catch (err) {
        console.error('Error processing response:', err);
        setStatus('Error');
        setStatusColor('red');
      }
    };

    const detectQueryType = (tags: any, fields: Field[]): 'http' | 'dns' | 'unknown' => {
      // FIRST: Check field labels (InfluxDB 2.x style)
      for (const field of fields) {
        const fieldWithLabels = field as any;
        if (fieldWithLabels.labels) {
          if (fieldWithLabels.labels.tag1 === 'http' || fieldWithLabels.labels._measurement === 'http_response') {
            console.log('✅ Detected HTTP from field labels');
            return 'http';
          }
          if (fieldWithLabels.labels.tag1 === 'dns' || fieldWithLabels.labels._measurement === 'dns_query') {
            console.log('✅ Detected DNS from field labels');
            return 'dns';
          }
        }
      }
      
      // SECOND: Check tags
      if (tags.tag1 === 'http' || tags._measurement === 'http_response') {
        console.log('✅ Detected HTTP from tags');
        return 'http';
      }
      if (tags.tag1 === 'dns' || tags._measurement === 'dns_query') {
        console.log('✅ Detected DNS from tags');
        return 'dns';
      }

      // THIRD: Check field names
      const fieldNames = fields.map(f => f.name.toLowerCase());
      console.log('🔍 Checking field names:', fieldNames);
      if (fieldNames.includes('http_response_code') || fieldNames.includes('status_code')) {
        console.log('✅ Detected HTTP from field names');
        return 'http';
      }
      if (fieldNames.includes('query_time_ms') || fieldNames.includes('rcode')) {
        console.log('✅ Detected DNS from field names');
        return 'dns';
      }

      console.log('❌ Could not detect query type');
      return 'unknown';
    };

    const processHttpResponse = (fields: Field[]) => {
      console.log('🔍 Processing HTTP response, fields:', fields.map(f => f.name));
      
      // Find status code field - check multiple possible names AND labels
      let statusCodeValue = null;
      let responseTimeValue = null;
      
      // First, try to find in field labels (for pivoted data)
      const valueField = fields.find((f: Field) => f.name === 'value' || f.name === 'Value');
      if (valueField) {
        const fieldWithLabels = valueField as any;
        if (fieldWithLabels.labels) {
          console.log('🔍 Found value field with labels:', fieldWithLabels.labels);
          
          // Extract status_code from labels
          if (fieldWithLabels.labels.status_code) {
            statusCodeValue = fieldWithLabels.labels.status_code;
            console.log('✅ Extracted status_code from labels:', statusCodeValue);
          }
          
          // Extract response_time from labels (if exists)
          if (fieldWithLabels.labels.response_time) {
            responseTimeValue = fieldWithLabels.labels.response_time;
            console.log('✅ Extracted response_time from labels:', responseTimeValue);
          }
        }
      }
      
      // Try to find http_response_code and response_time as SEPARATE fields (after pivot)
      const httpResponseCodeField = fields.find((f: Field) => 
        f.name === 'http_response_code' || f.name === 'status_code'
      );
      const responseTimeFieldDirect = fields.find((f: Field) => 
        f.name === 'response_time'
      );
      
      console.log('🔍 Checking for separate pivoted fields - http_response_code:', httpResponseCodeField?.name, 'response_time:', responseTimeFieldDirect?.name);
      
      if (httpResponseCodeField && httpResponseCodeField.values && httpResponseCodeField.values.length > 0 && !statusCodeValue) {
        statusCodeValue = httpResponseCodeField.values[httpResponseCodeField.values.length - 1];
        console.log('✅ Extracted status_code from http_response_code field:', statusCodeValue);
      }
      
      if (responseTimeFieldDirect && responseTimeFieldDirect.values && responseTimeFieldDirect.values.length > 0 && !responseTimeValue) {
        responseTimeValue = responseTimeFieldDirect.values[responseTimeFieldDirect.values.length - 1];
        console.log('✅ Extracted response_time from response_time field:', responseTimeValue);
      }
      
      // If not found in labels, try to find as separate fields (non-pivoted data)
      if (!statusCodeValue) {
        const statusCodeField = fields.find((f: Field) => {
          const fieldName = f.name.toLowerCase();
          return fieldName.includes('status_code') ||
                 fieldName.includes('http_response_code') ||
                 fieldName === 'http_response_code' ||
                 fieldName === 'status_code' ||
                 fieldName === 'statuscode';
        });
        
        if (statusCodeField && statusCodeField.values && statusCodeField.values.length > 0) {
          statusCodeValue = statusCodeField.values[statusCodeField.values.length - 1];
          console.log('✅ Extracted status_code from field values:', statusCodeValue);
        }
      }
      
      // Try to find response time as separate field if not in labels
      if (!responseTimeValue) {
        const responseTimeField = fields.find((f: Field) => {
          const fieldName = f.name.toLowerCase();
          return fieldName.includes('response_time') ||
                 fieldName === 'response_time' ||
                 fieldName === 'responsetime';
        });
        
        if (responseTimeField && responseTimeField.values && responseTimeField.values.length > 0) {
          responseTimeValue = responseTimeField.values[responseTimeField.values.length - 1];
          console.log('✅ Extracted response_time from field values:', responseTimeValue);
        }
      }

      console.log('🔍 Final values - status code:', statusCodeValue, 'response time:', responseTimeValue);

      // Process status code
      if (statusCodeValue !== null && statusCodeValue !== undefined) {
        const statusCode = typeof statusCodeValue === 'number' ? statusCodeValue : parseFloat(statusCodeValue);

        console.log('🔍 Parsed status code:', statusCode);

        if (!isNaN(statusCode)) {
          const statusInfo = getHttpStatusText(statusCode);
          setStatus(statusInfo.text);
          setStatusColor(statusInfo.color);
          console.log('✅ Set HTTP status:', statusInfo.text, 'color:', statusInfo.color);
        } else {
          setStatus('Down');
          setStatusColor('red');
          console.log('❌ Invalid status code, setting Down');
        }
      } else {
        setStatus('Down');
        setStatusColor('red');
        console.log('❌ No status code found, setting Down');
      }

      // Process response time
      if (responseTimeValue !== null && responseTimeValue !== undefined) {
        const time = typeof responseTimeValue === 'number' ? responseTimeValue : parseFloat(responseTimeValue);
        if (!isNaN(time)) {
          setResponseTime(time);
          console.log('✅ Set response time:', time);
        }
      }
    };

    const processDnsResponse = (fields: Field[]) => {
      // Find rcode field
      const rcodeField = fields.find((f: Field) =>
        f.name.toLowerCase().includes('rcode') ||
        f.name === 'rcode'
      );

      // Find query_time_ms field (or any value field)
      const timeField = fields.find((f: Field) =>
        f.name.toLowerCase().includes('query_time') ||
        f.name === 'query_time_ms' ||
        f.name === '_value' ||
        f.name === 'Value'
      );

      // Check rcode status
      if (rcodeField && rcodeField.values && rcodeField.values.length > 0) {
        const latestRcode = rcodeField.values[rcodeField.values.length - 1];
        const rcodeValue = typeof latestRcode === 'string' ? latestRcode : String(latestRcode);

        if (rcodeValue.toUpperCase() === 'NOERROR') {
          setStatus('OK');
          setStatusColor('green');
        } else {
          setStatus('Down');
          setStatusColor('red');
        }
      } else {
        setStatus('Down');
        setStatusColor('red');
      }

      // Extract response time
      if (timeField && timeField.values && timeField.values.length > 0) {
        const latestTime = timeField.values[timeField.values.length - 1];
        const time = typeof latestTime === 'number' ? latestTime : parseFloat(latestTime);
        setResponseTime(!isNaN(time) ? time : null);
      }
    };

    if (panelId) {
      fetchData();
      const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    } else {
      processQueryResult();
    }
  }, [panelId, queryResult, options]);

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
