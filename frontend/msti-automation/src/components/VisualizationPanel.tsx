import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import metricService from '../services/metricService';
import { getVisualizationComponent } from './visualizations';
import ErrorBoundary from './ErrorBoundary';

interface Panel {
  id: string;
  title: string;
  type: string;
  width: number;
  height: number;
  position: { x: number; y: number };
  options: any;
  refreshInterval?: number; // Add refresh interval
  queries: {
    refId: string;
    query: string;
    dataSourceId: string;
  }[];
}

interface VisualizationPanelProps {
  panel: Panel;
  dashboardId: string;
  onDelete: () => void;
}

// Panel Menu Component with Reload Button
const PanelMenu: React.FC<{ 
  id: string; 
  dashboardId: string;
  panelType: string;
  onDelete: () => void;
  onReload: () => void;
  refreshInterval?: number;
}> = ({ id, dashboardId, panelType, onDelete, onReload, refreshInterval }) => {
  const [isOpen, setIsOpen] = useState(false);

  const getRefreshLabel = (interval?: number) => {
    if (!interval) return 'Default (10s)';
    if (interval === 10000) return 'Realtime (10s)';
    if (interval === 60000) return '1 minute';
    if (interval === 120000) return '2 minutes';
    if (interval === 180000) return '3 minutes';
    if (interval === 3600000) return '1 hour';
    return `${interval / 1000}s`;
  };

  return (
    <div className="relative flex items-center space-x-1">
      {/* Reload Button */}
      <button 
        className="p-1 hover:bg-gray-100 rounded transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onReload();
        }}
        title="Reload panel data"
      >
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>

      {/* Three Dots Menu */}
      <button 
        className="p-1 hover:bg-gray-100 rounded transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      >
        <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
        </svg>
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 h-full w-full z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-8 mt-2 w-56 bg-white rounded-md shadow-lg z-20 py-1">
            <div className="px-4 py-2 text-xs text-gray-500 border-b">
              Refresh: {getRefreshLabel(refreshInterval)}
            </div>
            <Link
              to={`/dashboard/${dashboardId}/panel/edit/${id}`}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Panel
              </div>
            </Link>
            <Link
              to={`/alerting/rules/new?panelId=${id}&panelType=${panelType}`}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Create Alert Rule
              </div>
            </Link>
            <button
              onClick={() => {
                if(window.confirm('Are you sure you want to delete this panel?')) {
                  onDelete();
                }
                setIsOpen(false);
              }}
              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
            >
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m6-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Panel
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// Main VisualizationPanel Component
const VisualizationPanel: React.FC<VisualizationPanelProps> = ({ 
  panel, 
  dashboardId, 
  onDelete 
}) => {
  const [data, setData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Fetch panel data function
  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      
      // Execute panel query with force refresh parameter
      const response = await metricService.executePanelQuery(panel.id, forceRefresh);
      
      // Transform response to format expected by visualization components
      const transformedData: Record<string, any> = {};
      
      if (response && Array.isArray(response)) {
        response.forEach((queryResult, index) => {
          const refId = panel.queries[index]?.refId || `Query${index}`;
          
          // The backend now returns properly formatted data
          if (queryResult.result && !queryResult.error) {
            transformedData[refId] = queryResult.result;
          } else if (queryResult.error) {
            transformedData[refId] = {
              state: "Error",
              series: [],
              error: queryResult.error
            };
          }
        });
      }
      
      setData(transformedData);
      setLastRefresh(new Date());
    } catch (err: any) {
      console.error('Error fetching panel data:', err);
      setError(err.message || 'Failed to fetch panel data');
    } finally {
      setLoading(false);
    }
  }, [panel.id, panel.queries]);

  // Auto-refresh effect
  useEffect(() => {
    fetchData();
    
    // Set up auto-refresh interval using panel's refresh interval
    const refreshInterval = panel.refreshInterval || 30000; // Default 30 seconds
    const interval = setInterval(() => fetchData(), refreshInterval);
    
    return () => clearInterval(interval);
  }, [fetchData, panel.refreshInterval]);

  // Manual reload handler
  const handleReload = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  // Get the appropriate visualization component
  const VisualizationComponent = getVisualizationComponent(panel.type);
  
  // Support legacy interface-status type for backward compatibility
  const isLegacyInterfaceStatus = panel.type === 'interface-status';

  return (
    <div className="bg-white rounded-lg shadow-sm border h-full flex flex-col">
      {/* Panel Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{panel.title}</h3>
          <div className="text-xs text-gray-500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
        </div>
        <PanelMenu 
          id={panel.id} 
          dashboardId={dashboardId} 
          panelType={panel.type}
          onDelete={onDelete}
          onReload={handleReload}
          refreshInterval={panel.refreshInterval}
        />
      </div>

      {/* Panel Content */}
      <div className="flex-1 p-4 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-red-500 text-center">
              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>{error}</div>
              <button 
                onClick={handleReload}
                className="mt-2 text-sm text-blue-500 hover:text-blue-700"
              >
                Try again
              </button>
            </div>
          </div>
        ) : VisualizationComponent ? (
          <ErrorBoundary componentName={`${panel.type} Visualization`}>
            {panel.type === 'text' || panel.type === 'stat' || panel.type === 'interface-status' || panel.type === 'interface' || panel.type === 'gauge' || panel.type === 'memory-usage' || panel.type === 'chord-diagram' || panel.type === 'timeseries' || panel.type === 'time-series' ? (
              <VisualizationComponent
                panelId={panel.id}
                queryResult={data}
                options={panel.options || {}}
                {...({} as any)}
              />
            ) : (
              <VisualizationComponent
                data={data}
                options={panel.options || {}}
                {...({} as any)}
              />
            )}
          </ErrorBoundary>
        ) : isLegacyInterfaceStatus ? (
          // Legacy interface status fallback
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-gray-500 text-center">
              <div className="text-4xl mb-2">⚠️</div>
              <div>Legacy interface status panel</div>
              <div className="text-sm mt-2">Please convert to new interface visualization</div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500 text-center">
              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 20.5a7.962 7.962 0 01-5-1.709m0 0V15a2 2 0 012-2h6a2 2 0 012 2v3.291z" />
              </svg>
              <div>Unsupported panel type: {panel.type}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisualizationPanel;