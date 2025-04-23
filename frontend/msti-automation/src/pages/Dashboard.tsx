import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import SourceSelector from '../components/SourceSelector';
import { useSource } from '../context/SourceContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Data dummy untuk dashboard
const DUMMY_DASHBOARDS: Record<string, { name: string; description: string }> = {
  '1': { 
    name: 'Production Overview',
    description: 'Overview of production server metricss'
  },
  '2': {
    name: 'Development Environment',
    description: 'Metrics for development environment' 
  },
  '3': {
    name: 'Database Performance',
    description: 'Database server performance metrics'
  }
};

// Data dummy untuk interface status
const INTERFACE_STATUS = [
  {
    id: '1',
    name: 'GigabitEthernet0/1',
    status: 'up',
    location: 'Router-1',
    lastChange: '2024-04-20T10:15:00Z'
  },
  {
    id: '2',
    name: 'GigabitEthernet0/2',
    status: 'up',
    location: 'Router-1',
    lastChange: '2024-04-19T08:30:00Z'
  }
];

// Data dummy untuk Ansible logs
const ANSIBLE_LOGS = [
  {
    id: 'log1',
    timestamp: '2025-02-06 11:55:35',
    host: '192.168.238.16',
    status: {
      ok: 1,
      changed: 0,
      unreachable: 0,
      failed: 0,
      skipped: 0,
      rescued: 0,
      ignored: 0
    },
    playbook: 'interfaceloopback',
    expanded: false
  },
  {
    id: 'log2',
    timestamp: '2025-02-06 11:52:35',
    host: '192.168.238.16',
    status: {
      ok: 1,
      changed: 0,
      unreachable: 0,
      failed: 0,
      skipped: 0,
      rescued: 0,
      ignored: 0
    },
    playbook: 'interfaceloopback',
    expanded: false
  },
  {
    id: 'log3',
    timestamp: '2025-02-06 11:48:10',
    host: '192.168.238.16',
    status: {
      ok: 1,
      changed: 1,
      unreachable: 0,
      failed: 0,
      skipped: 0,
      rescued: 0,
      ignored: 0
    },
    playbook: 'setuprouter',
    expanded: false
  }
];

