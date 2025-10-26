import { VercelRequest, VercelResponse } from '@vercel/node';
import AdminMiddleware, { AdminRequest } from '../../_lib/admin-middleware';

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

  // Protect with admin middleware with rate limiting for audit log access
  return AdminMiddleware.protect(
    req as AdminRequest,
    res,
    ['view_analytics', 'system_monitoring'],
    async (req: AdminRequest, res: VercelResponse) => {
      try {
        const {
          limit = '100',
          offset = '0',
          userId,
          action,
          severity,
          startDate,
          endDate
        } = req.query;

        // Log audit log access
        await AdminMiddleware.logAdminAction(req, 'view_audit_logs', {
          filters: { userId, action, severity, startDate, endDate },
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        });

        // Check for suspicious activity
        const suspiciousActivity = AdminMiddleware.checkSuspiciousActivity(req);
        if (suspiciousActivity.isSuspicious) {
          await AdminMiddleware.logAdminAction(req, 'suspicious_activity_detected', {
            reason: suspiciousActivity.reason,
            action: 'view_audit_logs'
          });
        }

        // Get audit logs with filters
        const result = AdminMiddleware.getAuditLogs(
          parseInt(limit as string),
          parseInt(offset as string),
          {
            userId: userId as string,
            action: action as string,
            severity: severity as string,
            startDate: startDate as string,
            endDate: endDate as string
          }
        );

        res.status(200).json({
          success: true,
          data: {
            logs: result.logs,
            pagination: {
              total: result.total,
              limit: parseInt(limit as string),
              offset: parseInt(offset as string),
              hasMore: result.total > parseInt(offset as string) + parseInt(limit as string)
            }
          }
        });

      } catch (error) {
        console.error('Audit logs API error:', error);
        
        await AdminMiddleware.logAdminAction(req, 'audit_logs_error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        res.status(500).json({
          error: 'Failed to retrieve audit logs',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    },
    {
      rateLimit: { maxRequests: 50, windowMs: 15 * 60 * 1000 }, // 50 requests per 15 minutes
      sensitiveOperation: true
    }
  );
}