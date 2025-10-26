import { VercelRequest, VercelResponse } from '@vercel/node';
import { adminSessions, adminTokens } from '../admin/auth/session';

// Rate limiting storage (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const auditLogs: any[] = []; // In production, use proper audit logging service

export type AdminPermission = 
  | 'view_analytics' 
  | 'manage_users' 
  | 'system_monitoring' 
  | 'download_reports'
  | 'admin_panel_access';

export interface AdminMiddlewareConfig {
  requiredPermissions?: AdminPermission[];
  allowSuperAdmin?: boolean;
}

export interface AdminRequest extends VercelRequest {
  adminSession?: {
    sessionId: string;
    userId: string;
    adminPermissions: AdminPermission[];
    createdAt: string;
    expiresAt: string;
    lastAccessedAt: string;
  };
}

export class AdminMiddleware {
  /**
   * Rate limiting for admin endpoints
   */
  static checkRateLimit(
    req: AdminRequest,
    res: VercelResponse,
    maxRequests: number = 100,
    windowMs: number = 15 * 60 * 1000 // 15 minutes
  ): boolean {
    const clientId = req.adminSession?.userId || 
                    req.headers['x-forwarded-for'] as string || 
                    req.headers['x-real-ip'] as string || 
                    'unknown';
    
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean up old entries
    const entries = Array.from(rateLimitStore.entries());
    for (const [key, data] of entries) {
      if (data.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
    
    const current = rateLimitStore.get(clientId);
    
    if (!current || current.resetTime < now) {
      // New window
      rateLimitStore.set(clientId, {
        count: 1,
        resetTime: now + windowMs
      });
      return true;
    }
    
    if (current.count >= maxRequests) {
      res.status(429).json({
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((current.resetTime - now) / 1000)
      });
      return false;
    }
    
    current.count++;
    rateLimitStore.set(clientId, current);
    return true;
  }

  /**
   * Validate and sanitize input data
   */
  static validateInput(data: any, rules: { [key: string]: string[] }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    for (const [field, validations] of Object.entries(rules)) {
      const value = data[field];
      
      for (const validation of validations) {
        switch (validation) {
          case 'required':
            if (value === undefined || value === null || value === '') {
              errors.push(`${field} is required`);
            }
            break;
          case 'email':
            if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              errors.push(`${field} must be a valid email`);
            }
            break;
          case 'string':
            if (value && typeof value !== 'string') {
              errors.push(`${field} must be a string`);
            }
            break;
          case 'number':
            if (value && typeof value !== 'number') {
              errors.push(`${field} must be a number`);
            }
            break;
          case 'boolean':
            if (value && typeof value !== 'boolean') {
              errors.push(`${field} must be a boolean`);
            }
            break;
          case 'no-html':
            if (value && typeof value === 'string' && /<[^>]*>/g.test(value)) {
              errors.push(`${field} cannot contain HTML`);
            }
            break;
          case 'max-length-255':
            if (value && typeof value === 'string' && value.length > 255) {
              errors.push(`${field} cannot exceed 255 characters`);
            }
            break;
        }
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }

  /**
   * Verify admin authentication and permissions
   */
  static async verifyAdmin(
    req: AdminRequest,
    res: VercelResponse,
    config: AdminMiddlewareConfig = {}
  ): Promise<boolean> {
    try {
      const adminToken = req.headers['x-admin-token'] as string;
      
      if (!adminToken) {
        res.status(401).json({
          error: 'Admin authentication required',
          code: 'ADMIN_TOKEN_MISSING'
        });
        return false;
      }

      // Get session ID from token
      const sessionId = adminTokens.get(adminToken);
      if (!sessionId) {
        res.status(401).json({
          error: 'Invalid admin token',
          code: 'INVALID_ADMIN_TOKEN'
        });
        return false;
      }

      // Get admin session
      const adminSession = adminSessions.get(sessionId);
      if (!adminSession) {
        // Clean up orphaned token
        adminTokens.delete(adminToken);
        res.status(401).json({
          error: 'Admin session not found',
          code: 'ADMIN_SESSION_NOT_FOUND'
        });
        return false;
      }

      // Check if session is expired
      if (new Date(adminSession.expiresAt) < new Date()) {
        // Clean up expired session
        adminSessions.delete(sessionId);
        adminTokens.delete(adminToken);
        res.status(401).json({
          error: 'Admin session expired',
          code: 'ADMIN_SESSION_EXPIRED'
        });
        return false;
      }

      // Check required permissions
      if (config.requiredPermissions && config.requiredPermissions.length > 0) {
        const hasAllPermissions = config.requiredPermissions.every(permission =>
          adminSession.adminPermissions.includes(permission)
        );

        if (!hasAllPermissions) {
          res.status(403).json({
            error: 'Insufficient admin permissions',
            code: 'INSUFFICIENT_PERMISSIONS',
            required: config.requiredPermissions,
            current: adminSession.adminPermissions
          });
          return false;
        }
      }

      // Update last accessed time
      adminSession.lastAccessedAt = new Date().toISOString();
      adminSessions.set(sessionId, adminSession);

      // Attach admin session to request
      req.adminSession = adminSession;

      return true;
    } catch (error) {
      console.error('Admin verification error:', error);
      res.status(500).json({
        error: 'Internal server error during admin verification',
        code: 'ADMIN_VERIFICATION_ERROR'
      });
      return false;
    }
  }

  /**
   * Create middleware function for admin routes
   */
  static createMiddleware(config: AdminMiddlewareConfig = {}) {
    return async (
      req: AdminRequest,
      res: VercelResponse,
      next: () => Promise<void> | void
    ): Promise<void> => {
      const isAuthorized = await this.verifyAdmin(req, res, config);
      
      if (isAuthorized) {
        await next();
      }
      // If not authorized, response is already sent by verifyAdmin
    };
  }

  /**
   * Protect admin endpoint with specific permissions, rate limiting, and security checks
   */
  static async protect(
    req: AdminRequest,
    res: VercelResponse,
    requiredPermissions: AdminPermission[],
    handler: (req: AdminRequest, res: VercelResponse) => Promise<void> | void,
    options: {
      rateLimit?: { maxRequests: number; windowMs: number };
      validation?: { [key: string]: string[] };
      sensitiveOperation?: boolean;
    } = {}
  ): Promise<void> {
    try {
      // Apply rate limiting
      if (options.rateLimit) {
        const rateLimitPassed = this.checkRateLimit(
          req, 
          res, 
          options.rateLimit.maxRequests, 
          options.rateLimit.windowMs
        );
        if (!rateLimitPassed) return;
      }

      // Verify admin authentication and permissions
      const isAuthorized = await this.verifyAdmin(req, res, { requiredPermissions });
      if (!isAuthorized) return;

      // Validate input if rules provided
      if (options.validation && req.body) {
        const validation = this.validateInput(req.body, options.validation);
        if (!validation.isValid) {
          res.status(400).json({
            error: 'Invalid input data',
            code: 'VALIDATION_ERROR',
            details: validation.errors
          });
          return;
        }
      }

      // Log sensitive operations
      if (options.sensitiveOperation) {
        await this.logAdminAction(req, 'sensitive_operation_attempted', {
          endpoint: req.url,
          method: req.method,
          permissions: requiredPermissions
        });
      }

      // Execute the handler
      await handler(req, res);

    } catch (error) {
      console.error('Admin endpoint protection error:', error);
      
      // Log security incidents
      await this.logAdminAction(req, 'security_incident', {
        error: error instanceof Error ? error.message : 'Unknown error',
        endpoint: req.url,
        method: req.method
      });

      res.status(500).json({
        error: 'Internal server error',
        code: 'ADMIN_PROTECTION_ERROR'
      });
    }
  }

  /**
   * Log admin action for audit trail
   */
  static async logAdminAction(
    req: AdminRequest,
    action: string,
    details?: any
  ): Promise<void> {
    try {
      const logEntry = {
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        sessionId: req.adminSession?.sessionId,
        userId: req.adminSession?.userId,
        action,
        details: this.sanitizeLogDetails(details),
        ip: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        endpoint: req.url,
        method: req.method,
        severity: this.getActionSeverity(action)
      };

      // Store in memory (in production, use proper audit logging service)
      auditLogs.push(logEntry);
      
      // Keep only last 10000 logs in memory
      if (auditLogs.length > 10000) {
        auditLogs.splice(0, auditLogs.length - 10000);
      }

      // Log to console for immediate visibility
      console.log('Admin action:', JSON.stringify(logEntry));

      // In production, also send to external audit service
      // await this.sendToAuditService(logEntry);
    } catch (error) {
      console.error('Failed to log admin action:', error);
    }
  }

  /**
   * Sanitize sensitive data from log details
   */
  private static sanitizeLogDetails(details: any): any {
    if (!details) return details;
    
    const sanitized = JSON.parse(JSON.stringify(details));
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    
    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;
      
      for (const key in obj) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          obj[key] = sanitizeObject(obj[key]);
        }
      }
      
      return obj;
    };
    
    return sanitizeObject(sanitized);
  }

