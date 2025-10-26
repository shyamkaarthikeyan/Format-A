import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Server,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  HardDrive,
  Cpu,
  Monitor,
  Wifi,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Zap,
  Database,
  Globe,
  Shield
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface SystemHealth {
  uptime: {
    current: number;
    percentage: number;
    lastDowntime: string | null;
    downtimeEvents: {
      start: string;
      end: string;
      duration: number;
      reason?: string;
    }[];
  };
  performance: {
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    requestsPerSecond: number;
    peakRequestsPerSecond: number;
  };
  errors: {
    totalErrors: number;
    errorRate: number;
    errorsByType: {
      type: string;
      count: number;
      percentage: number;
    }[];
    recentErrors: {
      timestamp: string;
      type: string;
      message: string;
      endpoint?: string;
    }[];
  };
  resources: {
    storageUsed: number;
    storageLimit: number;
    storagePercentage: number;
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
  };
  traffic: {
    totalRequests: number;
    requestsByEndpoint: {
      endpoint: string;
      count: number;
      averageResponseTime: number;
    }[];
    requestsByHour: {
      hour: string;
      count: number;
    }[];
    uniqueUsers: number;
    peakConcurrentUsers: number;
  };
  health: {
    status: 'healthy' | 'warning' | 'critical';
    checks: {
      name: string;
      status: 'pass' | 'fail' | 'warn';
      message: string;
      lastChecked: string;
    }[];
    alerts: {
      level: 'info' | 'warning' | 'critical';
      message: string;
      timestamp: string;
      resolved: boolean;
    }[];
  };
}

interface SystemHealthProps {
  timeRange?: string;
}

