import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  TrendingUp, 
  Clock,
  BarChart3,
  PieChart,
  RefreshCw,
  Calendar,
  Target,
  Award,
  Activity
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface DocumentAnalytics {
  totalDocuments: number;
  documentsCreated: {
    daily: { date: string; count: number }[];
    weekly: { week: string; count: number }[];
    monthly: { month: string; count: number }[];
  };
  documentTypes: {
    type: string;
    count: number;
    percentage: number;
  }[];
  documentPerformance: {
    averageCreationTime: number;
    averagePageCount: number;
    averageWordCount: number;
    completionRate: number;
  };
  topDocuments: {
    id: string;
    title: string;
    author: string;
    createdAt: string;
    downloadCount: number;
    pageCount: number;
  }[];
  documentTrends: {
    period: string;
    created: number;
    completed: number;
    downloaded: number;
  }[];
}

interface DocumentAnalyticsProps {
  timeRange?: string;
}

const DocumentAnalytics: React.FC<DocumentAnalyticsProps> = ({ timeRange = '30d' }) => {
  const [analytics, setAnalytics] = useState<DocumentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.adminGet(`/analytics?type=documents&timeRange=${selectedTimeRange}`);
      
      if (response.success) {
        setAnalytics(response.data as DocumentAnalytics);
      } else {
        const errorMessage = typeof response.error === 'string' 
          ? response.error 
          : response.error?.message || 'Failed to fetch document analytics';
        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error('Error fetching document analytics:', err);
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

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-2 text-gray-600">Loading document analytics...</span>
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
          <h2 className="text-2xl font-bold text-gray-900">Document Analytics</h2>
          <p className="text-gray-600 mt-1">Document creation statistics and performance metrics</p>
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
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Documents</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalDocuments.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Target className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.documentPerformance.completionRate}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Creation Time</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatDuration(analytics.documentPerformance.averageCreationTime)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Activity className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Page Count</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.documentPerformance.averagePageCount}</p>
            </div>
          </div>
        </div>
      </div>   
   {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Types Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Document Types</h3>
            <PieChart className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-3">
            {analytics.documentTypes.map((type, index) => {
              const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500'];
              const bgColors = ['bg-blue-100', 'bg-green-100', 'bg-yellow-100', 'bg-red-100', 'bg-purple-100'];
              const textColors = ['text-blue-700', 'text-green-700', 'text-yellow-700', 'text-red-700', 'text-purple-700'];
              
              return (
                <div key={type.type} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]} mr-3`}></div>
                    <span className="text-sm text-gray-700">{type.type}</span>
                  </div>
                  <div className="flex items-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${bgColors[index % bgColors.length]} ${textColors[index % textColors.length]} mr-2`}>
                      {type.count}
                    </span>
                    <span className="text-xs text-gray-500 w-12 text-right">
                      {type.percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Document Performance Metrics */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Performance Metrics</h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Average Word Count</span>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((analytics.documentPerformance.averageWordCount / 5000) * 100, 100)}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900 w-16 text-right">
                  {analytics.documentPerformance.averageWordCount.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Average Page Count</span>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((analytics.documentPerformance.averagePageCount / 20) * 100, 100)}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900 w-16 text-right">
                  {analytics.documentPerformance.averagePageCount}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Completion Rate</span>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                  <div 
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${analytics.documentPerformance.completionRate}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900 w-16 text-right">
                  {analytics.documentPerformance.completionRate}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Avg Creation Time</span>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                  <div 
                    className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((analytics.documentPerformance.averageCreationTime / 120) * 100, 100)}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900 w-16 text-right">
                  {formatDuration(analytics.documentPerformance.averageCreationTime)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Document Creation Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Daily Document Creation</h3>
          <Calendar className="w-5 h-5 text-gray-400" />
        </div>
        
        <div className="h-64 flex items-end justify-between space-x-1">
          {analytics.documentsCreated.daily.slice(-30).map((day, index) => {
            const maxCount = Math.max(...analytics.documentsCreated.daily.map(d => d.count));
            const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
            
            return (
              <div key={day.date} className="flex flex-col items-center group">
                <div className="relative">
                  <div 
                    className="w-2 bg-blue-600 rounded-t transition-all duration-300 hover:bg-blue-700"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  ></div>
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {formatDate(day.date)}: {day.count} documents
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

      {/* Document Trends */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Document Trends</h3>
          <TrendingUp className="w-5 h-5 text-gray-400" />
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Downloaded</th>
                <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Completion %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {analytics.documentTrends.slice(-10).map((trend, index) => {
                const completionRate = trend.created > 0 ? (trend.completed / trend.created) * 100 : 0;
                
                return (
                  <tr key={trend.period} className="hover:bg-gray-50">
                    <td className="py-3 text-sm text-gray-900">
                      {formatDate(trend.period)}
                    </td>
                    <td className="py-3 text-sm text-gray-900 text-right font-medium">
                      {trend.created}
                    </td>
                    <td className="py-3 text-sm text-gray-900 text-right">
                      {trend.completed}
                    </td>
                    <td className="py-3 text-sm text-gray-900 text-right">
                      {trend.downloaded}
                    </td>
                    <td className="py-3 text-sm text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        completionRate >= 80 ? 'bg-green-100 text-green-800' :
                        completionRate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {completionRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Documents Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Most Downloaded Documents</h3>
          <p className="text-sm text-gray-600 mt-1">Documents ranked by download count</p>
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
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pages
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Downloads
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analytics.topDocuments.map((doc, index) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg mr-3">
                        <FileText className="w-4 h-4 text-blue-600" />
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(doc.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {doc.pageCount || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {doc.downloadCount} downloads
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {analytics.topDocuments.length === 0 && (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No documents with downloads found</p>
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Most Popular Type</p>
            <p className="font-semibold text-blue-600">
              {analytics.documentTypes[0]?.type || 'N/A'} ({analytics.documentTypes[0]?.percentage || 0}%)
            </p>
          </div>
          <div>
            <p className="text-gray-600">Average Quality</p>
            <p className="font-semibold text-green-600">
              {analytics.documentPerformance.averagePageCount} pages, {analytics.documentPerformance.averageWordCount.toLocaleString()} words
            </p>
          </div>
          <div>
            <p className="text-gray-600">Top Document</p>
            <p className="font-semibold text-purple-600">
              {analytics.topDocuments[0]?.downloadCount || 0} downloads
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentAnalytics;