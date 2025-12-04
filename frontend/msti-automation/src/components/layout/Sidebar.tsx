import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SubMenuItem {
  title: string;
  path: string;
}

interface MenuChild {
  title: string;
  path: string;
  isSubmenu?: boolean;
  children?: SubMenuItem[];
}

interface MenuItem {
  title: string;
  path?: string;
  icon: string;
  children?: MenuChild[];
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [openAnsibleSubmenu, setOpenAnsibleSubmenu] = useState(false);

  // Tutup sidebar otomatis saat resize ke desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) onClose();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [onClose]);

  const menuItems: MenuItem[] = [
    { 
      title: 'Dashboard', 
      icon: '📊',
      children: [
        { title: 'Dashboard Explorer', path: '/dashboard' },
        { title: 'New Dashboard', path: '/dashboard/new' }
      ]
    },
    { 
      title: 'Alerting', 
      icon: '🔔',
      children: [
        { title: 'Alert Rules', path: '/alerting/rules' },
        { title: 'Contact Points', path: '/alerting/contacts' }
      ]
    },
    { 
      title: 'Connections', 
      icon: '🔌',
      children: [
        { title: 'Add New Connection', path: '/connections/new' },
        { title: 'Data Sources', path: '/connections/data-sources' }
      ]
    },
    { 
      title: 'Automation', 
      icon: '🤖',
      children: [
        { title: 'Webhook', path: '/automation/webhook' },
        { title: 'Flow Analytic', path: '/automation/flow' },
        { title: 'CDP Discovery', path: '/automation/cdp' },
        { title: 'Telegraf', path: '/automation/telegraf' },
        { title: 'Ansible', path: '#', isSubmenu: true, children: [
          { title: 'Server', path: '/automation/ansible/server' },
          { title: 'Config', path: '/automation/ansible/config' },
          { title: 'Scenario', path: '/automation/ansible/scenario' },
          { title: 'Inventory', path: '/automation/ansible/inventory' }
        ]}
      ]
    },
    { title: 'Settings', path: '/settings', icon: '⚙️' },
  ];

  const toggleMenu = (title: string) => {
    setOpenMenus(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const toggleAnsibleSubmenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenAnsibleSubmenu(!openAnsibleSubmenu);
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed md:static inset-y-0 left-0 w-64 bg-gray-800 text-white transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 transition-transform duration-200 ease-in-out z-30
        flex flex-col h-full`}
        style={{ maxHeight: '100vh' }}
      >
        <div className="flex items-center justify-between p-4 md:justify-center">
          <span className="text-xl font-bold">MSTI</span>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-gray-700 md:hidden"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <div key={item.title} className="mb-1">
              {item.children ? (
                <div>
                  <button
                    onClick={() => toggleMenu(item.title)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium rounded-md transition-colors hover:bg-gray-700"
                  >
                    <div className="flex items-center">
                      <span className="mr-3">{item.icon}</span>
                      <span>{item.title}</span>
                    </div>
                    <svg
                      className={`w-4 h-4 transition-transform ${openMenus[item.title] ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openMenus[item.title] && (
                    <div className="mt-1 ml-6 space-y-1">
                      {item.children.map((child) =>
                        child.isSubmenu ? (
                          <div key={child.title}>
                            <button
                              onClick={toggleAnsibleSubmenu}
                              className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium rounded-md transition-colors hover:bg-gray-700"
                            >
                              <span>{child.title}</span>
                              <svg
                                className={`w-4 h-4 transition-transform ${openAnsibleSubmenu ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            {openAnsibleSubmenu && child.children && (
                              <div className="mt-1 ml-4 space-y-1">
                                {child.children.map((subChild) => (
                                  <Link
                                    key={subChild.path}
                                    to={subChild.path}
                                    onClick={onClose}
                                    className="block px-4 py-2 text-sm font-medium rounded-md transition-colors hover:bg-gray-700"
                                  >
                                    {subChild.title}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <Link
                            key={child.path}
                            to={child.path}
                            onClick={onClose}
                            className="block px-4 py-2 text-sm font-medium rounded-md transition-colors hover:bg-gray-700"
                          >
                            {child.title}
                          </Link>
                        )
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to={item.path || '/'}
                  onClick={onClose}
                  className="flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-colors hover:bg-gray-700"
                >
                  <span className="mr-3">{item.icon}</span>
                  <span>{item.title}</span>
                </Link>
              )}
            </div>
          ))}
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
