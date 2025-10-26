import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { User } from '@shared/schema';

// Extend Express Request to include user
export interface AuthenticatedRequest extends Request {
  user?: User;
  sessionId?: string;
}

// Extract user from session token in Authorization header or cookie
export async function extractUser(req: AuthenticatedRequest): Promise<User | null> {
  try {
    // Try to get session ID from Authorization header first
    let sessionId = req.headers.authorization?.replace('Bearer ', '');
    
    // If not in header, try cookie
    if (!sessionId && req.cookies?.sessionId) {
      sessionId = req.cookies.sessionId;
    }

    if (!sessionId) {
      return null;
    }

    // Get session from storage
    const session = await storage.getSession(sessionId);
    if (!session || !session.isActive) {
      return null;
    }

    // Update last accessed time
    await storage.updateSessionAccess(sessionId);

    // Get user from storage
    const user = await storage.getUserById(session.userId);
    if (!user || !user.isActive) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Error extracting user:', error);
    return null;
  }
}

// Middleware that requires authentication
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = await extractUser(req);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required to access this resource'
        }
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Internal authentication error'
      }
    });
  }
}

// Middleware that optionally extracts user (doesn't require auth)
export async function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = await extractUser(req);
    req.user = user || undefined;
    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    // Continue without user on error
    req.user = undefined;
    next();
  }
}

// Helper function to get client IP address
export function getClientIP(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         '127.0.0.1';
}

// Helper function to get user agent
export function getUserAgent(req: Request): string {
  return req.headers['user-agent'] || 'Unknown';
}