const SystemHealth: React.FC<SystemHealthProps> = ({ timeRange = '24h' }) => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get(`/api/admin/analytics/system?timeRange=${selectedTimeRange}`);
      
      if (response.success) {
        setHealth(response.data);
      } else {
        throw new Error(response.error || 'Failed to fetch system health');
      }
    } catch (err) {
      console.error('Error fetching system health:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch system health');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, [selectedTimeRange]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      if (!loading && !refreshing) {
        setRefreshing(true);
        fetchHealth();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, loading, refreshing]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchHealth();
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatFileSize = (sizeInMB: number) => {
    if (sizeInMB < 1024) return `${sizeInMB} MB`;
    const sizeInGB = sizeInMB / 1024;
    return `${sizeInGB.toFixed(1)} GB`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'pass':
        return 'text-green-600 bg-green-100';
      case 'warning':
      case 'warn':
        return 'text-yellow-600 bg-yellow-100';
      case 'critical':
      case 'fail':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'pass':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
      case 'warn':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'critical':
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  if (loading && !health) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-2 text-gray-600">Loading system health...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-400 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Error loading system health</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={fetchHealth}
            className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!health) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Health</h2>
          <p className="text-gray-600 mt-1">Real-time system monitoring and performance metrics</p>
        </div>
        
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-600">Auto-refresh</span>
          </label>
          
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
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

      {/* Overall Status */}
      <div className={`rounded-lg p-6 border-2 ${
        health.health.status === 'healthy' ? 'bg-green-50 border-green-200' :
        health.health.status === 'warning' ? 'bg-yellow-50 border-yellow-200' :
        'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {getStatusIcon(health.health.status)}
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-gray-900 capitalize">
                System Status: {health.health.status}
              </h3>
              <p className="text-sm text-gray-600">
                Last updated: {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {health.uptime.percentage.toFixed(2)}%
            </div>
            <div className="text-sm text-gray-600">Uptime</div>
          </div>
        </div>
      </div>   
   {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Uptime</p>
              <p className="text-2xl font-bold text-gray-900">{formatUptime(health.uptime.current)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Zap className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Response Time</p>
              <p className="text-2xl font-bold text-gray-900">{health.performance.averageResponseTime}ms</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Requests/sec</p>
              <p className="text-2xl font-bold text-gray-900">{health.performance.requestsPerSecond}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${
              health.errors.errorRate < 1 ? 'bg-green-100' :
              health.errors.errorRate < 5 ? 'bg-yellow-100' : 'bg-red-100'
            }`}>
              <AlertTriangle className={`w-6 h-6 ${
                health.errors.errorRate < 1 ? 'text-green-600' :
                health.errors.errorRate < 5 ? 'text-yellow-600' : 'text-red-600'
              }`} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Error Rate</p>
              <p className="text-2xl font-bold text-gray-900">{health.errors.errorRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Resource Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resource Usage</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Cpu className="w-5 h-5 text-blue-600 mr-2" />
                <span className="text-sm text-gray-600">CPU Usage</span>
              </div>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      health.resources.cpuUsage < 70 ? 'bg-green-600' :
                      health.resources.cpuUsage < 85 ? 'bg-yellow-600' : 'bg-red-600'
                    }`}
                    style={{ width: `${health.resources.cpuUsage}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900 w-12 text-right">
                  {health.resources.cpuUsage}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Memory className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-sm text-gray-600">Memory Usage</span>
              </div>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((health.resources.memoryUsage / 1024) * 100, 100)}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900 w-12 text-right">
                  {health.resources.memoryUsage} MB
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <HardDrive className="w-5 h-5 text-purple-600 mr-2" />
                <span className="text-sm text-gray-600">Storage</span>
              </div>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      health.resources.storagePercentage < 70 ? 'bg-purple-600' :
                      health.resources.storagePercentage < 85 ? 'bg-yellow-600' : 'bg-red-600'
                    }`}
                    style={{ width: `${health.resources.storagePercentage}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900 w-16 text-right">
                  {formatFileSize(health.resources.storageUsed)} / {formatFileSize(health.resources.storageLimit)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Wifi className="w-5 h-5 text-orange-600 mr-2" />
                <span className="text-sm text-gray-600">Active Connections</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-900">
                  {health.resources.activeConnections}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Average Response Time</span>
              <span className="text-sm font-medium text-gray-900">{health.performance.averageResponseTime}ms</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">95th Percentile</span>
              <span className="text-sm font-medium text-gray-900">{health.performance.p95ResponseTime}ms</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">99th Percentile</span>
              <span className="text-sm font-medium text-gray-900">{health.performance.p99ResponseTime}ms</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Current RPS</span>
              <span className="text-sm font-medium text-gray-900">{health.performance.requestsPerSecond}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Peak RPS</span>
              <span className="text-sm font-medium text-gray-900">{health.performance.peakRequestsPerSecond}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Requests</span>
              <span className="text-sm font-medium text-gray-900">{health.traffic.totalRequests.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Health Checks */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Health Checks</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {health.health.checks.map((check, index) => (
            <div key={index} className="flex items-center p-4 border border-gray-200 rounded-lg">
              {getStatusIcon(check.status)}
              <div className="ml-3 flex-1">
                <div className="text-sm font-medium text-gray-900">{check.name}</div>
                <div className="text-xs text-gray-500">{check.message}</div>
                <div className="text-xs text-gray-400 mt-1">
                  Last checked: {new Date(check.lastChecked).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts */}
      {health.health.alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Alerts</h3>
          
          <div className="space-y-3">
            {health.health.alerts.filter(alert => !alert.resolved).map((alert, index) => (
              <div key={index} className={`p-4 rounded-lg border-l-4 ${
                alert.level === 'critical' ? 'bg-red-50 border-red-400' :
                alert.level === 'warning' ? 'bg-yellow-50 border-yellow-400' :
                'bg-blue-50 border-blue-400'
              }`}>
                <div className="flex items-center">
                  {alert.level === 'critical' && <XCircle className="w-5 h-5 text-red-600 mr-2" />}
                  {alert.level === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />}
                  {alert.level === 'info' && <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />}
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{alert.message}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(alert.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
                    alert.level === 'critical' ? 'bg-red-100 text-red-800' :
                    alert.level === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {alert.level}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Analysis */}
      {health.errors.totalErrors > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Error Types</h3>
            
            <div className="space-y-3">
              {health.errors.errorsByType.map((errorType, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{errorType.type}</span>
                  <div className="flex items-center">
                    <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                      <div 
                        className="bg-red-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${errorType.percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-8 text-right">
                      {errorType.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Errors</h3>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {health.errors.recentErrors.slice(0, 10).map((error, index) => (
                <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-red-800">{error.type}</div>
                      <div className="text-xs text-red-600 mt-1">{error.message}</div>
                      {error.endpoint && (
                        <div className="text-xs text-red-500 mt-1">Endpoint: {error.endpoint}</div>
                      )}
                    </div>
                    <div className="text-xs text-red-500 ml-2">
                      {new Date(error.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top Endpoints */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Endpoints</h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Endpoint
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requests
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Response Time
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {health.traffic.requestsByEndpoint.slice(0, 10).map((endpoint, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {endpoint.endpoint}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {endpoint.count.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {endpoint.averageResponseTime}ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-600">System Status</p>
            <p className={`font-semibold capitalize ${
              health.health.status === 'healthy' ? 'text-green-600' :
              health.health.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {health.health.status}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Uptime</p>
            <p className="font-semibold text-blue-600">
              {health.uptime.percentage.toFixed(2)}% ({formatUptime(health.uptime.current)})
            </p>
          </div>
          <div>
            <p className="text-gray-600">Performance</p>
            <p className="font-semibold text-purple-600">
              {health.performance.averageResponseTime}ms avg response
            </p>
          </div>
          <div>
            <p className="text-gray-600">Traffic</p>
            <p className="font-semibold text-orange-600">
              {health.traffic.uniqueUsers} unique users
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealth;