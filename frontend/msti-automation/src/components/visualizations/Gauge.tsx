import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import metricService from '../../services/metricService';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

interface GaugeProps {
  panelId?: string;
  data?: Record<string, any>;
  queryResult?: Record<string, any>;
  options?: {
    unit?: string;
    decimals?: number;
    min?: number;
    max?: number;
    thresholds?: {
      steps: Array<{
        value: number;
        color: string;
      }>;
    };
  };
}

interface Field {
  name: string;
  type: string;
  values: any[];
  config?: {
    unit: string;
  };
}

const Gauge: React.FC<GaugeProps> = ({ panelId, data, queryResult, options = {} }) => {
  const [value, setValue] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to extract value from API response (similar to Interface component)
  const extractValueFromResponse = (response: any): number => {
    try {
      if (response?.[0]?.result?.series?.[0]?.fields) {
        const fields = response[0].result.series[0].fields;
        
        const valueField = fields.find((f: Field) => 
          f.name === "Value" || 
          f.name === "_value" || 
          f.name === "avg" || 
          f.name.includes("value") ||
          f.type === "number"
        );
        
        if (valueField && valueField.values && valueField.values.length > 0) {
          const latestValue = valueField.values[valueField.values.length - 1];
          const numValue = typeof latestValue === 'string' ? parseFloat(latestValue) : latestValue;
          const finalValue = isNaN(numValue) ? 0 : numValue;
          return finalValue;
        }
      }
      return 0;
    } catch (err) {
      console.error('Error extracting value from response:', err);
      return 0;
    }
  };

  // Fetch data from API when panelId is provided (similar to Interface component)
  useEffect(() => {
    const fetchData = async () => {
      if (!panelId) return;

      try {
        setLoading(true);
        const response = await metricService.executePanelQuery(panelId);
        const extractedValue = extractValueFromResponse(response);
        setValue(extractedValue);
        setError(null);
      } catch (err) {
        console.error('Gauge component error:', err);
        setError('Failed to fetch gauge data');
        setValue(0);
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

  // Process data prop if no panelId (fallback for existing usage)
  useEffect(() => {
    if (!panelId && (data || queryResult) && typeof (data || queryResult) === 'object' && Object.keys(data || queryResult || {}).length > 0) {
      const dataSource = queryResult || data;
      setLoading(false);
      
      try {
        const queryResultData = dataSource![Object.keys(dataSource!)[0]];
        if (queryResultData?.series?.[0]?.data) {
          const series = queryResultData.series[0];
          if (series.data.length > 0) {
            const lastValue = series.data[series.data.length - 1];
            if (lastValue && typeof lastValue === 'object' && 'value' in lastValue) {
              setValue(typeof lastValue.value === 'number' ? lastValue.value : 0);
            }
          }
        }
      } catch (err) {
        console.error('Error processing data prop:', err);
        setValue(0);
      }
    }
  }, [data, queryResult, panelId]);

  // Gauge configuration
  const min = options.min || 0;
  const max = options.max || 100;
  const percentage = Math.min(Math.max((value - min) / (max - min) * 100, 0), 100);
  
  // Determine color based on thresholds or default
  let gaugeColor = '#3b82f6'; // Default blue
  if (options.thresholds && options.thresholds.steps) {
    for (const step of options.thresholds.steps.sort((a, b) => a.value - b.value)) {
      if (value >= step.value) {
        gaugeColor = step.color;
      }
    }
  }

  // Chart.js configuration for gauge
  const chartData = {
    datasets: [
      {
        data: [percentage, 100 - percentage],
        backgroundColor: [gaugeColor, '#e5e7eb'],
        borderWidth: 0,
        cutout: '70%',
        circumference: 180,
        rotation: 270,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      animateRotate: true,
      duration: 1000,
    },
    layout: {
      padding: {
        top: 10,
        bottom: 5,
        left: 10,
        right: 10,
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
  };

  // Format display value
  const displayValue = (options.decimals !== undefined) 
    ? value.toFixed(options.decimals) 
    : value.toFixed(1);
  
  const unitSuffix = options.unit ? options.unit : '';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 rounded-lg bg-gray-50 h-full">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-6 rounded-lg bg-red-50 h-full">
        <div className="text-red-500 text-center">
          <div className="text-4xl mb-2">⚠️</div>
          <div>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col justify-center items-center bg-gray-50 p-4">
      {/* Chart container di atas */}
      <div className="flex-1 flex items-center justify-center">
        <div style={{ width: '180px', height: '90px', position: 'relative' }}>
          <Doughnut data={chartData} options={chartOptions} />
        </div>
      </div>
      
      {/* Value display di bawah gauge */}
      <div className="text-center mb-2">
        <div className="text-3xl font-bold text-blue-600 leading-tight">
          {displayValue}
          <span className="text-lg font-normal text-gray-600 ml-2">{unitSuffix}</span>
        </div>
      </div>
      
      {/* Range info di paling bawah */}
      <div className="text-center">
        <div className="text-sm text-gray-500 font-medium">
          Range: {min} - {max}{unitSuffix}
        </div>
      </div>
    </div>
  );
};

export default Gauge; 