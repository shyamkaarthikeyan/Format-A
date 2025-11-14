// CACHE BUST: 2025-11-08 17:35 - Force deployment update for admin-fresh endpoint
import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { 
  Users, 
  FileText, 
  Download, 
  Activity,
  AlertCircle
} from 'lucide-react';
import AdminPanel from '@/components/admin-panel';
import UserAnalytics from '@/components/user-analytics';
import DocumentAnalytics from '@/components/document-analytics';
import DownloadAnalytics from '@/components/download-analytics';
import UserManagement from '@/components/user-management';
import SystemHealth from '@/components/system-health';

interface DashboardStats {
  totalUsers: number;
  totalDocuments: number;
  totalDownloads: number;
  activeUsers: number;
  newUsersToday: number;
  documentsToday: number;
  downloadsToday: number;
  systemHealth: 'healthy' | 'warning' | 'error';
}

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  change, 
  changeType = 'neutral', 
  icon: Icon,
  loading = false 
}) => {
  const changeColors = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-gray-600'
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          {loading ? (
            <div className="mt-2 h-8 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {typeof value === 'number' ? value.toLocaleString() : (value ?? '0')}
            </p>
          )}
          {change && !loading && (
            <p className={`text-sm mt-1 ${changeColors[changeType]}`}>
              {change}
            </p>
          )}
        </div>
        <div className="p-3 bg-purple-100 rounded-lg">
          <Icon className="w-6 h-6 text-purple-600" />
        </div>
      </div>
    </div>
  );
};

