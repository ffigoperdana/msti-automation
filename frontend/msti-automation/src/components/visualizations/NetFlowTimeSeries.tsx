import React, { useEffect, useState, useRef } from 'react';
import * as echarts from 'echarts';

interface NetFlowTimeSeriesProps {
  data?: any;
  panelId?: string;
  queryResult?: any;
}

const NetFlowTimeSeries: React.FC<NetFlowTimeSeriesProps> = ({ data, queryResult }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processedSeries, setProcessedSeries] = useState<any[]>([]);

  // Process the 3 queries (src, dst, bytes) and combine them
  useEffect(() => {
    setLoading(true);
    try {
      setError(null);

      if (!queryResult || typeof queryResult !== 'object') {
        setProcessedSeries([]);
        setLoading(false);
        return;
      }

      console.log('=== NetFlow Time Series Raw Data ===');
      console.log('Full queryResult:', queryResult);

      // queryResult should have 3 keys: 'src', 'dst', 'bytes'
      const srcData = queryResult['src'];
      const dstData = queryResult['dst'];
      const bytesData = queryResult['bytes'];

      console.log('Source Data:', srcData);
      console.log('Destination Data:', dstData);
      console.log('Bytes Data:', bytesData);
      console.log('Bytes Data structure:', {
        hasSeries: !!bytesData?.series,
        seriesLength: bytesData?.series?.length,
        firstSeries: bytesData?.series?.[0],
        hasFields: !!bytesData?.fields,
        fieldsLength: bytesData?.fields?.length
      });

      if (!srcData || !dstData || !bytesData) {
        setError('Missing query results. Expected src, dst, and bytes data.');
        setProcessedSeries([]);
        setLoading(false);
        return;
      }

      // Handle both 'series' and 'fields' formats from backend
      const extractTimeSeries = (data: any) => {
        console.log('=== Extracting from data:', data);
        
        // Check if data has 'series' array (standard format)
        if (data.series && Array.isArray(data.series) && data.series.length > 0) {
          console.log('Using series format. Series count:', data.series.length);
          console.log('First series structure:', data.series[0]);
          
          const result = data.series.map((serie: any) => {
            console.log('Processing serie:', serie);
            console.log('Serie has fields:', !!serie.fields);
            console.log('Serie has data:', !!serie.data);
            
            // Check if serie has 'fields' array (Grafana-like format)
            if (serie.fields && Array.isArray(serie.fields)) {
              console.log('Serie uses fields format!', serie.fields);
              const timeField = serie.fields.find((f: any) => f.type === 'time' || f.name === 'Time');
              const valueField = serie.fields.find((f: any) => f.type !== 'time' && f.type === 'number');
              
              if (timeField && valueField && timeField.values && valueField.values) {
                const timeValues = timeField.values;
                const dataValues = valueField.values;
                const dataPoints = timeValues.map((time: number, index: number) => [time, dataValues[index]]);
                
                console.log('Extracted from fields:', {
                  timeFieldName: timeField.name,
                  valueFieldName: valueField.name,
                  dataPointsCount: dataPoints.length,
                  sample: dataPoints.slice(0, 3)
                });
                
                return {
                  name: valueField.name,
                  data: dataPoints
                };
              }
            }
            
            // Fallback to serie.data if it exists
            if (serie.data) {
              return {
                name: serie.name || 'data',
                data: serie.data
              };
            }
            
            console.warn('Serie has neither fields nor data!');
            return {
              name: serie.name || 'data',
              data: []
            };
          });
          
          console.log('Extracted from series:', result);
          return result;
        }

        // Check if data has 'fields' array (alternative format)
        if (data.fields && Array.isArray(data.fields)) {
          console.log('Using fields format:', data.fields);
          const timeField = data.fields.find((f: any) => f.name === 'time' || f.type === 'time');
          const valueFields = data.fields.filter((f: any) => f.name !== 'time' && f.type !== 'time');

          if (!timeField || !valueFields.length) {
            console.warn('Missing time or value fields');
            return [];
          }

          const timeValues = timeField.values || [];
          
          return valueFields.map((valueField: any) => {
            const values = valueField.values || [];
            const dataPoints = timeValues.map((time: number, index: number) => {
              return [time, values[index]];
            }).filter((point: any[]) => point[1] !== null && point[1] !== undefined);

            return {
              name: valueField.name,
              data: dataPoints
            };
          });
        }

        console.warn('No recognized data format found');
        return [];
      };

      const srcSeries = extractTimeSeries(srcData);
      const dstSeries = extractTimeSeries(dstData);
      const bytesSeries = extractTimeSeries(bytesData);

      console.log('Extracted series:', { srcSeries, dstSeries, bytesSeries });

      if (!bytesSeries || bytesSeries.length === 0) {
        console.warn('Bytes data has no series after extraction');
        setError('No data available. Bytes query returned empty results.');
        setProcessedSeries([]);
        setLoading(false);
        return;
      }

      // Get the bytes series (should be in_bytes)
      const bytesSerieData = bytesSeries.find((s: any) => s.name === 'in_bytes' || s.name.includes('bytes') || s.name === 'data');
      if (!bytesSerieData || !bytesSerieData.data || bytesSerieData.data.length === 0) {
        console.error('No valid bytes data found. Available series:', bytesSeries);
        setError('No in_bytes field found in query result or data is empty');
        setProcessedSeries([]);
        setLoading(false);
        return;
      }

      console.log('Using bytes series:', bytesSerieData);

      // For now, create a simple series for total bytes
      // In a real scenario, you'd need to group by src->dst pairs
      const colors = [
        '#5470c6', '#91cc75', '#fac858', '#ee6666', 
        '#73c0de', '#3ba272', '#fc8452', '#9a60b4',
        '#4e79a7', '#f28e2c', '#e15759', '#76b7b2',
        '#59a14f', '#edc949', '#af7aa1', '#ff9da7'
      ];

      // Simple approach: show the bytes data as-is
      const series: any[] = [{
        name: bytesData.labels?.source || 'NetFlow Traffic (in_bytes)',
        data: bytesSerieData.data,
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2 },
        itemStyle: { color: colors[0] },
        areaStyle: { 
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: colors[0] + '40' },
              { offset: 1, color: colors[0] + '10' }
            ]
          }
        }
      }];

      console.log('Final processed Series:', series);
      setProcessedSeries(series);
      setLoading(false);
    } catch (e: any) {
      console.error('Error processing NetFlow data:', e);
      setError(e?.message || 'Failed to process NetFlow data');
      setProcessedSeries([]);
      setLoading(false);
    }
  }, [queryResult, data]);

  // Initialize and update ECharts
  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize chart if not exists
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    if (processedSeries.length === 0) {
      chartInstance.current.setOption({
        title: {
          text: 'No Data',
          left: 'center',
          top: 'center',
          textStyle: { fontSize: 14, color: '#999' }
        }
      });
      return;
    }

    // Calculate time range from data
    let minTime = Infinity;
    let maxTime = -Infinity;

    processedSeries.forEach(serie => {
      serie.data.forEach(([timestamp]: [number, number]) => {
        minTime = Math.min(minTime, timestamp);
        maxTime = Math.max(maxTime, timestamp);
      });
    });

    const option: echarts.EChartsOption = {
      title: {
        text: 'NetFlow Traffic (in_bytes)',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 'bold' }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          
          const time = new Date(params[0].value[0]).toLocaleString();
          let content = `<strong>${time}</strong><br/>`;
          
          params.forEach((param: any) => {
            const value = param.value[1];
            const formattedValue = value >= 1000000 
              ? `${(value / 1000000).toFixed(2)} MB`
              : value >= 1000
              ? `${(value / 1000).toFixed(2)} KB`
              : `${value} B`;
            
            content += `${param.marker} ${param.seriesName}: <strong>${formattedValue}</strong><br/>`;
          });
          
          return content;
        }
      },
      legend: {
        type: 'scroll',
        bottom: 0,
        data: processedSeries.map(s => s.name)
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'time',
        min: minTime,
        max: maxTime,
        axisLabel: {
          formatter: (value: number) => {
            const date = new Date(value);
            return date.toLocaleTimeString();
          }
        }
      },
      yAxis: {
        type: 'value',
        name: 'Bytes',
        axisLabel: {
          formatter: (value: number) => {
            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
            if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
            return value.toString();
          }
        }
      },
      series: processedSeries
    };

    chartInstance.current.setOption(option);

    // Handle resize
    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [processedSeries]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <div className="mt-2 text-sm text-gray-600">Loading NetFlow data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-red-500">
          <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <div ref={chartRef} style={{ width: '100%', height: '100%', minHeight: '400px' }} />
    </div>
  );
};

export default NetFlowTimeSeries;
