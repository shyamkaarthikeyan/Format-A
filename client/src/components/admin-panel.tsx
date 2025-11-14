import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { 
  BarChart3, 
  Users, 
  FileText, 
  Download, 
  Settings, 
  LogOut,
  Menu,
  X,
  Home
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import AdminRoute from './admin-route';

interface AdminPanelProps {
  children: React.ReactNode;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  permissions: string[];
}

const navItems: NavItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: BarChart3,
    path: '/admin',
    permissions: ['admin_panel_access']
  },
  {
    id: 'users',
    label: 'User Analytics',
    icon: Users,
    path: '/admin/users',
    permissions: ['view_analytics']
  },
  {
    id: 'documents',
    label: 'Document Analytics',
    icon: FileText,
    path: '/admin/documents',
    permissions: ['view_analytics']
  },
  {
    id: 'downloads',
    label: 'Download Analytics',
    icon: Download,
    path: '/admin/downloads',
    permissions: ['view_analytics']
  },
  {
    id: 'system',
    label: 'System Health',
    icon: Settings,
    path: '/admin/system',
    permissions: ['system_monitoring']
  },
  {
    id: 'management',
    label: 'User Management',
    icon: Users,
    path: '/admin/management',
    permissions: ['manage_users']
  }
];

const AdminPanel: React.FC<AdminPanelProps> = ({ children }) => {
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, adminSession, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    setLocation('/');
  };

  const hasPermission = (permissions: string[]) => {
    if (!adminSession) return false;
    return permissions.some(permission => 
      adminSession.adminPermissions.includes(permission as typeof adminSession.adminPermissions[number])
    );
  };

  const filteredNavItems = navItems.filter(item => hasPermission(item.permissions));

  return (
    <AdminRoute>
      <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar */}
        <div className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:inset-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="mt-6 px-3">
            <div className="space-y-1">
              {/* Home link */}
              <button
                onClick={() => setLocation('/')}
                className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <Home className="w-5 h-5 mr-3" />
                Back to App
              </button>

              <div className="border-t border-gray-200 my-3"></div>

              {/* Navigation items */}
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setLocation(item.path);
                      setSidebarOpen(false);
                    }}
                    className={`
                      w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
                      ${isActive 
                        ? 'bg-purple-100 text-purple-700 border-r-2 border-purple-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* User info and sign out */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-purple-700">
                  {user?.name?.charAt(0) || user?.email?.charAt(0) || 'A'}
                </span>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.name || 'Admin'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-red-600 rounded-lg hover:text-red-700 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col lg:ml-0">
          {/* Top bar */}
          <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <div className="flex-1 lg:ml-0">
                <h2 className="text-lg font-semibold text-gray-900">
                  {navItems.find(item => item.path === location)?.label || 'Admin Dashboard'}
                </h2>
              </div>

              <div className="flex items-center space-x-4">
                <div className="hidden sm:flex items-center text-sm text-gray-500">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                  Admin Session Active
                </div>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6 lg:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AdminRoute>
  );
};

export default AdminPanel;