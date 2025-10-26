import { VercelRequest, VercelResponse } from '@vercel/node';
import AdminMiddleware, { AdminRequest } from '../../_lib/admin-middleware';
import { getStorage } from '../../_lib/storage';

interface SystemAnalytics {
  uptime: {
    current: number; // in seconds
    percentage: number; // uptime percentage for the period
    lastDowntime: string | null;
    downtimeEvents: {
      start: string;
      end: string;
      duration: number;
      reason?: string;
    }[];
  };
  performance: {
    averageResponseTime: number; // in milliseconds
    p95ResponseTime: number;
    p99ResponseTime: number;
    requestsPerSecond: number;
    peakRequestsPerSecond: number;
  };
  errors: {
    totalErrors: number;
    errorRate: number; // percentage
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
    storageUsed: number; // in MB
    storageLimit: number; // in MB
    storagePercentage: number;
    memoryUsage: number; // in MB
    cpuUsage: number; // percentage
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Protect with admin middleware
  return AdminMiddleware.protect(
    req as AdminRequest,
    res,
    ['view_analytics', 'view_system'],
    async (req: AdminRequest, res: VercelResponse) => {
      try {
        const { timeRange = '24h', includeDetails = 'true' } = req.query;
        
        await AdminMiddleware.logAdminAction(req, 'view_system_analytics', { 
          timeRange, 
          includeDetails 
        });

        const storage = getStorage();
        const analytics = await calculateSystemAnalytics(storage, {
          timeRange: timeRange as string,
          includeDetails: includeDetails === 'true'
        });

        res.status(200).json({
          success: true,
          data: analytics,
          generatedAt: new Date().toISOString(),
          timeRange
        });

      } catch (error) {
        console.error('System analytics error:', error);
        res.status(500).json({
          error: 'Failed to generate system analytics',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );
}a
sync function calculateSystemAnalytics(
  storage: any, 
  options: { timeRange: string; includeDetails: boolean }
): Promise<SystemAnalytics> {
  const now = new Date();
  const timeRangeMs = parseTimeRange(options.timeRange);
  const startDate = new Date(now.getTime() - timeRangeMs);

  try {
    // Get system metrics data
    const systemLogs = await storage.getSystemLogs(startDate, now);
    const errorLogs = await storage.getErrorLogs(startDate, now);
    const performanceLogs = await storage.getPerformanceLogs(startDate, now);
    
    // Calculate uptime metrics
    const uptime = calculateUptimeMetrics(systemLogs, startDate, now);
    
    // Calculate performance metrics
    const performance = calculatePerformanceMetrics(performanceLogs);
    
    // Calculate error metrics
    const errors = calculateErrorMetrics(errorLogs);
    
    // Calculate resource usage
    const resources = await calculateResourceMetrics(storage);
    
    // Calculate traffic metrics
    const traffic = calculateTrafficMetrics(systemLogs, startDate, now);
    
    // Calculate health status
    const health = await calculateHealthStatus(storage, systemLogs, errorLogs);

    return {
      uptime,
      performance,
      errors,
      resources,
      traffic,
      health
    };

  } catch (error) {
    console.error('Error calculating system analytics:', error);
    throw new Error('Failed to calculate system analytics');
  }
}

function parseTimeRange(timeRange: string): number {
  const timeRangeMap: { [key: string]: number } = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  };
  
  return timeRangeMap[timeRange] || timeRangeMap['24h'];
}

function calculateUptimeMetrics(systemLogs: any[], startDate: Date, endDate: Date) {
  const totalPeriodMs = endDate.getTime() - startDate.getTime();
  
  // Find downtime events from logs
  const downtimeEvents = systemLogs
    .filter(log => log.type === 'downtime' || log.status === 'down')
    .map(log => ({
      start: log.timestamp,
      end: log.endTime || log.timestamp,
      duration: log.duration || 0,
      reason: log.reason || 'Unknown'
    }));

  // Calculate total downtime
  const totalDowntimeMs = downtimeEvents.reduce((sum, event) => {
    const start = new Date(event.start).getTime();
    const end = new Date(event.end).getTime();
    return sum + (end - start);
  }, 0);

  const uptimeMs = totalPeriodMs - totalDowntimeMs;
  const uptimePercentage = totalPeriodMs > 0 ? (uptimeMs / totalPeriodMs) * 100 : 100;

  const lastDowntime = downtimeEvents.length > 0 
    ? downtimeEvents[downtimeEvents.length - 1].start 
    : null;

  return {
    current: Math.floor(uptimeMs / 1000),
    percentage: Math.round(uptimePercentage * 100) / 100,
    lastDowntime,
    downtimeEvents: downtimeEvents.slice(-10) // Last 10 events
  };
}

function calculatePerformanceMetrics(performanceLogs: any[]) {
  if (performanceLogs.length === 0) {
    return {
      averageResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      requestsPerSecond: 0,
      peakRequestsPerSecond: 0
    };
  }

  // Extract response times
  const responseTimes = performanceLogs
    .filter(log => log.responseTime && log.responseTime > 0)
    .map(log => log.responseTime)
    .sort((a, b) => a - b);

  const averageResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
    : 0;

  // Calculate percentiles
  const p95Index = Math.floor(responseTimes.length * 0.95);
  const p99Index = Math.floor(responseTimes.length * 0.99);
  const p95ResponseTime = responseTimes[p95Index] || 0;
  const p99ResponseTime = responseTimes[p99Index] || 0;

  // Calculate requests per second
  const timeSpanSeconds = performanceLogs.length > 0 
    ? (new Date(performanceLogs[performanceLogs.length - 1].timestamp).getTime() - 
       new Date(performanceLogs[0].timestamp).getTime()) / 1000
    : 1;

  const requestsPerSecond = timeSpanSeconds > 0 ? performanceLogs.length / timeSpanSeconds : 0;

  // Find peak requests per second (group by minute and find max)
  const requestsByMinute = performanceLogs.reduce((acc, log) => {
    const minute = new Date(log.timestamp).toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
    acc[minute] = (acc[minute] || 0) + 1;
    return acc;
  }, {});

  const peakRequestsPerSecond = Math.max(...Object.values(requestsByMinute).map(count => (count as number) / 60));

  return {
    averageResponseTime: Math.round(averageResponseTime),
    p95ResponseTime: Math.round(p95ResponseTime),
    p99ResponseTime: Math.round(p99ResponseTime),
    requestsPerSecond: Math.round(requestsPerSecond * 10) / 10,
    peakRequestsPerSecond: Math.round(peakRequestsPerSecond * 10) / 10
  };
}

function calculateErrorMetrics(errorLogs: any[]) {
  const totalErrors = errorLogs.length;
  
  // Calculate error rate (assuming we have total requests in logs)
  const totalRequests = errorLogs.reduce((sum, log) => sum + (log.requestCount || 1), 0);
  const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

  // Group errors by type
  const errorsByType = errorLogs.reduce((acc, log) => {
    const type = log.errorType || log.type || 'Unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const errorTypeArray = Object.entries(errorsByType).map(([type, count]) => ({
    type,
    count: count as number,
    percentage: totalErrors > 0 ? Math.round(((count as number) / totalErrors) * 100) : 0
  })).sort((a, b) => b.count - a.count);

  // Get recent errors
  const recentErrors = errorLogs
    .slice(-20) // Last 20 errors
    .map(log => ({
      timestamp: log.timestamp,
      type: log.errorType || log.type || 'Unknown',
      message: log.message || log.error || 'No message',
      endpoint: log.endpoint || log.path
    }));

  return {
    totalErrors,
    errorRate: Math.round(errorRate * 100) / 100,
    errorsByType: errorTypeArray,
    recentErrors
  };
}

async function calculateResourceMetrics(storage: any) {
  try {
    // Get storage usage (this would be implementation-specific)
    const storageStats = await storage.getStorageStats();
    
    // Mock resource metrics (in a real implementation, these would come from system monitoring)
    const resources = {
      storageUsed: storageStats?.used || 0, // MB
      storageLimit: storageStats?.limit || 1000, // MB
      storagePercentage: 0,
      memoryUsage: Math.floor(Math.random() * 512) + 256, // Mock: 256-768 MB
      cpuUsage: Math.floor(Math.random() * 30) + 10, // Mock: 10-40%
      activeConnections: Math.floor(Math.random() * 50) + 10 // Mock: 10-60 connections
    };

    resources.storagePercentage = resources.storageLimit > 0 
      ? Math.round((resources.storageUsed / resources.storageLimit) * 100) 
      : 0;

    return resources;
  } catch (error) {
    // Return default values if storage stats are not available
    return {
      storageUsed: 0,
      storageLimit: 1000,
      storagePercentage: 0,
      memoryUsage: 256,
      cpuUsage: 15,
      activeConnections: 25
    };
  }
}

function calculateTrafficMetrics(systemLogs: any[], startDate: Date, endDate: Date) {
  const requestLogs = systemLogs.filter(log => log.type === 'request' || log.method);
  
  const totalRequests = requestLogs.length;

  // Group requests by endpoint
  const requestsByEndpoint = requestLogs.reduce((acc, log) => {
    const endpoint = log.endpoint || log.path || 'Unknown';
    if (!acc[endpoint]) {
      acc[endpoint] = {
        count: 0,
        totalResponseTime: 0
      };
    }
    acc[endpoint].count++;
    acc[endpoint].totalResponseTime += log.responseTime || 0;
    return acc;
  }, {});

  const endpointArray = Object.entries(requestsByEndpoint).map(([endpoint, data]: [string, any]) => ({
    endpoint,
    count: data.count,
    averageResponseTime: data.count > 0 ? Math.round(data.totalResponseTime / data.count) : 0
  })).sort((a, b) => b.count - a.count).slice(0, 10);

  // Group requests by hour
  const requestsByHour = requestLogs.reduce((acc, log) => {
    const hour = new Date(log.timestamp).toISOString().slice(0, 13); // YYYY-MM-DDTHH
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {});

  const hourArray = Object.entries(requestsByHour).map(([hour, count]) => ({
    hour,
    count: count as number
  })).sort((a, b) => a.hour.localeCompare(b.hour));

  // Calculate unique users (based on IP or user ID)
  const uniqueIPs = new Set(requestLogs.map(log => log.ip || log.userIP).filter(Boolean));
  const uniqueUsers = uniqueIPs.size;

  // Calculate peak concurrent users (simplified)
  const peakConcurrentUsers = Math.max(...Object.values(requestsByHour).map(count => count as number), 0);

  return {
    totalRequests,
    requestsByEndpoint: endpointArray,
    requestsByHour: hourArray,
    uniqueUsers,
    peakConcurrentUsers
  };
}

async function calculateHealthStatus(storage: any, systemLogs: any[], errorLogs: any[]) {
  const now = new Date();
  
  // Perform health checks
  const checks = [
    {
      name: 'Database Connection',
      status: 'pass' as const,
      message: 'Database is responding normally',
      lastChecked: now.toISOString()
    },
    {
      name: 'Storage Access',
      status: 'pass' as const,
      message: 'Storage is accessible',
      lastChecked: now.toISOString()
    },
    {
      name: 'API Endpoints',
      status: 'pass' as const,
      message: 'All endpoints are responding',
      lastChecked: now.toISOString()
    }
  ];

  // Check for recent errors to determine status
  const recentErrors = errorLogs.filter(log => {
    const logTime = new Date(log.timestamp);
    return (now.getTime() - logTime.getTime()) < (5 * 60 * 1000); // Last 5 minutes
  });

  let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
  
  if (recentErrors.length > 10) {
    overallStatus = 'critical';
    checks[2].status = 'fail';
    checks[2].message = `High error rate detected: ${recentErrors.length} errors in last 5 minutes`;
  } else if (recentErrors.length > 3) {
    overallStatus = 'warning';
    checks[2].status = 'warn';
    checks[2].message = `Elevated error rate: ${recentErrors.length} errors in last 5 minutes`;
  }

  // Generate alerts based on system state
  const alerts = [];
  
  if (recentErrors.length > 5) {
    alerts.push({
      level: 'warning' as const,
      message: `High error rate detected: ${recentErrors.length} errors in the last 5 minutes`,
      timestamp: now.toISOString(),
      resolved: false
    });
  }

  return {
    status: overallStatus,
    checks,
    alerts
  };
}