// Komponen Menu Dropdown
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
              to={`/alerts/new?panelId=${id}&panelType=${panelType}`}
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
  interface: { 
    id: string; 
    name: string; 
    status: string; 
    location: string;
    lastChange: string;
  },
  dashboardId: string,
  onDelete: () => void
}> = ({ interface: iface, dashboardId, onDelete }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-800">{iface.location}</h3>
          <div className="flex items-center">
            <PanelMenu 
              id={iface.id} 
              dashboardId={dashboardId}
              panelType="interface-status"
              onDelete={onDelete}
            />
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center p-6">
          <div className="text-sm text-gray-500 mb-2">{iface.name}</div>
          <div className={`text-6xl font-bold ${iface.status === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {iface.status === 'up' ? 'Up' : 'Down'}
          </div>
          <div className="mt-3 text-xs text-gray-500">
            Last change: {new Date(iface.lastChange).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

// Komponen Panel Ansible Log
const AnsibleLogPanel: React.FC<{
  logs: {
    id: string;
    timestamp: string;
    host: string;
    status: {
      ok: number;
      changed: number;
      unreachable: number;
      failed: number;
      skipped: number;
      rescued: number;
      ignored: number;
    };
    playbook: string;
    expanded: boolean;
  }[],
  dashboardId: string,
  onDelete: () => void,
  onToggleExpand: (id: string) => void
}> = ({ logs, dashboardId, onDelete, onToggleExpand }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-800">Ansible Logs</h3>
          <div className="flex items-center">
            <PanelMenu 
              id="ansible-logs" 
              dashboardId={dashboardId}
              panelType="ansible-logs"
              onDelete={onDelete}
            />
          </div>
        </div>
        
        <div className="overflow-hidden border border-gray-200 rounded-md">
          {logs.map((log) => (
            <div key={log.id} className="border-b border-gray-200 last:border-b-0">
              <div 
                className="flex items-center px-4 py-2 bg-gray-50 cursor-pointer hover:bg-gray-100"
                onClick={() => onToggleExpand(log.id)}
              >
                <div className={`mr-2 transform transition-transform ${log.expanded ? 'rotate-90' : ''}`}>
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <div className="text-sm text-gray-600 font-mono">[{log.timestamp}] {log.host}</div>
                <div className="flex items-center ml-auto space-x-2 text-xs">
                  <span className="px-1 py-0.5 rounded bg-green-100 text-green-800">ok={log.status.ok}</span>
                  <span className="px-1 py-0.5 rounded bg-blue-100 text-blue-800">changed={log.status.changed}</span>
                  <span className="px-1 py-0.5 rounded bg-yellow-100 text-yellow-800">unreachable={log.status.unreachable}</span>
                  <span className="px-1 py-0.5 rounded bg-red-100 text-red-800">failed={log.status.failed}</span>
                </div>
              </div>
              
              {log.expanded && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 font-mono text-sm">
                  <div className="mb-2 text-gray-700">Fields</div>
                  <div className="flex items-center space-x-2 mb-1">
                    <button className="p-1 bg-gray-200 rounded hover:bg-gray-300">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </button>
                    <button className="p-1 bg-gray-200 rounded hover:bg-gray-300">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button className="p-1 bg-gray-200 rounded hover:bg-gray-300">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <div className="text-gray-600 px-2 font-bold">playbook</div>
                    <div className="text-gray-800 px-2">{log.playbook}</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { selectedSource } = useSource();
  const [dashboardData, setDashboardData] = useState<{ name: string; description: string } | null>(null);
  const [interfaceStatus, setInterfaceStatus] = useState(INTERFACE_STATUS);
  const [ansibleLogs, setAnsibleLogs] = useState(ANSIBLE_LOGS);
  
  // Load dashboard data based on ID
  useEffect(() => {
    // In a real app, this would be an API call
    if (id && DUMMY_DASHBOARDS[id]) {
      setDashboardData(DUMMY_DASHBOARDS[id]);
    } else {
      // Jika dashboard tidak ditemukan, gunakan default
      setDashboardData({
        name: 'Default Dashboard',
        description: 'Default dashboard view'
      });
    }
  }, [id]);

  // Handler untuk delete panel
  const handleDeletePanel = (panelId: string, panelType: string) => {
    if (panelType === 'interface-status') {
      setInterfaceStatus(prev => prev.filter(item => item.id !== panelId));
    } else if (panelType === 'ansible-logs') {
      // Remove the entire ansible logs panel
      setAnsibleLogs([]);
    } else {
      // Handle delete untuk tipe panel lainnya jika diperlukan
      console.log(`Delete panel ${panelId} of type ${panelType}`);
    }
  };

  // Handler untuk toggle expand log
  const handleToggleExpandLog = (logId: string) => {
    setAnsibleLogs(prev => 
      prev.map(log => 
        log.id === logId ? { ...log, expanded: !log.expanded } : log
      )
    );
  };

  const lineChartData = {
    labels: ['January', 'February', 'March', 'April', 'May', 'June'],
    datasets: [
      {
        label: `${selectedSource.name} - Server Response Time`,
        data: [65, 59, 80, 81, 56, 55],
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
        pointRadius: 4,
        pointBackgroundColor: 'rgb(75, 192, 192)',
      },
    ],
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'start' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  const barChartData = {
    labels: ['CPU', 'Memory', 'Disk', 'Network'],
    datasets: [
      {
        label: `${selectedSource.name} - Resource Usage (%)`,
        data: [65, 80, 45, 70],
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 206, 86, 0.5)',
          'rgba(75, 192, 192, 0.5)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'start' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  if (!dashboardData) {
    return <div className="p-4">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Dashboard Header */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        {/* Network Statistics */}
        <h2 className="text-xl font-semibold text-gray-800 mb-1">{dashboardData.name}</h2>
        <p className="text-gray-600 mb-4">{dashboardData.description}</p>
        {/* Controls Container - Horizontal layout */}
        <div className="flex flex-wrap justify-between items-center gap-4">
          {/* Source Selector */}
          <div className="w-[200px]">
            <SourceSelector onSourceChange={(source) => console.log('Source changed:', source)} />
          </div>
          {/* Buttons Container */}
          <div className="flex items-center gap-2">
            <Link
              to={`/dashboard/${id}/panel/new`}
              className="px-4 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Panel
            </Link>
            <button className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors">
              Time Range
            </button>
          </div>
        </div>
      </div>

      {/* Ansible Logs Panel */}
      {ansibleLogs.length > 0 && (
        <AnsibleLogPanel 
          logs={ansibleLogs} 
          dashboardId={id || '0'} 
          onDelete={() => handleDeletePanel('ansible-logs', 'ansible-logs')}
          onToggleExpand={handleToggleExpandLog}
        />
      )}

      {/* Interface Status Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {interfaceStatus.map(iface => (
          <InterfaceStatusPanel 
            key={iface.id} 
            interface={iface} 
            dashboardId={id || '0'} 
            onDelete={() => handleDeletePanel(iface.id, 'interface-status')}
          />
        ))}
      </div>

      {/* Charts Grid - Menggunakan grid responsif */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Server Response Time */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-800">Server Response Time</h3>
            <div className="flex items-center">
              <PanelMenu 
                id="1" 
                dashboardId={id || '0'}
                panelType="time-series"
                onDelete={() => handleDeletePanel("1", "time-series")}
              />
            </div>
          </div>
          <div className="h-[250px] lg:h-[300px]">
            <Line data={lineChartData} options={lineChartOptions} />
          </div>
        </div>
        
        {/* Resource Usage */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-800">Resource Usage</h3>
            <div className="flex items-center">
              <PanelMenu 
                id="2" 
                dashboardId={id || '0'}
                panelType="bar-chart"
                onDelete={() => handleDeletePanel("2", "bar-chart")}
              />
            </div>
          </div>
          <div className="h-[250px] lg:h-[300px]">
            <Bar data={barChartData} options={barChartOptions} />
          </div>
        </div>
      </div>

      {/* Bottom Grid - Alerts dan Automations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active Alerts */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-800">Active Alerts</h3>
            <PanelMenu 
              id="3" 
              dashboardId={id || '0'}
              panelType="alert-list"
              onDelete={() => handleDeletePanel("3", "alert-list")}
            />
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-red-50 text-red-700 rounded-md border border-red-200">
              High CPU Usage - {selectedSource.name}
            </div>
            <div className="p-3 bg-yellow-50 text-yellow-700 rounded-md border border-yellow-200">
              Memory Usage Warning - {selectedSource.name}
            </div>
          </div>
        </div>

        {/* Recent Automations */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-800">Recent Automations</h3>
            <PanelMenu 
              id="4" 
              dashboardId={id || '0'}
              panelType="automation-list"
              onDelete={() => handleDeletePanel("4", "automation-list")}
            />
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-green-50 text-green-700 rounded-md border border-green-200">
              Auto-scaling triggered - {selectedSource.name}
            </div>
            <div className="p-3 bg-blue-50 text-blue-700 rounded-md border border-blue-200">
              Backup completed successfully - {selectedSource.name}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;