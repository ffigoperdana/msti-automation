import React, { useEffect, useState, useMemo, useRef } from 'react';
import * as echarts from 'echarts';

interface TimeSeriesData {
  name: string;
  data: [number, number][];
  type: 'line';
  smooth: boolean;
  symbol: string;
  lineStyle: { width: number };
  itemStyle: { color: string };
  areaStyle?: any;
}

interface TimeSeriesProps {
  data?: any;
  panelId?: string;
  queryResult?: any;
}

const TimeSeries: React.FC<TimeSeriesProps> = ({ data, queryResult }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendData, setBackendData] = useState<any>(null);

  // Gunakan data dari VisualizationPanel (queryResult) agar tidak duplikat fetch
  useEffect(() => {
    setLoading(true);
    try {
      setError(null);

      if (queryResult) {
        // queryResult adalah object keyed by refId -> ambil item pertama
        const values = Object.values(queryResult as Record<string, any>);
        const first = values[0];
        if (first && first.series && first.series.length >= 0) {
          setBackendData(first);
          setLoading(false);
          return;
        }
      }

      // fallback ke prop data bila tersedia
      if (data && data.series) {
        setBackendData(data);
      } else {
        setBackendData(null);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to process data');
      setBackendData(null);
    } finally {
      setLoading(false);
    }
  }, [queryResult, data]);

  // Use backend data if available, otherwise fall back to prop data
  const activeData = backendData || data;

  // Process data for ECharts - SIMPLIFIED!
  const processedData: TimeSeriesData[] = useMemo(() => {
    if (!activeData?.series || activeData.series.length === 0) {
      return [];
    }

    const colors = [
      '#5470c6', '#91cc75', '#fac858', '#ee6666', 
      '#73c0de', '#3ba272', '#fc8452', '#9a60b4',
      '#4e79a7', '#f28e2c', '#e15759', '#76b7b2',
      '#59a14f', '#edc949', '#af7aa1', '#ff9da7'
    ];

    // Backend sends CORRECT format - just map colors!
    return activeData.series.map((serie: any, index: number) => {
      const color = colors[index % colors.length];
      
      return {
        name: serie.name,
        data: serie.data, // Already [time, value] format!
        type: 'line' as const,
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2 },
        itemStyle: { color },
        areaStyle: { 
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: color + '40' },
              { offset: 1, color: color + '10' }
            ]
          }
        }
      };
    });
  }, [activeData]);

  // Initialize and update chart
  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize chart if not exists
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const chart = chartInstance.current;

    if (loading) {
      chart.showLoading();
      return;
    }

    chart.hideLoading();

    if (error || processedData.length === 0) {
      chart.setOption({
        title: {
          text: error || 'No data available',
          left: 'center',
          top: 'middle',
          textStyle: { color: '#999' }
        }
      });
      return;
    }

    // Set chart options
    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        formatter: function(params: any) {
          if (!params || params.length === 0) return '';
          
          const time = new Date(params[0].value[0]).toLocaleString();
          let tooltip = `<div><strong>${time}</strong></div>`;
          
          params.forEach((param: any) => {
            const value = typeof param.value[1] === 'number' 
              ? param.value[1].toLocaleString() 
              : param.value[1];
            tooltip += `<div style="color: ${param.color}">● ${param.seriesName}: ${value}</div>`;
          });
          
          return tooltip;
        }
      },
      legend: {
        data: processedData.map(s => s.name),
        type: 'scroll',
        bottom: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'time',
        name: 'Time',
        nameLocation: 'middle',
        nameGap: 30
      },
      yAxis: {
        type: 'value',
        name: 'Value',
        nameLocation: 'middle',
        nameGap: 40,
        axisLabel: {
          formatter: function(value: number) {
            if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
            if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
            if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K';
            return value.toString();
          }
        }
      },
      series: processedData
    };

    chart.setOption(option, true);

    // Handle resize
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [processedData, loading, error]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">⚠️</div>
          <div className="text-red-600 font-medium">{error}</div>
          <div className="text-gray-500 text-sm mt-1">Check your query and data source</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">Time Series</h3>
          <p className="text-sm text-gray-600">
            {processedData.length} series, {processedData.length} visible
          </p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Refresh
        </button>
      </div>
      
      <div 
        ref={chartRef} 
        className="w-full h-96 bg-white rounded-lg border"
        style={{ minHeight: '400px' }}
      />
      
      {/* Series table - scrollable like Grafana */}
      {processedData.length > 0 && (
        <div className="mt-4">
          <h4 className="font-medium mb-2">Series</h4>
          <div className="bg-white rounded-lg border overflow-hidden">
            {/* Scroll container with sticky header */}
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left">Series</th>
                    <th className="px-3 py-2 text-left">Current</th>
                    <th className="px-3 py-2 text-left">Min</th>
                    <th className="px-3 py-2 text-left">Max</th>
                    <th className="px-3 py-2 text-left">Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {processedData.map((serie, index) => {
                    const values = serie.data.map(d => d[1]).filter(v => !isNaN(v));
                    const current = values[values.length - 1] || 0;
                    const min = values.length ? Math.min(...values) : 0;
                    const max = values.length ? Math.max(...values) : 0;
                    const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
                    
                    return (
                      <tr key={index} className="border-t">
                        <td className="px-3 py-2">
                          <div className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                              style={{ backgroundColor: serie.itemStyle.color }}
                            />
                            <span className="truncate block" title={serie.name}>{serie.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">{current.toLocaleString()}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{min.toLocaleString()}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{max.toLocaleString()}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{avg.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeSeries;