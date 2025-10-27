import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  TrendingUp, 
  Activity,
  Calendar,
  Clock,
  BarChart3,
  PieChart,
  RefreshCw
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface UserAnalytics {
  totalUsers: number;
  newUsers: {
    daily: { date: string; count: number }[];
    weekly: { week: string; count: number }[];
    monthly: { month: string; count: number }[];
  };
  activeUsers: {
    last24h: number;
    last7d: number;
    last30d: number;
  };
  userGrowth: {
    thisMonth: number;
    lastMonth: number;
    growthRate: number;
  };
  userDistribution: {
    byRegistrationDate: { period: string; count: number }[];
    byActivity: { category: string; count: number }[];
  };
  topUsers: {
    id: string;
    name: string;
    email: string;
    documentsCreated: number;
    downloadsCount: number;
    lastActive: string;
  }[];
}

interface UserAnalyticsProps {
  timeRange?: string;
}

const UserAnalytics: React.FC<UserAnalyticsProps> = ({ timeRange = '30d' }) => {
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get(`/api/admin/analytics/users?timeRange=${selectedTimeRange}`);
      
      if (response.success) {
        setAnalytics(response.data as UserAnalytics);
      } else {
        const errorMessage = typeof response.error === 'string' 
          ? response.error 
          : response.error?.message || 'Failed to fetch user analytics';
        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error('Error fetching user analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [selectedTimeRange]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const formatGrowthRate = (rate: number) => {
    const sign = rate >= 0 ? '+' : '';
    return `${sign}${rate.toFixed(1)}%`;
  };

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-2 text-gray-600">Loading user analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-400">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading analytics</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={fetchAnalytics}
            className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Analytics</h2>
          <p className="text-gray-600 mt-1">Comprehensive user statistics and trends</p>
        </div>
        
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="1d">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalUsers.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserPlus className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">New This Month</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.userGrowth.thisMonth}</p>
              <p className={`text-sm ${analytics.userGrowth.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatGrowthRate(analytics.userGrowth.growthRate)} from last month
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active (30d)</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.activeUsers.last30d}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active (24h)</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.activeUsers.last24h}</p>
            </div>
          </div>
        </div>
      </div>     
 {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Registration Trends */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Registration Trends</h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            {analytics.userDistribution.byRegistrationDate.slice(-6).map((item, index) => (
              <div key={item.period} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{item.period}</span>
                <div className="flex items-center">
                  <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${Math.max((item.count / Math.max(...analytics.userDistribution.byRegistrationDate.map(d => d.count))) * 100, 5)}%` 
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8 text-right">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Activity Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Activity Distribution</h3>
            <PieChart className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-3">
            {analytics.userDistribution.byActivity.map((item, index) => {
              const colors = ['bg-green-500', 'bg-blue-500', 'bg-yellow-500', 'bg-red-500'];
              const bgColors = ['bg-green-100', 'bg-blue-100', 'bg-yellow-100', 'bg-red-100'];
              const textColors = ['text-green-700', 'text-blue-700', 'text-yellow-700', 'text-red-700'];
              
              return (
                <div key={item.category} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]} mr-3`}></div>
                    <span className="text-sm text-gray-700">{item.category}</span>
                  </div>
                  <div className="flex items-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${bgColors[index % bgColors.length]} ${textColors[index % textColors.length]} mr-2`}>
                      {item.count}
                    </span>
                    <span className="text-xs text-gray-500 w-12 text-right">
                      {analytics.totalUsers > 0 ? Math.round((item.count / analytics.totalUsers) * 100) : 0}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Daily Registration Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Daily Registrations</h3>
          <Calendar className="w-5 h-5 text-gray-400" />
        </div>
        
        <div className="h-64 flex items-end justify-between space-x-1">
          {analytics.newUsers.daily.slice(-30).map((day, index) => {
            const maxCount = Math.max(...analytics.newUsers.daily.map(d => d.count));
            const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
            
            return (
              <div key={day.date} className="flex flex-col items-center group">
                <div className="relative">
                  <div 
                    className="w-2 bg-purple-600 rounded-t transition-all duration-300 hover:bg-purple-700"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  ></div>
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {formatDate(day.date)}: {day.count} users
                  </div>
                </div>
                
                {index % 5 === 0 && (
                  <span className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-left">
                    {formatDate(day.date)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Most Active Users</h3>
          <p className="text-sm text-gray-600 mt-1">Users ranked by document creation and download activity</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Documents
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Downloads
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analytics.topUsers.map((user, index) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-purple-700">
                          {user.name.charAt(0) || user.email.charAt(0)}
                        </span>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {user.name || 'Anonymous'}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900">{user.documentsCreated}</span>
                      {index < 3 && (
                        <span className="ml-2 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                          #{index + 1}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.downloadsCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.lastActive).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {analytics.topUsers.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No active users found</p>
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Growth Rate</p>
            <p className={`font-semibold ${analytics.userGrowth.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatGrowthRate(analytics.userGrowth.growthRate)} this month
            </p>
          </div>
          <div>
            <p className="text-gray-600">Active User Rate</p>
            <p className="font-semibold text-blue-600">
              {analytics.totalUsers > 0 ? Math.round((analytics.activeUsers.last30d / analytics.totalUsers) * 100) : 0}% (30 days)
            </p>
          </div>
          <div>
            <p className="text-gray-600">Top User Activity</p>
            <p className="font-semibold text-purple-600">
              {analytics.topUsers[0]?.documentsCreated || 0} documents created
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserAnalytics;