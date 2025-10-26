import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { requireAuth, optionalAuth, extractUser, getClientIP, getUserAgent } from '../middleware/auth';
import { storage } from '../storage';
import { User } from '@shared/schema';

// Mock the storage module
jest.mock('../storage');

describe('Authentication Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockUser: User;

  beforeEach(() => {
    mockReq = {
      headers: {},
      cookies: {},
      connection: { remoteAddress: '127.0.0.1' }
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();

    mockUser = {
      id: 'user_1',
      googleId: 'google123',
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      isActive: true,
      preferences: {
        emailNotifications: true,
        defaultExportFormat: 'pdf',
        theme: 'light'
      }
    };

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('extractUser', () => {
    it('should extract user from Authorization header', async () => {
      const sessionId = 'session123';
      mockReq.headers = { authorization: `Bearer ${sessionId}` };

      const mockSession = {
        sessionId,
        userId: mockUser.id,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
        lastAccessedAt: new Date().toISOString(),
        ipAddress: '127.0.0.1',
        userAgent: 'test'
      };

      (storage.getSession as jest.Mock).mockResolvedValue(mockSession);
      (storage.getUserById as jest.Mock).mockResolvedValue(mockUser);
      (storage.updateSessionAccess as jest.Mock).mockResolvedValue(undefined);

      const user = await extractUser(mockReq as any);

      expect(user).toEqual(mockUser);
      expect(storage.getSession).toHaveBeenCalledWith(sessionId);
      expect(storage.getUserById).toHaveBeenCalledWith(mockUser.id);
      expect(storage.updateSessionAccess).toHaveBeenCalledWith(sessionId);
    });

    it('should extract user from cookie', async () => {
      const sessionId = 'session123';
      mockReq.cookies = { sessionId };

      const mockSession = {
        sessionId,
        userId: mockUser.id,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
        lastAccessedAt: new Date().toISOString(),
        ipAddress: '127.0.0.1',
        userAgent: 'test'
      };

      (storage.getSession as jest.Mock).mockResolvedValue(mockSession);
      (storage.getUserById as jest.Mock).mockResolvedValue(mockUser);
      (storage.updateSessionAccess as jest.Mock).mockResolvedValue(undefined);

      const user = await extractUser(mockReq as any);

      expect(user).toEqual(mockUser);
    });

    it('should return null for invalid session', async () => {
      mockReq.headers = { authorization: 'Bearer invalid_session' };
      (storage.getSession as jest.Mock).mockResolvedValue(null);

      const user = await extractUser(mockReq as any);

      expect(user).toBeNull();
    });

    it('should return null for inactive user', async () => {
      const sessionId = 'session123';
      mockReq.headers = { authorization: `Bearer ${sessionId}` };

      const mockSession = {
        sessionId,
        userId: mockUser.id,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
        lastAccessedAt: new Date().toISOString(),
        ipAddress: '127.0.0.1',
        userAgent: 'test'
      };

      const inactiveUser = { ...mockUser, isActive: false };

      (storage.getSession as jest.Mock).mockResolvedValue(mockSession);
      (storage.getUserById as jest.Mock).mockResolvedValue(inactiveUser);

      const user = await extractUser(mockReq as any);

      expect(user).toBeNull();
    });
  });

  describe('requireAuth', () => {
    it('should call next() for authenticated user', async () => {
      const sessionId = 'session123';
      mockReq.headers = { authorization: `Bearer ${sessionId}` };

      const mockSession = {
        sessionId,
        userId: mockUser.id,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
        lastAccessedAt: new Date().toISOString(),
        ipAddress: '127.0.0.1',
        userAgent: 'test'
      };

      (storage.getSession as jest.Mock).mockResolvedValue(mockSession);
      (storage.getUserById as jest.Mock).mockResolvedValue(mockUser);
      (storage.updateSessionAccess as jest.Mock).mockResolvedValue(undefined);

      await requireAuth(mockReq as any, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq as any).user).toEqual(mockUser);
    });

    it('should return 401 for unauthenticated user', async () => {
      mockReq.headers = {};
      mockReq.cookies = {};

      await requireAuth(mockReq as any, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required to access this resource'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should attach user if authenticated', async () => {
      const sessionId = 'session123';
      mockReq.headers = { authorization: `Bearer ${sessionId}` };

      const mockSession = {
        sessionId,
        userId: mockUser.id,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
        lastAccessedAt: new Date().toISOString(),
        ipAddress: '127.0.0.1',
        userAgent: 'test'
      };

      (storage.getSession as jest.Mock).mockResolvedValue(mockSession);
      (storage.getUserById as jest.Mock).mockResolvedValue(mockUser);
      (storage.updateSessionAccess as jest.Mock).mockResolvedValue(undefined);

      await optionalAuth(mockReq as any, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq as any).user).toEqual(mockUser);
    });

    it('should call next() even if not authenticated', async () => {
      mockReq.headers = {};
      mockReq.cookies = {};

      await optionalAuth(mockReq as any, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq as any).user).toBeUndefined();
    });
  });

  describe('Helper Functions', () => {
    it('should get client IP from x-forwarded-for header', () => {
      mockReq.headers = { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' };
      
      const ip = getClientIP(mockReq as Request);
      
      expect(ip).toBe('192.168.1.1');
    });

    it('should get client IP from connection', () => {
      mockReq.connection = { remoteAddress: '127.0.0.1' };
      
      const ip = getClientIP(mockReq as Request);
      
      expect(ip).toBe('127.0.0.1');
    });

    it('should get user agent from headers', () => {
      mockReq.headers = { 'user-agent': 'Mozilla/5.0 Test Browser' };
      
      const userAgent = getUserAgent(mockReq as Request);
      
      expect(userAgent).toBe('Mozilla/5.0 Test Browser');
    });

    it('should return default user agent if not provided', () => {
      mockReq.headers = {};
      
      const userAgent = getUserAgent(mockReq as Request);
      
      expect(userAgent).toBe('Unknown');
    });
  });
});