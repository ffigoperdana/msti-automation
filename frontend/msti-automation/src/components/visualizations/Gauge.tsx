import { useRef, useEffect } from 'react';
import { QueryResult } from '../../store/dashboardStore';
import * as echarts from 'echarts';

interface GaugeProps {
  data: Record<string, QueryResult>;
  options: {
    min?: number;
    max?: number;
    thresholds?: {
      value: number;
      color: string;
    }[];
    unit?: string;
    decimals?: number;
    [key: string]: any;
  };
}

const Gauge = ({ data, options }: GaugeProps) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  
  useEffect(() => {
    // Cleanup chart on unmount
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
      }
    };
  }, []);
  
  useEffect(() => {
    if (!chartRef.current) return;
    
    // Initialize chart
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }
    
    // Get the last value from the first series
    let value = 0;
    let title = '';
    
    if (Object.keys(data).length > 0) {
      const firstQueryKey = Object.keys(data)[0];
      const queryResult = data[firstQueryKey];
      
      if (queryResult.series.length > 0) {
        const serie = queryResult.series[0];
        title = serie.name || firstQueryKey;
        
        if (serie.data.length > 0) {
          // Sort and get the latest value
          const sortedData = [...serie.data].sort((a, b) => 
            new Date(b.time).getTime() - new Date(a.time).getTime()
          );
          value = sortedData[0].value;
        }
      }
    }
    
    // Default options
    const min = options.min || 0;
    const max = options.max || 100;
    
    // Determine threshold colors
    let axisLineData = [
      [1, '#5470c6'] // Default color
    ];
    
    if (options.thresholds && options.thresholds.length > 0) {
      // Sort thresholds by value
      const sortedThresholds = [...options.thresholds].sort((a, b) => a.value - b.value);
      
      // Create axis line data for each threshold
      axisLineData = sortedThresholds.map((threshold, index, arr) => {
        const nextValue = index === arr.length - 1 ? max : arr[index + 1].value;
        return [(threshold.value - min) / (max - min), threshold.color];
      });
      
      // Add the last threshold to complete the gauge
      if (sortedThresholds.length > 0) {
        const lastThreshold = sortedThresholds[sortedThresholds.length - 1];
        axisLineData.push([1, lastThreshold.color]);
      }
    }
    
    // Create chart options
    const chartOptions = {
      series: [
        {
          type: 'gauge',
          startAngle: 180,
          endAngle: 0,
          min,
          max,
          splitNumber: 5,
          title: {
            fontWeight: 'bolder',
            fontSize: 14,
            offsetCenter: [0, '30%'],
          },
          pointer: {
            icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
            length: '60%',
            width: 8,
            offsetCenter: [0, '50%'],
            itemStyle: {
              color: 'inherit'
            }
          },
          axisTick: {
            length: 12,
            lineStyle: {
              color: 'inherit',
              width: 2
            }
          },
          splitLine: {
            length: 20,
            lineStyle: {
              color: 'inherit',
              width: 2
            }
          },
          axisLabel: {
            color: '#464646',
            fontSize: 12,
            distance: -60,
            formatter: function(value: number) {
              return value.toFixed(options.decimals || 0) + (options.unit || '');
            }
          },
          detail: {
            fontSize: 18,
            offsetCenter: [0, '60%'],
            valueAnimation: true,
            formatter: function(value: number) {
              return value.toFixed(options.decimals || 0) + (options.unit || '');
            },
            color: 'inherit'
          },
          data: [{
            value: value,
            name: title
          }],
          axisLine: {
            lineStyle: {
              width: 30,
              color: axisLineData
            }
          }
        }
      ]
    };
    
    // Apply options
    chartInstance.current.setOption(chartOptions);
    
    // Resize handler
    const handleResize = () => {
      if (chartInstance.current) {
        chartInstance.current.resize();
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [data, options]);
  
  return (
    <div ref={chartRef} className="w-full h-full" />
  );
};

export default Gauge; 