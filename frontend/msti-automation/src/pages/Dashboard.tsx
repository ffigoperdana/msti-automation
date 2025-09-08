import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Responsive, WidthProvider, Layouts } from 'react-grid-layout';
import metricService from '../services/metricService';
import VisualizationPanel from '../components/VisualizationPanel';

const ResponsiveGridLayout = WidthProvider(Responsive);

// Interfaces
interface Panel {
  id: string;
  title: string;
  type: string;
  // layout is now managed by the dashboard component's state
  options: any;
  refreshInterval?: number; // Add refreshInterval field
  queries: {
    refId: string;
    query: string;
    dataSourceId: string;
  }[];
}

interface Dashboard {
  id: string;
  name: string;
  description: string;
  tags: string[];
  panels: Panel[];
  layouts?: Layouts; // Layouts are now part of the dashboard
  variables: any[];
  createdAt: string;
  updatedAt: string;
}

interface Field {
  name: string;
  type: string;
  values: any[];
  config?: {
    unit: string;
  };
}

// PanelMenu Component (remains the same)
const PanelMenu: React.FC<{ 
  id: string; 
  dashboardId: string;
  panelType: string;
  onDelete: () => void;
}> = ({ id, dashboardId, panelType, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleClickOutside = () => {
    if (isOpen) setIsOpen(false);
  };

  return (
    <div className="relative">
      <button 
        className="p-1 hover:bg-gray-100 rounded transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          toggleMenu();
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
            onClick={handleClickOutside}
          ></div>
          <div className="absolute right-0 top-8 mt-2 w-48 bg-white rounded-md shadow-lg z-20 py-1">
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

// Komponen Panel Status Interface
const InterfaceStatusPanel: React.FC<{
  panel: Panel;
  dashboardId: string;
  onDelete: () => void;
}> = ({ panel, dashboardId, onDelete }) => {
  const [status, setStatus] = useState<'up' | 'down' | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        const response = await metricService.executePanelQuery(panel.id);
        
        if (response?.[0]?.result?.series?.[0]?.fields) {
          const fields = response[0].result.series[0].fields;
          const valueField = fields.find((f: Field) => f.name === "Value");
          const timeField = fields.find((f: Field) => f.name === "Time");
          
          if (valueField && timeField && valueField.values.length > 0) {
            const latestValue = valueField.values[valueField.values.length - 1];
            const latestTime = timeField.values[timeField.values.length - 1];
            
            // Convert value to status
            let newStatus: 'up' | 'down';
            if (typeof latestValue === 'string') {
              newStatus = latestValue.toLowerCase() as 'up' | 'down';
            } else {
              newStatus = latestValue === 1 ? 'up' : 'down';
            }
            
            setStatus(newStatus);
            setLastUpdated(new Date(latestTime).toLocaleString());
            setError(null);
          } else {
            throw new Error('No data available');
          }
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        console.error('Error fetching interface status:', err);
        setError('Failed to fetch interface status');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 60000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [panel.id]);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 h-full">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{panel.title}</h3>
        <PanelMenu 
          id={panel.id} 
          dashboardId={dashboardId} 
          panelType={panel.type}
          onDelete={onDelete}
        />
      </div>

      <div className={`flex flex-col items-center justify-center p-6 rounded-lg ${
        status === 'up' ? 'bg-green-50' : 
        status === 'down' ? 'bg-red-50' : 
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
              status === 'up' ? 'text-green-600' : 
              status === 'down' ? 'text-red-600' : 
              'text-gray-400'
            }`}>
              {status?.toUpperCase()}
            </div>
            {lastUpdated && (
              <div className="text-sm text-gray-500 mt-4">
                Last updated: {lastUpdated}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Main Dashboard Component
const Dashboard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [layouts, setLayouts] = useState<Layouts>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const generateInitialLayouts = useCallback((panels: Panel[], savedLayouts?: Layouts): Layouts => {
    const breakpoints = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };
    const generatedLayouts: Layouts = {};

    for (const bp of Object.keys(breakpoints)) {
      generatedLayouts[bp] = panels.map((panel, index) => {
        const savedLayout = savedLayouts?.[bp]?.find(l => l.i === panel.id);
        if (savedLayout) {
          return savedLayout;
        }
        // Generate default layout if none is saved
        const cols = breakpoints[bp as keyof typeof breakpoints];
        return {
          i: panel.id,
          x: (index % (cols / 6)) * 6, // Default to 2 panels per row
          y: Math.floor(index / (cols / 6)) * 8,
          w: 6,
          h: 8,
        };
      });
    }
    return generatedLayouts;
  }, []);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const response = await metricService.getDashboard(id!);
        setDashboard(response);
        if (response) {
          setLayouts(generateInitialLayouts(response.panels, response.layouts));
        }
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard:', err);
        setError('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchDashboard();
    }
  }, [id, generateInitialLayouts]);

  const handleLayoutChange = (currentLayout: any, allLayouts: Layouts) => {
    if (isEditMode) {
      setLayouts(allLayouts);
    }
  };

  const handleToggleEditMode = async () => {
    if (isEditMode) {
      // Leaving edit mode, so save the layout
      setIsSaving(true);
      try {
        await metricService.saveDashboardLayout(id!, layouts);
        // Optionally refetch dashboard data to confirm save
      } catch (err) {
        console.error("Failed to save layout:", err);
        alert("Error: Could not save layout changes.");
      } finally {
        setIsSaving(false);
      }
    }
    setIsEditMode(!isEditMode);
  };

  const handleDeletePanel = async (panelId: string) => {
    try {
      await metricService.deletePanel(panelId);
      // Refresh dashboard data
      const updatedDashboard = await metricService.getDashboard(id!);
      setDashboard(updatedDashboard);
    } catch (err) {
      console.error('Error deleting panel:', err);
      alert('Failed to delete panel');
    }
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
    );
  }

  if (error || !dashboard) {
    return (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline"> {error || 'Dashboard not found'}</span>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">{dashboard.name}</h1>
            {dashboard.description && (
              <p className="text-gray-600 mt-1">{dashboard.description}</p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Link
              to={`/dashboard/${dashboard.id}/panel/new`}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center"
            >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              Add Panel
            </Link>
            <button
              onClick={handleToggleEditMode}
              disabled={isSaving}
              className={`px-4 py-2 rounded text-white transition-colors flex items-center ${ 
                isEditMode 
                  ? 'bg-green-500 hover:bg-green-600' 
                  : 'bg-indigo-500 hover:bg-indigo-600'
              } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                {isSaving ? (
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                ) : isEditMode ? (
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                ) : (
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />
                    </svg>
                )}
              {isSaving ? 'Saving...' : isEditMode ? 'Save Layout' : 'Edit Layout'}
            </button>
          </div>
        </div>
      </div>

      {/* Panels Grid */}
      <ResponsiveGridLayout
        className={`layout ${isEditMode ? 'border-2 border-dashed border-indigo-200 rounded-lg' : ''}`}
        layouts={layouts}
        breakpoints={{lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0}}
        cols={{lg: 12, md: 10, sm: 6, xs: 4, xxs: 2}}
        rowHeight={30}
        onLayoutChange={handleLayoutChange}
        isDraggable={isEditMode}
        isResizable={isEditMode}
      >
        {dashboard.panels.map((panel) => (
          <div key={panel.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
            {panel.type === 'interface-status' ? (
              <InterfaceStatusPanel
                panel={panel}
                dashboardId={dashboard.id}
                onDelete={() => handleDeletePanel(panel.id)}
              />
            ) : (
              <VisualizationPanel
                panel={panel}
                dashboardId={dashboard.id}
                onDelete={() => handleDeletePanel(panel.id)}
              />
            )}
          </div>
        ))}
      </ResponsiveGridLayout>

      {/* Empty State */}
      {dashboard.panels.length === 0 && (
        <div className="bg-white p-8 rounded-lg shadow-sm text-center">
          <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-800">No panels yet</h3>
          <p className="mt-2 text-gray-600">Start by adding a new panel to your dashboard.</p>
          <Link
            to={`/dashboard/${dashboard.id}/panel/new`}
            className="mt-4 inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Add First Panel
          </Link>
        </div>
      )}
    </div>
  );
};

export default Dashboard;