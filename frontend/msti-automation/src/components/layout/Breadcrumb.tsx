import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import metricService from '../../services/metricService';

const Breadcrumb: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);
  const [dashboardNames, setDashboardNames] = useState<Record<string, string>>({});

  // Map route segments to readable names
  const routeNameMap: Record<string, string> = {
    'dashboard': 'Dashboards',
    'view': '',  // Hide 'View' from breadcrumb
    'edit': 'Edit',
    'new': 'New Dashboard',
    'alerting': 'Alerting',
    'rules': 'Alert Rules',
    'contacts': 'Contact Points',
    'connections': 'Connections',
    'data-sources': 'Data Sources',
    'automation': 'Automation',
    'webhook': 'Webhook',
    'flow': 'Flow Analytic',
    'cdp': 'CDP Discovery',
    'telegraf': 'Telegraf',
    'ansible': 'Ansible',
    'server': 'Server',
    'config': 'Config',
    'scenario': 'Scenario',
    'inventory': 'Inventory',
    'settings': 'Settings',
    'users': 'User Management'
  };

  // Fetch dashboard names when path contains dashboard IDs
  useEffect(() => {
    const fetchDashboardNames = async () => {
      const dashboardIds: string[] = [];
      
      // Find all UUIDs in the path (potential dashboard IDs)
      pathnames.forEach((segment, index) => {
        if (isUUID(segment) && index > 0 && (pathnames[index - 1] === 'view' || pathnames[index - 1] === 'edit')) {
          dashboardIds.push(segment);
        }
      });

      // Fetch dashboard data for each ID
      if (dashboardIds.length > 0) {
        const names: Record<string, string> = {};
        await Promise.all(
          dashboardIds.map(async (id) => {
            try {
              const dashboard = await metricService.getDashboard(id);
              names[id] = dashboard.name;
            } catch (error) {
              console.error(`Error fetching dashboard ${id}:`, error);
              names[id] = id.substring(0, 8); // Fallback to abbreviated ID
            }
          })
        );
        setDashboardNames(names);
      }
    };

    fetchDashboardNames();
  }, [location.pathname]);

  const isUUID = (str: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  const getDashboardName = (id: string) => {
    return dashboardNames[id] || id.substring(0, 8);
  };

  const getBreadcrumbName = (segment: string, index: number, arr: string[]) => {
    // Check if it's a UUID (dashboard ID)
    if (isUUID(segment)) {
      return getDashboardName(segment);
    }
    
    // Check if previous segment is 'view' or 'edit' (dashboard view/edit)
    if (index > 0 && (arr[index - 1] === 'view' || arr[index - 1] === 'edit')) {
      return getDashboardName(segment);
    }

    const mappedName = routeNameMap[segment];
    // If mapped name is empty string, return null to skip this breadcrumb
    if (mappedName === '') return null;
    
    return mappedName || segment.charAt(0).toUpperCase() + segment.slice(1);
  };

  return (
    <nav className="flex items-center space-x-2 text-sm">
      {/* Home */}
      <Link 
        to="/" 
        className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
      >
        Home
      </Link>

      {/* Breadcrumb path */}
      {pathnames.map((segment, index) => {
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const breadcrumbName = getBreadcrumbName(segment, index, pathnames);

        // Skip if breadcrumbName is null (e.g., 'view' segment)
        if (breadcrumbName === null) return null;

        return (
          <React.Fragment key={to}>
            <span className="text-gray-400">/</span>
            {isLast ? (
              <span className="text-gray-700 font-medium">{breadcrumbName}</span>
            ) : (
              <Link 
                to={to} 
                className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
              >
                {breadcrumbName}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;
