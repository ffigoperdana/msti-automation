import React, { useEffect, useState } from 'react';

interface InterfaceProps {
  panelId?: string;
  queryResult?: any;
  options?: any;
}

interface Field {
  name: string;
  type: string;
  values: any[];
  config?: {
    unit: string;
  };
}

const Interface: React.FC<InterfaceProps> = ({ queryResult }) => {
  const [status, setStatus] = useState<string>('UNKNOWN');
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processData = () => {
      try {
        setLoading(true);
        
        console.log('🔌 Interface - Processing data:', JSON.stringify(queryResult, null, 2));
        
        // Use queryResult prop instead of making API call
        if (queryResult && Object.keys(queryResult).length > 0) {
          // Get the first query result
          const firstQueryKey = Object.keys(queryResult)[0];
          const firstQueryResult = queryResult[firstQueryKey];
          
          console.log('🔌 Interface - First query result:', firstQueryResult);
          
          if (firstQueryResult?.series?.[0]?.fields) {
            const fields = firstQueryResult.series[0].fields;
            
            console.log('🔌 Interface - Fields:', fields);
            
            const valueField = fields.find((f: Field) => 
              f.name === "Value" || 
              f.name === "_value" || 
              f.name.includes("value") ||
              f.name.includes("ifOperStatus") ||
              f.type === "string" ||
              f.type === "number"
            );
            const timeField = fields.find((f: Field) => f.name === "Time" || f.type === "time");
            
            console.log('🔌 Interface - Value field:', valueField);
            console.log('🔌 Interface - Time field:', timeField);
            
            if (valueField && valueField.values && valueField.values.length > 0) {
              const latestValue = valueField.values[valueField.values.length - 1];
              const latestTime = timeField ? timeField.values[timeField.values.length - 1] : null;
              
              console.log('🔌 Interface - Latest value:', latestValue, 'Type:', typeof latestValue);
              console.log('🔌 Interface - Latest time:', latestTime);
              
              if (latestTime) {
                setLastUpdate(new Date(latestTime).toLocaleString());
              }
              
              // Convert value to status
              // SNMP ifOperStatus values: 1=up, 2=down, 3=testing, 4=unknown, 5=dormant, 6=notPresent, 7=lowerLayerDown
              let newStatus = 'UNKNOWN';
              if (typeof latestValue === 'string') {
                newStatus = latestValue.toUpperCase();
              } else if (typeof latestValue === 'number') {
                console.log('🔌 Interface - Converting number to status:', latestValue);
                if (latestValue === 1) {
                  newStatus = 'UP';
                } else if (latestValue === 2) {
                  newStatus = 'DOWN';
                } else if (latestValue === 3) {
                  newStatus = 'TESTING';
                } else if (latestValue === 5) {
                  newStatus = 'DORMANT';
                } else if (latestValue === 6) {
                  newStatus = 'NOT PRESENT';
                } else if (latestValue === 7) {
                  newStatus = 'LOWER LAYER DOWN';
                } else {
                  newStatus = 'UNKNOWN';
                }
              }
              
              console.log('🔌 Interface - Final status:', newStatus);
              setStatus(newStatus);
              setError(null);
            } else {
              setStatus('UNKNOWN');
              setError('No interface data available');
            }
          } else {
            setStatus('UNKNOWN');
            setError('No interface data available');
          }
        } else {
          setStatus('UNKNOWN');
          setError('No data received');
        }
      } catch (err) {
        console.error('Interface component error:', err);
        setError('Failed to process interface data');
        setStatus('UNKNOWN');
      } finally {
        setLoading(false);
      }
    };

    processData();
  }, [queryResult]);

  return (
    <div className={`flex flex-col items-center justify-center p-6 rounded-lg ${
      status === 'UP' ? 'bg-green-50' : 
      status === 'DOWN' || status === 'LOWER LAYER DOWN' ? 'bg-red-50' : 
      status === 'TESTING' || status === 'DORMANT' ? 'bg-yellow-50' : 
      'bg-gray-50'
    }`}>
      {loading ? (
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <>
          <div className={`text-6xl font-bold ${
            status === 'UP' ? 'text-green-600' : 
            status === 'DOWN' || status === 'LOWER LAYER DOWN' ? 'text-red-600' : 
            status === 'TESTING' || status === 'DORMANT' ? 'text-yellow-600' : 
            'text-gray-400'
          }`}>
            {status}
          </div>
          {lastUpdate && (
            <div className="text-sm text-gray-500 mt-4">
              Last updated: {lastUpdate}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Interface;