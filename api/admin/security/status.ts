import { VercelRequest, VercelResponse } from '@vercel/node';
import AdminMiddleware, { AdminRequest } from '../../_lib/admin-middleware';

interface SecurityStatus {
  overallStatus: 'secure' | 'warning' | 'critical';
  metrics: {
    totalAuditLogs: number;
    criticalEvents: number;
    suspiciousActivity: number;
    failedLoginAttempts: number;
    activeAdminSessions: number;
  };
  recentAlerts: {
    id: string;
    timestamp: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    type: string;
    message: string;
    resolved: boolean;
  }[];
  recommendations: string[];
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

  // Apply security headers
  AdminMiddleware.setSecurityHeaders(res);

  // Protect with admin middleware
  return AdminMiddleware.protect(
    req as AdminRequest,
    res,
    ['system_monitoring'],
    async (req: AdminRequest, res: VercelResponse) => {
      try {
        await AdminMiddleware.logAdminAction(req, 'view_security_status');

        const securityStatus = calculateSecurityStatus();

        res.status(200).json({
          success: true,
          data: securityStatus,
          generatedAt: new Date().toISOString()
        });

      } catch (error) {
        console.error('Security status API error:', error);
        
        await AdminMiddleware.logAdminAction(req, 'security_status_error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        res.status(500).json({
          error: 'Failed to retrieve security status',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    },
    {
      rateLimit: { maxRequests: 30, windowMs: 15 * 60 * 1000 },
      sensitiveOperation: true
    }
  );
}

function calculateSecurityStatus(): SecurityStatus {
  const auditLogs = AdminMiddleware.getAuditLogs(1000, 0);
  const now = Date.now();
  const last24Hours = now - (24 * 60 * 60 * 1000);
  const last7Days = now - (7 * 24 * 60 * 60 * 1000);

  // Filter recent logs
  const recentLogs = auditLogs.logs.filter(log => 
    new Date(log.timestamp).getTime() > last24Hours
  );

  const weeklyLogs = auditLogs.logs.filter(log => 
    new Date(log.timestamp).getTime() > last7Days
  );

  // Calculate metrics
  const criticalEvents = recentLogs.filter(log => log.severity === 'critical').length;
  const suspiciousActivity = recentLogs.filter(log => 
    log.action.includes('suspicious') || log.action.includes('failed')
  ).length;
  const failedLoginAttempts = recentLogs.filter(log => 
    log.action.includes('failed') && log.action.includes('auth')
  ).length;

  // Mock active admin sessions (in production, get from session store)
  const activeAdminSessions = 1; // Current session

  // Generate alerts based on metrics
  const recentAlerts = [];

  if (criticalEvents > 0) {
    recentAlerts.push({
      id: `alert_${Date.now()}_critical`,
      timestamp: new Date().toISOString(),
      severity: 'critical' as const,
      type: 'security_incident',
      message: `${criticalEvents} critical security events detected in the last 24 hours`,
      resolved: false
    });
  }

  if (suspiciousActivity > 10) {
    recentAlerts.push({
      id: `alert_${Date.now()}_suspicious`,
      timestamp: new Date().toISOString(),
      severity: 'high' as const,
      type: 'suspicious_activity',
      message: `High level of suspicious activity detected: ${suspiciousActivity} incidents`,
      resolved: false
    });
  }

  if (failedLoginAttempts > 5) {
    recentAlerts.push({
      id: `alert_${Date.now()}_failed_logins`,
      timestamp: new Date().toISOString(),
      severity: 'medium' as const,
      type: 'authentication',
      message: `${failedLoginAttempts} failed login attempts in the last 24 hours`,
      resolved: false
    });
  }

  // Determine overall status
  let overallStatus: 'secure' | 'warning' | 'critical' = 'secure';
  
  if (criticalEvents > 0) {
    overallStatus = 'critical';
  } else if (suspiciousActivity > 5 || failedLoginAttempts > 3) {
    overallStatus = 'warning';
  }

  // Generate recommendations
  const recommendations = [];
  
  if (criticalEvents > 0) {
    recommendations.push('Immediate investigation required for critical security events');
  }
  
  if (suspiciousActivity > 5) {
    recommendations.push('Review suspicious activity patterns and consider implementing additional security measures');
  }
  
  if (failedLoginAttempts > 3) {
    recommendations.push('Monitor failed login attempts and consider implementing account lockout policies');
  }
  
  if (weeklyLogs.length > 1000) {
    recommendations.push('High admin activity detected - ensure all actions are authorized');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Security status is good - continue monitoring');
  }

  return {
    overallStatus,
    metrics: {
      totalAuditLogs: auditLogs.total,
      criticalEvents,
      suspiciousActivity,
      failedLoginAttempts,
      activeAdminSessions
    },
    recentAlerts,
    recommendations
  };
}