  /**
   * Determine severity level of admin action
   */
  private static getActionSeverity(action: string): 'low' | 'medium' | 'high' | 'critical' {
    const criticalActions = ['delete_user', 'system_shutdown', 'security_incident'];
    const highActions = ['create_user', 'update_user', 'sensitive_operation_attempted'];
    const mediumActions = ['view_user_details', 'export_data', 'system_config_change'];
    
    if (criticalActions.includes(action)) return 'critical';
    if (highActions.includes(action)) return 'high';
    if (mediumActions.includes(action)) return 'medium';
    return 'low';
  }

  /**
   * Get audit logs (for admin viewing)
   */
  static getAuditLogs(
    limit: number = 100,
    offset: number = 0,
    filters?: {
      userId?: string;
      action?: string;
      severity?: string;
      startDate?: string;
      endDate?: string;
    }
  ): { logs: any[]; total: number } {
    let filteredLogs = [...auditLogs];
    
    // Apply filters
    if (filters) {
      if (filters.userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === filters.userId);
      }
      if (filters.action) {
        filteredLogs = filteredLogs.filter(log => log.action.includes(filters.action!));
      }
      if (filters.severity) {
        filteredLogs = filteredLogs.filter(log => log.severity === filters.severity);
      }
      if (filters.startDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.endDate!);
      }
    }
    
    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    const total = filteredLogs.length;
    const logs = filteredLogs.slice(offset, offset + limit);
    
    return { logs, total };
  }

  /**
   * Security headers middleware
   */
  static setSecurityHeaders(res: VercelResponse): void {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';");
  }

  /**
   * Check for suspicious activity patterns
   */
  static checkSuspiciousActivity(req: AdminRequest): { isSuspicious: boolean; reason?: string } {
    const clientId = req.adminSession?.userId || 
                    req.headers['x-forwarded-for'] as string || 
                    req.headers['x-real-ip'] as string || 
                    'unknown';
    
    const recentLogs = auditLogs
      .filter(log => log.userId === clientId || log.ip === clientId)
      .filter(log => {
        const logTime = new Date(log.timestamp).getTime();
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        return logTime > fiveMinutesAgo;
      });
    
    // Check for too many failed attempts
    const failedAttempts = recentLogs.filter(log => 
      log.action.includes('failed') || log.action.includes('denied')
    ).length;
    
    if (failedAttempts > 5) {
      return { isSuspicious: true, reason: 'Too many failed attempts' };
    }
    
    // Check for rapid requests
    if (recentLogs.length > 50) {
      return { isSuspicious: true, reason: 'Unusually high request rate' };
    }
    
    // Check for privilege escalation attempts
    const escalationAttempts = recentLogs.filter(log => 
      log.action.includes('permission') || log.action.includes('admin')
    ).length;
    
    if (escalationAttempts > 10) {
      return { isSuspicious: true, reason: 'Potential privilege escalation attempt' };
    }
    
    return { isSuspicious: false };
  }

  /**
   * Get current admin session info
   */
  static getAdminInfo(req: AdminRequest): {
    sessionId: string;
    userId: string;
    permissions: AdminPermission[];
  } | null {
    if (!req.adminSession) return null;

    return {
      sessionId: req.adminSession.sessionId,
      userId: req.adminSession.userId,
      permissions: req.adminSession.adminPermissions as AdminPermission[]
    };
  }
}

export default AdminMiddleware;