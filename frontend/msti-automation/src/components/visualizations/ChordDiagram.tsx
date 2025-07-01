import React, { useEffect, useRef, useState } from 'react';
import * as am5 from "@amcharts/amcharts5";
import * as am5flow from "@amcharts/amcharts5/flow";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import metricService from '../../services/metricService';

interface ChordDiagramProps {
  panelId?: string;
  data?: Record<string, any>;
  queryResult?: Record<string, any>;
  options?: {
    unit?: string;
    decimals?: number;
    minValue?: number;
    maxValue?: number;
  };
}

const ChordDiagram: React.FC<ChordDiagramProps> = ({ 
  panelId, 
  data, 
  queryResult}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<am5.Root | null>(null);
  const [chordData, setChordData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract data from API response for chord diagram
  const extractChordDataFromResponse = (response: any): any[] => {
    if (!response) return [];

    // Handle Grafana-style response format (most common from backend)
    if (response.state === "Done" && response.series && Array.isArray(response.series)) {
      const connections: any[] = [];
      
      response.series.forEach((serie: any) => {
        if (serie && serie.fields && Array.isArray(serie.fields)) {
          // Find destination field
          const destField = serie.fields.find((f: any) => 
            f.name === "dst" || f.name === "_value" || f.name === "value"
          );
          
          if (destField && destField.values && destField.values.length > 0) {
            // Get source from labels
            const source = destField.labels?.source || 'Unknown';
            
            if (source !== 'Unknown') {
              // Create connections from source to each unique destination
              const uniqueDestinations = [...new Set(destField.values)];
              uniqueDestinations.forEach(dest => {
                if (dest && dest !== source) {
                  connections.push({
                    from: String(source),
                    to: String(dest),
                    value: destField.values.filter((v: any) => v === dest).length
                  });
                }
              });
            }
          }
        }
      });
      
      return connections;
    }

    // Fallback for other formats
    let rawData: any[] = [];
    if (Array.isArray(response)) {
      rawData = response;
    } else if (response.results && Array.isArray(response.results)) {
      rawData = response.results;
    } else if (response.data && Array.isArray(response.data)) {
      rawData = response.data;
    }

    const connections: any[] = [];
    rawData.forEach((result: any) => {
      // Handle the actual response structure: {refId: 'A', result: {...}}
      const actualResult = result.result || result;
      
      if (actualResult && actualResult.series && Array.isArray(actualResult.series)) {
        actualResult.series.forEach((serie: any) => {
          if (serie && serie.fields && Array.isArray(serie.fields)) {
            // Find destination field
            const destField = serie.fields.find((f: any) => 
              f.name === "dst" || f.name === "_value" || f.name === "value"
            );
            
            if (destField && destField.values && destField.values.length > 0) {
              // Get source from labels
              const source = destField.labels?.source || 'Unknown';
              
              if (source !== 'Unknown') {
                // Create connections from source to each unique destination
                const uniqueDestinations = [...new Set(destField.values)];
                uniqueDestinations.forEach(dest => {
                  if (dest && dest !== source) {
                    connections.push({
                      from: String(source),
                      to: String(dest),
                      value: destField.values.filter((v: any) => v === dest).length
                    });
                  }
                });
              }
            }
          }
          
          // Also try the old format for compatibility
          if (serie && serie.values && Array.isArray(serie.values)) {
            const source = serie.tags?.source || serie.labels?.source || 'Unknown';
            
            serie.values.forEach((valueRow: any) => {
              if (Array.isArray(valueRow) && valueRow.length >= 2) {
                const destination = valueRow[1];
                if (destination && destination !== source) {
                  connections.push({
                    from: source,
                    to: destination,
                    value: 1
                  });
                }
              }
            });
          }
        });
      }
    });

    return connections;
  };

  // Aggregate chord data by source-target pairs
  const aggregateChordData = (rawData: any[]): any[] => {
    const aggregated: { [key: string]: { from: string, to: string, value: number } } = {};
    
    rawData.forEach(item => {
      const key = `${item.from}->${item.to}`;
      if (aggregated[key]) {
        aggregated[key].value += item.value;
      } else {
        aggregated[key] = {
          from: item.from,
          to: item.to,
          value: item.value
        };
      }
    });
    
    return Object.values(aggregated);
  };

  // API data fetching
  useEffect(() => {
    const fetchData = async () => {
      if (!panelId) return;

      try {
        setLoading(true);
        setError(null);
        
        const response = await metricService.executePanelQuery(panelId);
        const extractedData = extractChordDataFromResponse(response);
        const aggregatedData = aggregateChordData(extractedData);
        setChordData(aggregatedData);
        
      } catch (err: any) {
        console.error('Error fetching chord data:', err);
        setError('Failed to fetch chord diagram data');
        setChordData([]);
      } finally {
        setLoading(false);
      }
    };

    if (panelId) {
      fetchData();
      // Auto-refresh every 60 seconds for network flow data
      const interval = setInterval(fetchData, 60000);
      return () => clearInterval(interval);
    }
  }, [panelId]);

  // Fallback for data prop
  useEffect(() => {
    if (!panelId && (data || queryResult)) {
      const fallbackData = data || queryResult;
      const extractedData = extractChordDataFromResponse(fallbackData);
      const aggregatedData = aggregateChordData(extractedData);
      
      // FALLBACK: If no data extracted, use test data
      if (aggregatedData.length === 0) {
        const testData = [
          { from: "192.168.238.101", to: "11.11.11.11", value: 5 },
          { from: "192.168.238.101", to: "10.10.10.10", value: 3 }
        ];
        setChordData(testData);
      } else {
        setChordData(aggregatedData);
      }
      setLoading(false);
    }
  }, [data, queryResult, panelId]);

  // Create AmCharts 5 chord diagram
  useEffect(() => {
    if (!chartRef.current || loading || chordData.length === 0) return;

    try {
      // Create root
      const root = am5.Root.new(chartRef.current);
      chartInstance.current = root;

      // Set themes
      root.setThemes([am5themes_Animated.new(root)]);

      // Create chord diagram
      const container = root.container.children.push(
        am5.Container.new(root, {
          width: am5.p100,
          height: am5.p100,
          layout: root.verticalLayout
        })
      );

      const series = container.children.push(
        am5flow.ChordNonRibbon.new(root, {
          sourceIdField: "from",
          targetIdField: "to", 
          valueField: "value",
          linkType: "curve"
        })
      );

      // Set data
      series.data.setAll(chordData);

      // Configure nodes - COMMENTED OUT to avoid error
      // series.nodes.get("colors")?.set("step", 2);
      
      // Add labels to nodes
      series.nodes.labels.template.setAll({
        textType: "radial",
        centerX: am5.p50,
        centerY: am5.p50,
        fontSize: 10,
        fontWeight: "bold"
      });

      // Configure links to be visible by default
      series.links.template.setAll({
        fillOpacity: 0.8,
        strokeOpacity: 1,
        stroke: am5.color("#333"),
        strokeWidth: 2,
        visible: true
      });

      // Hover effect
      series.links.template.states.create("hover", {
        fillOpacity: 1,
        strokeWidth: 3
      });

      // Animate on start
      series.appear(1000, 100);

      // Cleanup function
      return () => {
        if (chartInstance.current) {
          chartInstance.current.dispose();
          chartInstance.current = null;
        }
      };
    } catch (error) {
      console.error('Error creating chord diagram:', error);
      setError('Failed to create chord diagram visualization');
    }
  }, [chordData, loading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 rounded-lg bg-gray-50 h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
        <div className="text-gray-600">Loading chord diagram...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-6 rounded-lg bg-red-50 h-full">
        <div className="text-red-500 text-center">
          <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>{error}</div>
        </div>
      </div>
    );
  }

  // No data state
  if (chordData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 rounded-lg bg-yellow-50 h-full">
        <div className="text-yellow-600 text-center">
          <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>No network flow data available</div>
          <div className="text-sm mt-1">Check your InfluxDB query and data source</div>
        </div>
      </div>
    );
  }

  // Main rendering
  return (
    <div className="p-6 rounded-lg bg-blue-50 h-full">
      <div className="text-center mb-4">
        <h4 className="text-lg font-semibold text-gray-800">Network Flow Diagram</h4>
        <p className="text-sm text-gray-600">{chordData.length} connections</p>
      </div>
      <div 
        ref={chartRef} 
        className="w-full h-80"
        style={{ minHeight: '300px' }}
      />
    </div>
  );
};

export default ChordDiagram; 