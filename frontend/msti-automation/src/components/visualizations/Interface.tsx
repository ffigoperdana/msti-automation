import React, { useEffect, useState } from 'react';
import metricService from '../../services/metricService';

interface InterfaceProps {
  panelId: string;
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

const Interface: React.FC<InterfaceProps> = ({ panelId }) => {
  const [status, setStatus] = useState<string>('UNKNOWN');
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!panelId) return;

      try {
        setLoading(true);
        const response = await metricService.executePanelQuery(panelId);
        
        if (response?.[0]?.result?.series?.[0]?.fields) {
          const fields = response[0].result.series[0].fields;
          
          const valueField = fields.find((f: Field) => 
            f.name === "Value" || 
            f.name === "_value" || 
            f.name.includes("value")
          );
          const timeField = fields.find((f: Field) => f.name === "Time" || f.type === "time");
          
          if (valueField && valueField.values && valueField.values.length > 0) {
            const latestValue = valueField.values[valueField.values.length - 1];
            const latestTime = timeField ? timeField.values[timeField.values.length - 1] : null;
            
            if (latestTime) {
              setLastUpdate(new Date(latestTime).toLocaleString());
            }
            
            // Convert value to status
            let newStatus = 'UNKNOWN';
            if (typeof latestValue === 'string') {
              newStatus = latestValue.toUpperCase();
            } else if (typeof latestValue === 'number') {
              newStatus = latestValue === 1 ? 'UP' : 'DOWN';
            }
            
            setStatus(newStatus);
          }
        }
        
        setError(null);
      } catch (err) {
        console.error('Interface component error:', err);
        setError('Failed to fetch interface data');
      } finally {
        setLoading(false);
      }
    };

    if (panelId) {
      fetchData();
      const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [panelId]);

  return (
    <div className={`flex flex-col items-center justify-center p-6 rounded-lg ${
      status === 'UP' ? 'bg-green-50' : 
      status === 'DOWN' ? 'bg-red-50' : 
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
          <div className={`text-7xl font-bold ${
            status === 'UP' ? 'text-green-600' : 
            status === 'DOWN' ? 'text-red-600' : 
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