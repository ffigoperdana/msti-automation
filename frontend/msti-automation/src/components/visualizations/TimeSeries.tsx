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

const TimeSeries: React.FC<TimeSeriesProps> = ({ data, queryResult, panelId }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendData, setBackendData] = useState<any>(null);
  const [selectedInterfaces, setSelectedInterfaces] = useState<string[]>([]);
  const [showInterfaceDropdown, setShowInterfaceDropdown] = useState(false);
  const [interfaceSearchQuery, setInterfaceSearchQuery] = useState('');

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

  // Extract unique interface names from series
  const availableInterfaces = useMemo((): string[] => {
    if (!activeData?.series || activeData.series.length === 0) return [];
    
    const interfaces: string[] = activeData.series.map((serie: any): string => {
      // Extract interface name from series name format: "ifOutOctets (GigabitEthernet0/10)"
      const match = serie.name.match(/\(([^)]+)\)/);
      return match ? match[1] : serie.name;
    });
    
    return Array.from(new Set<string>(interfaces)).sort();
  }, [activeData]);

  // Load selected interfaces from localStorage on mount
  useEffect(() => {
    if (panelId && availableInterfaces.length > 0) {
      const storageKey = `timeseries-interfaces-${panelId}`;
      const saved = localStorage.getItem(storageKey);
      
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Only use saved interfaces that still exist in current data
          const validInterfaces = parsed.filter((iface: string) => 
            availableInterfaces.includes(iface)
          );
          if (validInterfaces.length > 0) {
            setSelectedInterfaces(validInterfaces);
            return;
          }
        } catch (e) {
          console.warn('Failed to parse saved interfaces:', e);
        }
      }
      
      // Default: select all interfaces
      setSelectedInterfaces(availableInterfaces);
    }
  }, [panelId, availableInterfaces]);

  // Save selected interfaces to localStorage when changed
  useEffect(() => {
    if (panelId && selectedInterfaces.length > 0) {
      const storageKey = `timeseries-interfaces-${panelId}`;
      localStorage.setItem(storageKey, JSON.stringify(selectedInterfaces));
    }
  }, [panelId, selectedInterfaces]);

  // Helper function to clean series name by removing field name (e.g., "ifInOctets")
  const cleanSeriesName = (seriesName: string): string => {
    // Remove field name pattern: "fieldName - " or "fieldName (interface)" -> "(interface)"
    // Example: "RTR-MSI-SUPARK-01 - ifInOctets (GigabitEthernet0/0/0)" -> "RTR-MSI-SUPARK-01 (GigabitEthernet0/0/0)"
    // Example: "ifInOctets (GigabitEthernet0/0/0)" -> "GigabitEthernet0/0/0"
    let cleaned = seriesName;
    
    // Remove patterns like "ifInOctets", "ifOutOctets", etc.
    cleaned = cleaned.replace(/\s*-?\s*if(In|Out)?\w*\s*/gi, ' ');
    
    // Clean up extra spaces and dashes
    cleaned = cleaned.replace(/\s+-\s+/g, ' - ');
    cleaned = cleaned.replace(/\s+\(/g, ' (');
    cleaned = cleaned.replace(/^\s+|\s+$/g, '');
    
    // If only interface name in parentheses remains, remove parentheses
    const onlyParentheses = cleaned.match(/^\(([^)]+)\)$/);
    if (onlyParentheses) {
      cleaned = onlyParentheses[1];
    }
    
    return cleaned;
  };

  // Helper function to detect if field is bandwidth (Octets) and should be converted to Mbps
  const shouldConvertToMbps = (seriesName: string): boolean => {
    const name = seriesName.toLowerCase();
    return name.includes('octets') || name.includes('ifin') || name.includes('ifout');
  };

  // Helper function to convert octets (bytes) to Mbps
  const bpsToMbps = (octets: number): number => {
    // Octets to Mbps: (octets * 8 bits/byte) / 1,000,000 = octets / 125,000
    return octets / 125000 / 1000;
  };

  // Check if we have bandwidth data (store for Y-axis formatter)
  const hasBandwidthData = useMemo(() => {
    if (!activeData?.series || activeData.series.length === 0) return false;
    return activeData.series.some((serie: any) => shouldConvertToMbps(serie.name));
  }, [activeData]);

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

    // Filter series based on selected interfaces
    const filteredSeries = activeData.series.filter((serie: any) => {
      const match = serie.name.match(/\(([^)]+)\)/);
      const interfaceName = match ? match[1] : serie.name;
      return selectedInterfaces.includes(interfaceName);
    });

    // Backend sends CORRECT format - just map colors!
    return filteredSeries.map((serie: any, index: number) => {
      const color = colors[index % colors.length];
      
      // Convert data to Mbps if it's bandwidth data
      const shouldConvert = shouldConvertToMbps(serie.name);
      const convertedData = shouldConvert 
        ? serie.data.map(([time, value]: [number, number]) => [time, bpsToMbps(value)])
        : serie.data;
      
      return {
        name: cleanSeriesName(serie.name),
        data: convertedData, // Converted to Mbps if needed
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
  }, [activeData, selectedInterfaces]);

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
            const rawValue = param.value[1];
            const seriesName = param.seriesName;
            
            // Format value (already converted to Mbps if needed in processedData)
            let displayValue: string;
            if (shouldConvertToMbps(seriesName)) {
              displayValue = typeof rawValue === 'number' 
                ? rawValue.toFixed(2) + ' Mbps'
                : rawValue;
            } else {
              displayValue = typeof rawValue === 'number' 
                ? rawValue.toLocaleString() 
                : rawValue;
            }
            
            tooltip += `<div style="color: ${param.color}">● ${seriesName}: ${displayValue}</div>`;
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
          formatter: (value: number) => {
            if (hasBandwidthData) {
              // Always show 2 decimal places for Mbps, no K abbreviation
              return value.toFixed(2) + ' Mbps';
            }
            
            // Regular formatting for non-bandwidth data
            if (value >= 1e9) return (value / 1e9).toFixed(2) + 'B';
            if (value >= 1e6) return (value / 1e6).toFixed(2) + 'M';
            if (value >= 1e3) return (value / 1e3).toFixed(2) + 'K';
            return value.toFixed(2);
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
      {availableInterfaces.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">Series</h4>
            
            {/* Interface Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowInterfaceDropdown(!showInterfaceDropdown)}
                className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span>
                  {selectedInterfaces.length === availableInterfaces.length
                    ? 'All Interfaces'
                    : `${selectedInterfaces.length} of ${availableInterfaces.length} selected`}
                </span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${showInterfaceDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showInterfaceDropdown && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowInterfaceDropdown(false)}
                  />
                  
                  {/* Dropdown Panel */}
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                    {/* Search Box */}
                    <div className="p-3 border-b border-gray-200">
                      <input
                        type="text"
                        placeholder="Search interfaces..."
                        value={interfaceSearchQuery}
                        onChange={(e) => setInterfaceSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    {/* Select All / Deselect All */}
                    <div className="p-2 border-b border-gray-200 bg-gray-50">
                      <button
                        onClick={() => {
                          if (selectedInterfaces.length === availableInterfaces.length) {
                            // Deselect all
                            setSelectedInterfaces([]);
                          } else {
                            // Select all
                            setSelectedInterfaces(availableInterfaces);
                          }
                        }}
                        className="w-full text-left px-2 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded"
                      >
                        {selectedInterfaces.length === availableInterfaces.length ? '✓ Deselect All' : 'Select All'}
                      </button>
                    </div>

                    {/* Interface List */}
                    <div className="max-h-64 overflow-y-auto">
                      {availableInterfaces
                        .filter((iface: string) => 
                          iface.toLowerCase().includes(interfaceSearchQuery.toLowerCase())
                        )
                        .map((interfaceName: string) => (
                          <label
                            key={interfaceName}
                            className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={selectedInterfaces.includes(interfaceName)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedInterfaces([...selectedInterfaces, interfaceName]);
                                } else {
                                  setSelectedInterfaces(selectedInterfaces.filter(i => i !== interfaceName));
                                }
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700 truncate" title={interfaceName}>
                              {interfaceName}
                            </span>
                          </label>
                        ))}
                      
                      {/* No results message */}
                      {availableInterfaces.filter((iface: string) => 
                        iface.toLowerCase().includes(interfaceSearchQuery.toLowerCase())
                      ).length === 0 && (
                        <div className="px-3 py-4 text-sm text-gray-500 text-center">
                          No interfaces found
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="p-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 text-center">
                      {selectedInterfaces.length} interface{selectedInterfaces.length !== 1 ? 's' : ''} selected
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {processedData.length > 0 && (
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
                    
                    // Check if this is bandwidth data (already converted to Mbps)
                    const isBandwidth = shouldConvertToMbps(serie.name);
                    const formatNumber = (val: number) => {
                      if (isBandwidth) {
                        return val.toFixed(2) + ' Mbps';
                      }
                      return val.toLocaleString();
                    };
                    
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
                        <td className="px-3 py-2 whitespace-nowrap">{formatNumber(current)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{formatNumber(min)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{formatNumber(max)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{formatNumber(avg)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          )}
          
          {/* No interfaces selected message */}
          {processedData.length === 0 && selectedInterfaces.length === 0 && (
            <div className="bg-white rounded-lg border p-8 text-center">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-600 font-medium mb-1">No interfaces selected</p>
              <p className="text-sm text-gray-500">
                Click the filter button above to select interfaces to display
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TimeSeries;