import { VercelRequest, VercelResponse } from '@vercel/node';
import { getStorage } from './storage';

export type RestrictedEndpoint = 'download' | 'email' | 'export' | 'share' | 'save';

export interface RestrictionConfig {
  endpoint: RestrictedEndpoint;
  requiresAuth: boolean;
  allowedRoles?: string[];
  rateLimits?: {
    maxRequests: number;
    windowMs: number;
  };
}

// Rate limiting storage (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export class RestrictionMiddleware {
  /**
   * Check if user is authenticated and has permission for the action
   */
  static async checkAuthentication(req: VercelRequest): Promise<{
    isAuthenticated: boolean;
    user?: any;
    error?: string;
  }> {
    try {
      const sessionId = req.cookies?.sessionId;
      
      if (!sessionId) {
        return {
          isAuthenticated: false,
          error: 'No session found'
        };
      }

      const storage = getStorage();
      const user = await storage.getUserBySessionId(sessionId);
      
      if (!user) {
        return {
          isAuthenticated: false,
          error: 'Invalid session'
        };
      }

      return {
        isAuthenticated: true,
        user
      };
    } catch (error) {
      console.error('Authentication check failed:', error);
      return {
        isAuthenticated: false,
        error: 'Authentication check failed'
      };
    }
  }

  /**
   * Apply rate limiting for guest users
   */
  static checkRateLimit(
    req: VercelRequest, 
    config: RestrictionConfig
  ): { allowed: boolean; error?: string; retryAfter?: number } {
    if (!config.rateLimits) {
      return { allowed: true };
    }

    const clientId = this.getClientIdentifier(req);
    const now = Date.now();
    const windowMs = config.rateLimits.windowMs;
    const maxRequests = config.rateLimits.maxRequests;

    const key = `${config.endpoint}:${clientId}`;
    const current = rateLimitStore.get(key);

    if (!current || now > current.resetTime) {
      // Reset or initialize the counter
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return { allowed: true };
    }

    if (current.count >= maxRequests) {
      const retryAfter = Math.ceil((current.resetTime - now) / 1000);
      return {
        allowed: false,
        error: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        retryAfter
      };
    }

    // Increment counter
    current.count++;
    rateLimitStore.set(key, current);
    
    return { allowed: true };
  }

  /**
   * Get client identifier for rate limiting
   */
  private static getClientIdentifier(req: VercelRequest): string {
    // Use IP address and User-Agent for guest identification
    const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // Create a simple hash for identification
    return Buffer.from(`${ip}:${userAgent}`).toString('base64').slice(0, 16);
  }

  /**
   * Middleware function to enforce restrictions
   */
  static async enforce(
    req: VercelRequest,
    res: VercelResponse,
    config: RestrictionConfig,
    next: () => Promise<void> | void
  ): Promise<void> {
    try {
      // Check authentication if required
      if (config.requiresAuth) {
        const authResult = await this.checkAuthentication(req);
        
        if (!authResult.isAuthenticated) {
          res.status(401).json({
            error: 'Authentication required',
            action: config.endpoint,
            message: `Sign in required to ${config.endpoint}`,
            details: authResult.error
          });
          return;
        }

        // Attach user to request for downstream use
        (req as any).user = authResult.user;
      }

      // Check rate limits
      const rateLimitResult = this.checkRateLimit(req, config);
      if (!rateLimitResult.allowed) {
        res.status(429).json({
          error: 'Rate limit exceeded',
          message: rateLimitResult.error,
          retryAfter: rateLimitResult.retryAfter
        });
        return;
      }

      // All checks passed, proceed
      await next();
    } catch (error) {
      console.error('Restriction middleware error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to process request'
      });
    }
  }

  /**
   * Create a restriction middleware for specific endpoints
   */
  static createMiddleware(config: RestrictionConfig) {
    return async (req: VercelRequest, res: VercelResponse, next: () => Promise<void> | void) => {
      return this.enforce(req, res, config, next);
    };
  }

  /**
   * Log restricted action attempts for analytics
   */
  static async logRestrictedAttempt(
    req: VercelRequest,
    action: RestrictedEndpoint,
    success: boolean,
    reason?: string
  ): Promise<void> {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        action,
        success,
        reason,
        ip: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        sessionId: req.cookies?.sessionId || null
      };

      // In production, this would go to a proper logging service
      console.log('Restricted action attempt:', JSON.stringify(logEntry));
    } catch (error) {
      console.error('Failed to log restricted attempt:', error);
    }
  }
}

/**
 * Predefined restriction configurations
 */
export const RESTRICTION_CONFIGS: Record<RestrictedEndpoint, RestrictionConfig> = {
  download: {
    endpoint: 'download',
    requiresAuth: true,
    rateLimits: {
      maxRequests: 10, // 10 downloads per hour for authenticated users
      windowMs: 60 * 60 * 1000 // 1 hour
    }
  },
  email: {
    endpoint: 'email',
    requiresAuth: true,
    rateLimits: {
      maxRequests: 5, // 5 emails per hour
      windowMs: 60 * 60 * 1000 // 1 hour
    }
  },
  export: {
    endpoint: 'export',
    requiresAuth: true,
    rateLimits: {
      maxRequests: 20, // 20 exports per hour
      windowMs: 60 * 60 * 1000 // 1 hour
    }
  },
  share: {
    endpoint: 'share',
    requiresAuth: true,
    rateLimits: {
      maxRequests: 10, // 10 shares per hour
      windowMs: 60 * 60 * 1000 // 1 hour
    }
  },
  save: {
    endpoint: 'save',
    requiresAuth: false, // Allow guest saves to localStorage
    rateLimits: {
      maxRequests: 100, // 100 saves per hour (generous for auto-save)
      windowMs: 60 * 60 * 1000 // 1 hour
    }
  }
};

export default RestrictionMiddleware;