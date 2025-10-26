import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { registerRoutes } from '../../routes';
import { storage } from '../../storage';

describe('Authentication Flow Integration', () => {
  let app: express.Application;
  let server: any;

  beforeEach(async () => {
    app = express();
    app.use(cookieParser());
    app.use(express.json());
    
    server = await registerRoutes(app);
  });

  afterEach(() => {
    if (server && server.close) {
      server.close();
    }
  });

  describe('Google OAuth Flow', () => {
    const mockGoogleUserData = {
      googleId: 'google123',
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg',
      preferences: {
        emailNotifications: true,
        defaultExportFormat: 'pdf',
        theme: 'light'
      }
    };

    it('should create new user on first Google auth', async () => {
      const response = await request(app)
        .post('/api/auth/google')
        .send(mockGoogleUserData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        user: {
          googleId: mockGoogleUserData.googleId,
          email: mockGoogleUserData.email,
          name: mockGoogleUserData.name,
          picture: mockGoogleUserData.picture,
          isActive: true
        },
        sessionId: expect.any(String)
      });

      // Verify user was created in storage
      const user = await storage.getUserByGoogleId(mockGoogleUserData.googleId);
      expect(user).toBeTruthy();
      expect(user!.email).toBe(mockGoogleUserData.email);
    });

    it('should update existing user on subsequent Google auth', async () => {
      // First auth - create user
      const firstResponse = await request(app)
        .post('/api/auth/google')
        .send(mockGoogleUserData)
        .expect(200);

      const userId = firstResponse.body.user.id;
      const originalLastLogin = firstResponse.body.user.lastLoginAt;

      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      // Second auth - should update existing user
      const updatedUserData = {
        ...mockGoogleUserData,
        name: 'Updated Test User'
      };

      const secondResponse = await request(app)
        .post('/api/auth/google')
        .send(updatedUserData)
        .expect(200);

      expect(secondResponse.body.user.id).toBe(userId);
      expect(secondResponse.body.user.name).toBe('Updated Test User');
      expect(secondResponse.body.user.lastLoginAt).not.toBe(originalLastLogin);
    });

    it('should return error for missing required data', async () => {
      const incompleteData = {
        email: 'test@example.com'
        // Missing googleId and name
      };

      const response = await request(app)
        .post('/api/auth/google')
        .send(incompleteData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_USER_DATA',
          message: 'Missing required user data from Google OAuth'
        }
      });
    });
  });

  describe('Protected Routes', () => {
    let sessionId: string;
    let userId: string;

    beforeEach(async () => {
      // Create user and session
      const authResponse = await request(app)
        .post('/api/auth/google')
        .send({
          googleId: 'google123',
          email: 'test@example.com',
          name: 'Test User',
          picture: 'https://example.com/avatar.jpg'
        });

      sessionId = authResponse.body.sessionId;
      userId = authResponse.body.user.id;
    });

    it('should allow access to protected route with valid session', async () => {
      const response = await request(app)
        .get('/api/downloads/history')
        .set('Authorization', `Bearer ${sessionId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('downloads');
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('should deny access to protected route without session', async () => {
      const response = await request(app)
        .get('/api/downloads/history')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required to access this resource'
        }
      });
    });

    it('should deny access with invalid session', async () => {
      const response = await request(app)
        .get('/api/downloads/history')
        .set('Authorization', 'Bearer invalid_session')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED'
        }
      });
    });
  });

  describe('Sign-out Flow', () => {
    let sessionId: string;

    beforeEach(async () => {
      const authResponse = await request(app)
        .post('/api/auth/google')
        .send({
          googleId: 'google123',
          email: 'test@example.com',
          name: 'Test User',
          picture: 'https://example.com/avatar.jpg'
        });

      sessionId = authResponse.body.sessionId;
    });

    it('should successfully sign out user', async () => {
      const response = await request(app)
        .post('/api/auth/signout')
        .set('Authorization', `Bearer ${sessionId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Successfully signed out'
      });

      // Verify session is deleted
      const session = await storage.getSession(sessionId);
      expect(session).toBeUndefined();
    });

    it('should handle sign-out with cookie-based session', async () => {
      const response = await request(app)
        .post('/api/auth/signout')
        .set('Cookie', `sessionId=${sessionId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Download Tracking Integration', () => {
    let sessionId: string;
    let userId: string;

    beforeEach(async () => {
      const authResponse = await request(app)
        .post('/api/auth/google')
        .send({
          googleId: 'google123',
          email: 'test@example.com',
          name: 'Test User',
          picture: 'https://example.com/avatar.jpg'
        });

      sessionId = authResponse.body.sessionId;
      userId = authResponse.body.user.id;
    });

    it('should track downloads for authenticated users', async () => {
      // Create a download record
      await storage.recordDownload({
        userId,
        documentId: 'doc123',
        documentTitle: 'Test Document',
        fileFormat: 'pdf',
        fileSize: 1024,
        downloadedAt: new Date().toISOString(),
        ipAddress: '127.0.0.1',
        userAgent: 'test',
        status: 'completed',
        emailSent: false,
        documentMetadata: {
          pageCount: 1,
          wordCount: 100,
          sectionCount: 1,
          figureCount: 0,
          referenceCount: 0,
          generationTime: 1000
        }
      });

      const response = await request(app)
        .get('/api/downloads/history')
        .set('Authorization', `Bearer ${sessionId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.downloads).toHaveLength(1);
      expect(response.body.data.downloads[0]).toMatchObject({
        documentTitle: 'Test Document',
        fileFormat: 'pdf',
        status: 'completed'
      });
    });

    it('should only return downloads for the authenticated user', async () => {
      // Create another user
      const otherAuthResponse = await request(app)
        .post('/api/auth/google')
        .send({
          googleId: 'google456',
          email: 'other@example.com',
          name: 'Other User',
          picture: 'https://example.com/other.jpg'
        });

      const otherUserId = otherAuthResponse.body.user.id;

      // Create downloads for both users
      await storage.recordDownload({
        userId,
        documentId: 'doc123',
        documentTitle: 'User 1 Document',
        fileFormat: 'pdf',
        fileSize: 1024,
        downloadedAt: new Date().toISOString(),
        ipAddress: '127.0.0.1',
        userAgent: 'test',
        status: 'completed',
        emailSent: false,
        documentMetadata: {
          pageCount: 1,
          wordCount: 100,
          sectionCount: 1,
          figureCount: 0,
          referenceCount: 0,
          generationTime: 1000
        }
      });

      await storage.recordDownload({
        userId: otherUserId,
        documentId: 'doc456',
        documentTitle: 'User 2 Document',
        fileFormat: 'docx',
        fileSize: 2048,
        downloadedAt: new Date().toISOString(),
        ipAddress: '127.0.0.1',
        userAgent: 'test',
        status: 'completed',
        emailSent: false,
        documentMetadata: {
          pageCount: 2,
          wordCount: 200,
          sectionCount: 2,
          figureCount: 1,
          referenceCount: 5,
          generationTime: 2000
        }
      });

      // User 1 should only see their own downloads
      const response = await request(app)
        .get('/api/downloads/history')
        .set('Authorization', `Bearer ${sessionId}`)
        .expect(200);

      expect(response.body.data.downloads).toHaveLength(1);
      expect(response.body.data.downloads[0].documentTitle).toBe('User 1 Document');
    });
  });
});