import React, { useState, useEffect } from 'react';
import { 
  Download, 
  TrendingUp, 
  Clock,
  BarChart3,
  PieChart,
  RefreshCw,
  Calendar,
  Target,
  Award,
  Activity,
  FileText,
  Users,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface DownloadAnalytics {
  totalDownloads: number;
  downloadsByFormat: {
    format: 'pdf' | 'docx';
    count: number;
    percentage: number;
  }[];
  downloadTrends: {
    daily: { date: string; count: number }[];
    weekly: { week: string; count: number }[];
    monthly: { month: string; count: number }[];
  };
  downloadPatterns: {
    peakHours: { hour: number; count: number }[];
    peakDays: { day: string; count: number }[];
    userBehavior: {
      averageDownloadsPerUser: number;
      repeatDownloadRate: number;
      immediateDownloadRate: number;
    };
  };
  downloadPerformance: {
    successRate: number;
    failureRate: number;
    averageFileSize: number;
    averageDownloadTime: number;
  };
  topDownloadedDocuments: {
    id: string;
    title: string;
    author: string;
    downloadCount: number;
    formats: string[];
    lastDownloaded: string;
  }[];
  downloadDistribution: {
    byUser: { userId: string; userName: string; downloadCount: number }[];
    byDocument: { documentId: string; title: string; downloadCount: number }[];
    byTimeOfDay: { hour: number; count: number }[];
  };
}

interface DownloadAnalyticsProps {
  timeRange?: string;
}

const DownloadAnalytics: React.FC<DownloadAnalyticsProps> = ({ timeRange = '30d' }) => {
  const [analytics, setAnalytics] = useState<DownloadAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [selectedFormat, setSelectedFormat] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get(`/api/simple-admin?type=downloads&timeRange=${selectedTimeRange}&format=${selectedFormat}`);
      
      if (response.success) {
        setAnalytics(response.data as DownloadAnalytics);
      } else {
        const errorMessage = typeof response.error === 'string' 
          ? response.error 
          : response.error?.message || 'Failed to fetch download analytics';
        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error('Error fetching download analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [selectedTimeRange, selectedFormat]);

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

  const formatFileSize = (sizeInKB: number) => {
    if (sizeInKB < 1024) return `${sizeInKB} KB`;
    const sizeInMB = sizeInKB / 1024;
    return `${sizeInMB.toFixed(1)} MB`;
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getHourLabel = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-2 text-gray-600">Loading download analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-400">
            <AlertCircle className="w-5 h-5" />
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
          <h2 className="text-2xl font-bold text-gray-900">Download Analytics</h2>
          <p className="text-gray-600 mt-1">Download patterns, performance, and user behavior analysis</p>
        </div>
        
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">All Formats</option>
            <option value="pdf">PDF Only</option>
            <option value="docx">DOCX Only</option>
          </select>
          
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
              <Download className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Downloads</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalDownloads.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.downloadPerformance?.successRate || 0}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg per User</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.downloadPatterns?.userBehavior?.averageDownloadsPerUser || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg File Size</p>
              <p className="text-2xl font-bold text-gray-900">{formatFileSize(analytics.downloadPerformance?.averageFileSize || 0)}</p>
            </div>
          </div>
        </div>
      </div>     
 {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Download Format Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Format Distribution</h3>
            <PieChart className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            {analytics.downloadsByFormat?.length > 0 ? analytics.downloadsByFormat.map((format, index) => {
              const colors = ['bg-red-500', 'bg-blue-500'];
              const bgColors = ['bg-red-100', 'bg-blue-100'];
              const textColors = ['text-red-700', 'text-blue-700'];
              
              return (
                <div key={format.format} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-4 h-4 rounded ${colors[index % colors.length]} mr-3`}></div>
                    <span className="text-sm font-medium text-gray-700 uppercase">{format.format}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-32 bg-gray-200 rounded-full h-3 mr-3">
                      <div 
                        className={`${colors[index % colors.length]} h-3 rounded-full transition-all duration-300`}
                        style={{ width: `${format.percentage}%` }}
                      ></div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${bgColors[index % bgColors.length]} ${textColors[index % textColors.length]} mr-2`}>
                      {format.count.toLocaleString()}
                    </span>
                    <span className="text-sm text-gray-500 w-12 text-right">
                      {format.percentage}%
                    </span>
                  </div>
                </div>
              );
            }) : (
              <div className="text-center py-4 text-gray-500">
                <p>No format data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Download Performance Metrics */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Performance Metrics</h3>
            <Target className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Success Rate</span>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${analytics.downloadPerformance?.successRate || 0}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900 w-16 text-right">
                  {analytics.downloadPerformance?.successRate || 0}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Repeat Downloads</span>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${analytics.downloadPatterns?.userBehavior?.repeatDownloadRate || 0}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900 w-16 text-right">
                  {analytics.downloadPatterns?.userBehavior?.repeatDownloadRate || 0}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Immediate Downloads</span>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                  <div 
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${analytics.downloadPatterns?.userBehavior?.immediateDownloadRate || 0}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900 w-16 text-right">
                  {analytics.downloadPatterns?.userBehavior?.immediateDownloadRate || 0}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Avg Download Time</span>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                  <div 
                    className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(((analytics.downloadPerformance?.averageDownloadTime || 0) / 30) * 100, 100)}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900 w-16 text-right">
                  {formatTime(analytics.downloadPerformance?.averageDownloadTime || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Download Trends */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Daily Download Trends</h3>
          <Calendar className="w-5 h-5 text-gray-400" />
        </div>
        
        <div className="h-64 flex items-end justify-between space-x-1">
          {analytics.downloadTrends?.daily?.length > 0 ? analytics.downloadTrends.daily.slice(-30).map((day, index) => {
            const maxCount = Math.max(...(analytics.downloadTrends?.daily?.map(d => d.count) || [1]));
            const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
            
            return (
              <div key={day.date} className="flex flex-col items-center group">
                <div className="relative">
                  <div 
                    className="w-2 bg-green-600 rounded-t transition-all duration-300 hover:bg-green-700"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  ></div>
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {formatDate(day.date)}: {day.count} downloads
                  </div>
                </div>
                
                {index % 5 === 0 && (
                  <span className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-left">
                    {formatDate(day.date)}
                  </span>
                )}
              </div>
            );
          }) : (
            <div className="flex items-center justify-center w-full h-full">
              <div className="text-center text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No daily download data available</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Peak Hours and Days */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak Hours */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Peak Download Hours</h3>
            <Clock className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-2">
            {analytics.downloadPatterns?.peakHours?.slice(0, 8).map((hour, index) => {
              const maxCount = Math.max(...(analytics.downloadPatterns?.peakHours?.map(h => h.count) || [1]));
              const percentage = maxCount > 0 ? (hour.count / maxCount) * 100 : 0;
              
              return (
                <div key={hour.hour} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 w-16">{getHourLabel(hour.hour)}</span>
                  <div className="flex items-center flex-1 mx-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8 text-right">{hour.count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Peak Days */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Downloads by Day</h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-2">
            {analytics.downloadPatterns?.peakDays?.map((day, index) => {
              const maxCount = Math.max(...(analytics.downloadPatterns?.peakDays?.map(d => d.count) || [1]));
              const percentage = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
              
              return (
                <div key={day.day} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 w-20">{day.day}</span>
                  <div className="flex items-center flex-1 mx-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8 text-right">{day.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Downloaded Documents */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Most Downloaded Documents</h3>
          <p className="text-sm text-gray-600 mt-1">Documents with the highest download counts</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Document
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Author
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Formats
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Downloads
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Downloaded
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analytics.topDownloadedDocuments?.map((doc, index) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg mr-3">
                        <FileText className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                          {doc.title}
                        </div>
                        {index < 3 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                            <Award className="w-3 h-3 mr-1" />
                            Top #{index + 1}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {doc.author}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-1">
                      {doc.formats.map((format) => (
                        <span
                          key={format}
                          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            format === 'pdf' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {format.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {doc.downloadCount} downloads
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(doc.lastDownloaded).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {(analytics.topDownloadedDocuments?.length || 0) === 0 && (
            <div className="text-center py-8">
              <Download className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No downloads found</p>
            </div>
          )}
        </div>
      </div>

      {/* Top Users by Downloads */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Top Users by Downloads</h3>
          <p className="text-sm text-gray-600 mt-1">Users with the most download activity</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Downloads
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analytics.downloadDistribution?.byUser?.slice(0, 10).map((user, index) => (
                <tr key={user.userId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-purple-700">
                          {user.userName.charAt(0)}
                        </span>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {user.userName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {user.downloadCount} downloads
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {index < 3 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <Award className="w-3 h-3 mr-1" />
                        #{index + 1}
                      </span>
                    )}
                    {index >= 3 && (
                      <span className="text-sm text-gray-500">#{index + 1}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {(analytics.downloadDistribution?.byUser?.length || 0) === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No user download data found</p>
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border border-green-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Most Popular Format</p>
            <p className="font-semibold text-green-600">
              {analytics.downloadsByFormat?.[0]?.format.toUpperCase() || 'N/A'} ({analytics.downloadsByFormat?.[0]?.percentage || 0}%)
            </p>
          </div>
          <div>
            <p className="text-gray-600">Peak Download Hour</p>
            <p className="font-semibold text-blue-600">
              {getHourLabel(analytics.downloadPatterns?.peakHours?.[0]?.hour || 0)}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Top Document</p>
            <p className="font-semibold text-purple-600">
              {analytics.topDownloadedDocuments?.[0]?.downloadCount || 0} downloads
            </p>
          </div>
          <div>
            <p className="text-gray-600">User Engagement</p>
            <p className="font-semibold text-orange-600">
              {analytics.downloadPatterns?.userBehavior?.repeatDownloadRate || 0}% repeat users
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DownloadAnalytics;