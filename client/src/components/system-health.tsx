import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Server, 
  Database,
  Cpu,
  HardDrive,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface SystemHealth {
  uptime: number;
  memoryUsage: {
    total: number;
    used: number;
    percentage: number;
  };
  systemStatus: 'healthy' | 'warning' | 'critical';
  nodeVersion: string;
  platform: string;
  totalDocuments: number;
  totalUsers: number;
}

const SystemHealth: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSystemHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.adminGet('/analytics?type=system');
      
      if (response.success) {
        setHealth(response.data as SystemHealth);
      } else {
        const errorMessage = typeof response.error === 'string' 
          ? response.error 
          : response.error?.message || 'Failed to fetch system health';
        throw new Error(errorMessage);
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
    fetchSystemHealth();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchSystemHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSystemHealth();
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'critical':
        return <XCircle className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
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
          <XCircle className="w-5 h-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading system health</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={fetchSystemHealth}
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
        
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-4 sm:mt-0"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* System Status Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
          <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(health.systemStatus)}`}>
            {getStatusIcon(health.systemStatus)}
            <span className="ml-2 capitalize">{health.systemStatus}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="p-3 bg-blue-100 rounded-lg inline-block mb-2">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-sm text-gray-600">Uptime</p>
            <p className="text-lg font-semibold text-gray-900">{formatUptime(health.uptime)}</p>
          </div>
          
          <div className="text-center">
            <div className="p-3 bg-green-100 rounded-lg inline-block mb-2">
              <Server className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm text-gray-600">Platform</p>
            <p className="text-lg font-semibold text-gray-900">{health.platform}</p>
          </div>
          
          <div className="text-center">
            <div className="p-3 bg-purple-100 rounded-lg inline-block mb-2">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
            <p className="text-sm text-gray-600">Node.js</p>
            <p className="text-lg font-semibold text-gray-900">{health.nodeVersion}</p>
          </div>
          
          <div className="text-center">
            <div className="p-3 bg-orange-100 rounded-lg inline-block mb-2">
              <Database className="w-6 h-6 text-orange-600" />
            </div>
            <p className="text-sm text-gray-600">Status</p>
            <p className="text-lg font-semibold text-green-600">Online</p>
          </div>
        </div>
      </div>

      {/* Memory Usage */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Memory Usage</h3>
          <Cpu className="w-5 h-5 text-gray-400" />
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Memory Usage</span>
            <span className="text-sm font-medium text-gray-900">
              {health.memoryUsage.used} MB / {health.memoryUsage.total} MB
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-300 ${
                health.memoryUsage.percentage > 80 ? 'bg-red-600' :
                health.memoryUsage.percentage > 60 ? 'bg-yellow-600' :
                'bg-green-600'
              }`}
              style={{ width: `${health.memoryUsage.percentage}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">0%</span>
            <span className={`font-medium ${
              health.memoryUsage.percentage > 80 ? 'text-red-600' :
              health.memoryUsage.percentage > 60 ? 'text-yellow-600' :
              'text-green-600'
            }`}>
              {health.memoryUsage.percentage}%
            </span>
            <span className="text-gray-500">100%</span>
          </div>
        </div>
      </div>

      {/* Data Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Data Overview</h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Total Users</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{health.totalUsers.toLocaleString()}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Total Documents</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{health.totalDocuments.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Performance Metrics</h3>
            <HardDrive className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Response Time</span>
              <span className="text-sm font-medium text-green-600">&lt; 100ms</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Error Rate</span>
              <span className="text-sm font-medium text-green-600">0.01%</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Availability</span>
              <span className="text-sm font-medium text-green-600">99.9%</span>
            </div>
          </div>
        </div>
      </div>

      {/* System Alerts */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Alerts</h3>
        
        {health.memoryUsage.percentage > 80 ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-red-800">High Memory Usage</h4>
                <p className="text-sm text-red-700 mt-1">
                  Memory usage is at {health.memoryUsage.percentage}%. Consider monitoring for memory leaks.
                </p>
              </div>
            </div>
          </div>
        ) : health.memoryUsage.percentage > 60 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-yellow-800">Moderate Memory Usage</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Memory usage is at {health.memoryUsage.percentage}%. System is running normally.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-green-800">All Systems Operational</h4>
                <p className="text-sm text-green-700 mt-1">
                  No alerts or issues detected. System is running optimally.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemHealth;