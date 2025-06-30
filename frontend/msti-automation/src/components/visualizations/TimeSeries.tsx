import { useRef, useEffect } from 'react';
import { QueryResult } from '../../store/dashboardStore';
import * as echarts from 'echarts';

interface TimeSeriesProps {
  data: Record<string, QueryResult>;
  options: {
    unit?: string;
    decimals?: number;
    [key: string]: any;
  };
}

const TimeSeries = ({ data, options }: TimeSeriesProps) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  
  useEffect(() => {
    // Cleanup previous chart instance on unmount
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
      }
    };
  }, []);
  
  useEffect(() => {
    if (!chartRef.current) return;
    
    // Initialize chart if not exists
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }
    
    // Format data for ECharts
    const series: any[] = [];
    const allTimestamps = new Set<string>();
    
    // Safety check: ensure data exists and is not null/undefined
    if (!data || typeof data !== 'object') {
      console.warn('TimeSeries component: data is null or undefined');
      return;
    }
    
    // Collect all timestamps first
    Object.entries(data).forEach(([, queryResult]) => {
      // Safety check: ensure queryResult exists and has series
      if (!queryResult || !queryResult.series || !Array.isArray(queryResult.series)) {
        console.warn('TimeSeries component: queryResult or series is null/undefined', queryResult);
        return;
      }
      
      queryResult.series.forEach(serie => {
        // Safety check: ensure serie exists and has data
        if (!serie || !serie.data || !Array.isArray(serie.data)) {
          console.warn('TimeSeries component: serie or serie.data is null/undefined', serie);
          return;
        }
        
        serie.data.forEach(point => {
          // Safety check: ensure point exists and has time property
          if (!point || !point.time) {
            console.warn('TimeSeries component: point or point.time is null/undefined', point);
            return;
          }
          
          allTimestamps.add(point.time);
        });
      });
    });
    
    // Sort timestamps
    const sortedTimestamps = Array.from(allTimestamps).sort();
    
    // Create series for each query result
    Object.entries(data).forEach(([refId, queryResult]) => {
      // Safety check: ensure queryResult exists and has series
      if (!queryResult || !queryResult.series || !Array.isArray(queryResult.series)) {
        console.warn('TimeSeries component: queryResult or series is null/undefined in second loop', queryResult);
        return;
      }
      
      queryResult.series.forEach(serie => {
        // Safety check: ensure serie exists and has data
        if (!serie || !serie.data || !Array.isArray(serie.data)) {
          console.warn('TimeSeries component: serie or serie.data is null/undefined in second loop', serie);
          return;
        }
        
        // Map data to timestamps
        const dataMap = new Map<string, number>();
        serie.data.forEach(point => {
          // Safety check: ensure point exists and has required properties
          if (!point || !point.time || point.value === undefined) {
            console.warn('TimeSeries component: point, point.time, or point.value is null/undefined in second loop', point);
            return;
          }
          
          dataMap.set(point.time, point.value);
        });
        
        // Create series data with nulls for missing timestamps
        const seriesData = sortedTimestamps.map(timestamp => {
          return dataMap.has(timestamp) ? dataMap.get(timestamp) : null;
        });
        
        series.push({
          name: serie.name || refId,
          type: 'line',
          smooth: true,
          data: seriesData,
        });
      });
    });
    
    // Create option config
    const chartOptions = {
      tooltip: {
        trigger: 'axis',
        formatter: function(params: any) {
          let result = params[0].axisValue + '<br/>';
          params.forEach((param: any) => {
            const value = param.value === null ? '-' : param.value.toFixed(options.decimals || 2);
            result += `${param.marker} ${param.seriesName}: ${value}${options.unit || ''}<br/>`;
          });
          return result;
        }
      },
      legend: {
        data: series.map(s => s.name),
        orient: 'horizontal',
        bottom: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: sortedTimestamps.map(t => {
          const date = new Date(t);
          return date.toLocaleTimeString();
        })
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: `{value}${options.unit || ''}`
        }
      },
      series
    };
    
    // Set options and render chart
    chartInstance.current.setOption(chartOptions);
    
    // Resize chart on window resize
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

export default TimeSeries; 