const AdminDashboard: React.FC = () => {
  const [location] = useLocation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract section from URL path
  const section = location.split('/')[2] || 'overview';

  useEffect(() => {
    if (section === 'overview' || !section) {
      loadDashboardStats();
    }
  }, [section]);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Loading admin dashboard stats from API...');

      // Fetch real data from API
      const { apiClient } = await import('@/lib/api-client');
      
      const [usersResponse, documentsResponse, downloadsResponse, systemResponse] = await Promise.allSettled([
        apiClient.adminGet('analytics?type=users'),
        apiClient.adminGet('analytics?type=documents'),
        apiClient.adminGet('analytics?type=documents'),
        apiClient.adminGet('analytics?type=system')
      ]);

      // Extract data with fallbacks
      const usersData = usersResponse.status === 'fulfilled' && usersResponse.value.success 
        ? usersResponse.value.data as any : null;
      const documentsData = documentsResponse.status === 'fulfilled' && documentsResponse.value.success 
        ? documentsResponse.value.data as any : null;
      const downloadsData = downloadsResponse.status === 'fulfilled' && downloadsResponse.value.success 
        ? downloadsResponse.value.data as any : null;
      const systemData = systemResponse.status === 'fulfilled' && systemResponse.value.success 
        ? systemResponse.value.data as any : null;

      const dashboardStats: DashboardStats = {
        totalUsers: usersData?.totalUsers || 0,
        totalDocuments: documentsData?.totalDocuments || 0,
        totalDownloads: downloadsData?.totalDownloads || 0,
        activeUsers: usersData?.activeUsers?.last24h || 0,
        newUsersToday: usersData?.newUsers?.today || 0,
        documentsToday: documentsData?.documentsCreated?.daily?.[0]?.count || 0,
        downloadsToday: downloadsData?.downloadsToday || 0,
        systemHealth: (systemData?.systemStatus as 'healthy' | 'warning' | 'error') || 'healthy'
      };

      console.log('Dashboard stats loaded:', dashboardStats);
      setStats(dashboardStats);

    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
      setError(`Failed to load analytics data: ${err instanceof Error ? err.message : 'Unknown error'}`);
      
      // Set fallback stats on error
      setStats({
        totalUsers: 0,
        totalDocuments: 0,
        totalDownloads: 0,
        activeUsers: 0,
        newUsersToday: 0,
        documentsToday: 0,
        downloadsToday: 0,
        systemHealth: 'warning'
      });
    } finally {
      setLoading(false);
    }
  };

  const getHealthStatus = () => {
    if (!stats) return { color: 'gray', text: 'Unknown' };
    
    switch (stats.systemHealth) {
      case 'healthy':
        return { color: 'green', text: 'All Systems Operational' };
      case 'warning':
        return { color: 'yellow', text: 'Minor Issues Detected' };
      case 'error':
        return { color: 'red', text: 'Critical Issues' };
      default:
        return { color: 'gray', text: 'Unknown' };
    }
  };

  const healthStatus = getHealthStatus();

  const renderContent = () => {
    switch (section) {
      case 'users':
        return <UserAnalytics />;
      case 'documents':
        return <DocumentAnalytics />;
      case 'downloads':
        return <DownloadAnalytics />;
      case 'system':
        return <SystemHealth />;
      case 'management':
        return <UserManagement />;
      default:
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
                <p className="text-gray-600 mt-1">
                  Monitor your platform's performance and user activity
                </p>
              </div>
              <button
                onClick={loadDashboardStats}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Activity className="w-4 h-4 mr-2" />
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {/* Error state */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                  <p className="text-red-800">{error}</p>
                </div>
              </div>
            )}

            {/* System Health */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
                  <p className="text-gray-600 mt-1">Current system status and performance</p>
                </div>
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2"
                    style={{
                      backgroundColor: healthStatus.color === 'green' ? '#4ade80' : 
                                     healthStatus.color === 'yellow' ? '#fbbf24' : 
                                     healthStatus.color === 'red' ? '#f87171' : '#9ca3af'
                    }}
                  ></div>
                  <span 
                    className="text-sm font-medium"
                    style={{
                      color: healthStatus.color === 'green' ? '#15803d' : 
                            healthStatus.color === 'yellow' ? '#a16207' : 
                            healthStatus.color === 'red' ? '#b91c1c' : '#4b5563'
                    }}
                  >
                    {healthStatus.text}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Users"
                value={stats?.totalUsers || 0}
                change={stats ? `+${stats.newUsersToday} today` : undefined}
                changeType="positive"
                icon={Users}
                loading={loading}
              />
              <StatCard
                title="Total Documents"
                value={stats?.totalDocuments || 0}
                change={stats ? `+${stats.documentsToday} today` : undefined}
                changeType="positive"
                icon={FileText}
                loading={loading}
              />
              <StatCard
                title="Total Downloads"
                value={stats?.totalDownloads || 0}
                change={stats ? `+${stats.downloadsToday} today` : undefined}
                changeType="positive"
                icon={Download}
                loading={loading}
              />
              <StatCard
                title="Active Users"
                value={stats?.activeUsers || 0}
                change="Last 24 hours"
                changeType="neutral"
                icon={Activity}
                loading={loading}
              />
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <Users className="w-5 h-5 text-purple-600 mr-3" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">View User Analytics</p>
                    <p className="text-sm text-gray-600">Detailed user statistics</p>
                  </div>
                </button>
                <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <Download className="w-5 h-5 text-purple-600 mr-3" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Download Reports</p>
                    <p className="text-sm text-gray-600">Export analytics data</p>
                  </div>
                </button>
                <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <Activity className="w-5 h-5 text-purple-600 mr-3" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">System Monitoring</p>
                    <p className="text-sm text-gray-600">Check system health</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {loading ? (
                  // Loading skeleton
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
                      </div>
                    </div>
                  ))
                ) : (
                  // Real activity data from API responses
                  (() => {
                    const activities = [];
                    
                    // Add recent user registrations
                    if (stats && stats.newUsersToday > 0) {
                      activities.push({
                        action: `${stats.newUsersToday} new user${stats.newUsersToday > 1 ? 's' : ''} registered`,
                        time: 'Today',
                        type: 'user'
                      });
                    }
                    
                    // Add recent downloads
                    if (stats && stats.downloadsToday > 0) {
                      activities.push({
                        action: `${stats.downloadsToday} document${stats.downloadsToday > 1 ? 's' : ''} downloaded`,
                        time: 'Today',
                        type: 'download'
                      });
                    }
                    
                    // Add recent documents
                    if (stats && stats.documentsToday > 0) {
                      activities.push({
                        action: `${stats.documentsToday} document${stats.documentsToday > 1 ? 's' : ''} created`,
                        time: 'This month',
                        type: 'document'
                      });
                    }
                    
                    // Add system status
                    activities.push({
                      action: `System status: ${healthStatus.text}`,
                      time: 'Current',
                      type: 'system'
                    });
                    
                    // Add active users info
                    if (stats && stats.activeUsers > 0) {
                      activities.push({
                        action: `${stats.activeUsers} active user${stats.activeUsers > 1 ? 's' : ''} in last 30 days`,
                        time: 'Last 30 days',
                        type: 'user'
                      });
                    }
                    
                    // If no real activity, show appropriate message
                    if (activities.length <= 1) { // Only system status
                      return (
                        <div className="text-center py-8">
                          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500 text-sm">No user activity yet</p>
                          <p className="text-gray-400 text-xs mt-1">Activity will appear here as users sign up and use the platform</p>
                        </div>
                      );
                    }
                    
                    return activities.slice(0, 5).map((activity, i) => (
                      <div key={i} className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          {activity.type === 'user' && <Users className="w-4 h-4 text-purple-600" />}
                          {activity.type === 'download' && <Download className="w-4 h-4 text-purple-600" />}
                          {activity.type === 'document' && <FileText className="w-4 h-4 text-purple-600" />}
                          {activity.type === 'system' && <Activity className="w-4 h-4 text-purple-600" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                          <p className="text-xs text-gray-500">{activity.time}</p>
                        </div>
                      </div>
                    ));
                  })()
                )}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <AdminPanel>
      {renderContent()}
    </AdminPanel>
  );
};

export default AdminDashboard;