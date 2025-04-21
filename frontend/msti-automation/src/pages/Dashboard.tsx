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

const Dashboard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { selectedSource } = useSource();
  const [dashboardData, setDashboardData] = useState<{ name: string; description: string } | null>(null);
  
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

      {/* Charts Grid - Menggunakan grid responsif */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Server Response Time */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-800">Server Response Time</h3>
            <div className="flex items-center">
              <Link
                to={`/dashboard/${id}/panel/edit/1`}
                className="p-1 hover:bg-gray-100 rounded transition-colors mr-1"
                title="Edit Panel"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </Link>
              <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                </svg>
              </button>
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
              <Link
                to={`/dashboard/${id}/panel/edit/2`}
                className="p-1 hover:bg-gray-100 rounded transition-colors mr-1"
                title="Edit Panel"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </Link>
              <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                </svg>
              </button>
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
            <button className="p-1 hover:bg-gray-100 rounded transition-colors">
              <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>
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
            <button className="p-1 hover:bg-gray-100 rounded transition-colors">
              <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>
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