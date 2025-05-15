import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { QueryResult } from '../../store/dashboardStore';

interface GaugeProps {
  data: Record<string, QueryResult>;
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

const Gauge: React.FC<GaugeProps> = ({ data, options = {} }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  
  // Extract the value from data
  let value = 0;
  
  if (data && Object.keys(data).length > 0) {
    const queryResult = data[Object.keys(data)[0]];
    if (queryResult && queryResult.series?.length > 0) {
      const series = queryResult.series[0];
      if (series.data?.length > 0) {
        const lastValue = series.data[series.data.length - 1];
        if (lastValue && typeof lastValue === 'object' && 'value' in lastValue) {
          value = lastValue.value;
        }
      }
    }
  }
  
  useEffect(() => {
    // Initialize chart
    if (chartRef.current) {
      if (!chartInstance.current) {
        chartInstance.current = echarts.init(chartRef.current);
      }
      
      // Format the value with specified number of decimals
      const formattedValue = (options.decimals !== undefined) 
        ? value.toFixed(options.decimals) 
        : value.toFixed(2);
      
      // Prepare axis line colors based on thresholds
      let axisLineColors: Array<[number, string]> = [[1, '#5470c6']]; // Default blue
      
      if (options.thresholds && options.thresholds.steps && options.thresholds.steps.length > 0) {
        const steps = options.thresholds.steps;
        const min = options.min || 0;
        const max = options.max || 100;
        const range = max - min;
        
        axisLineColors = steps.map((step, index) => {
          const normalizedValue = (step.value - min) / range;
          return [normalizedValue, step.color] as [number, string];
        });
        
        // Add the final color to the end (use last color to max)
        if (steps.length > 0 && axisLineColors.length > 0) {
          axisLineColors[axisLineColors.length - 1][0] = 1;
        }
      }
      
      // Format display value with unit
      const unitSuffix = options.unit ? ` ${options.unit}` : '';
      
      // Chart options
      const chartOptions: echarts.EChartsOption = {
        series: [{
          type: 'gauge',
          min: options.min || 0,
          max: options.max || 100,
          axisLine: {
            lineStyle: {
              width: 30,
              color: axisLineColors
            }
          },
          pointer: {
            itemStyle: {
              color: 'auto'
            }
          },
          axisTick: {
            distance: -30,
            length: 8,
            lineStyle: {
              color: '#fff',
              width: 2
            }
          },
          splitLine: {
            distance: -30,
            length: 30,
            lineStyle: {
              color: '#fff',
              width: 4
            }
          },
          axisLabel: {
            color: 'inherit',
            distance: 40,
            fontSize: 14
          },
          detail: {
            valueAnimation: true,
            formatter: `{value}${unitSuffix}`,
            color: 'inherit',
            fontSize: 30
          },
          data: [{
            value: parseFloat(formattedValue),
            name: options.unit || '',
            title: {
              offsetCenter: ['0%', '70%']
            }
          }]
        }]
      };
      
      // Apply options and render chart
      chartInstance.current.setOption(chartOptions);
    }
    
    // Handle resize
    const handleResize = () => {
      chartInstance.current?.resize();
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
    };
  }, [data, options, value]);
  
  return (
    <div ref={chartRef} className="w-full h-full" />
  );
};

export default Gauge; 