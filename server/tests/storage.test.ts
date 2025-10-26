import { describe, it, expect, beforeEach } from '@jest/globals';
import { MemStorage } from '../storage';
import { User, DownloadRecord, UserSession } from '@shared/schema';

describe('MemStorage', () => {
  let storage: MemStorage;

  beforeEach(() => {
    storage = new MemStorage();
  });

  describe('User Operations', () => {
    const mockUserData = {
      googleId: 'google123',
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg',
      lastLoginAt: new Date().toISOString(),
      isActive: true,
      preferences: {
        emailNotifications: true,
        defaultExportFormat: 'pdf' as const,
        theme: 'light' as const
      }
    };

    it('should create a new user', async () => {
      const user = await storage.createUser(mockUserData);

      expect(user).toMatchObject({
        ...mockUserData,
        id: expect.stringMatching(/^user_\d+$/),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        lastLoginAt: expect.any(String),
        isActive: true
      });
    });

    it('should retrieve user by ID', async () => {
      const createdUser = await storage.createUser(mockUserData);
      const retrievedUser = await storage.getUserById(createdUser.id);

      expect(retrievedUser).toEqual(createdUser);
    });

    it('should retrieve user by email', async () => {
      const createdUser = await storage.createUser(mockUserData);
      const retrievedUser = await storage.getUserByEmail(mockUserData.email);

      expect(retrievedUser).toEqual(createdUser);
    });

    it('should retrieve user by Google ID', async () => {
      const createdUser = await storage.createUser(mockUserData);
      const retrievedUser = await storage.getUserByGoogleId(mockUserData.googleId);

      expect(retrievedUser).toEqual(createdUser);
    });

    it('should update user', async () => {
      const createdUser = await storage.createUser(mockUserData);
      const updates = { name: 'Updated Name' };
      
      const updatedUser = await storage.updateUser(createdUser.id, updates);

      expect(updatedUser).toMatchObject({
        ...createdUser,
        name: 'Updated Name',
        updatedAt: expect.any(String)
      });
      expect(updatedUser!.updatedAt).not.toBe(createdUser.updatedAt);
    });

    it('should delete user and associated data', async () => {
      const user = await storage.createUser(mockUserData);
      
      // Create associated session and download
      await storage.createSession({
        userId: user.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
        lastAccessedAt: new Date().toISOString(),
        ipAddress: '127.0.0.1',
        userAgent: 'test'
      });

      await storage.recordDownload({
        userId: user.id,
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

      const deleted = await storage.deleteUser(user.id);
      expect(deleted).toBe(true);

      // Verify user and associated data are deleted
      expect(await storage.getUserById(user.id)).toBeUndefined();
      
      const userDownloads = await storage.getUserDownloads(user.id);
      expect(userDownloads.downloads).toHaveLength(0);
    });
  });

  describe('Download Operations', () => {
    let user: User;

    beforeEach(async () => {
      user = await storage.createUser({
        googleId: 'google123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg',
        preferences: {
          emailNotifications: true,
          defaultExportFormat: 'pdf',
          theme: 'light'
        }
      });
    });

    const mockDownloadData = {
      documentId: 'doc123',
      documentTitle: 'Test Document',
      fileFormat: 'pdf' as const,
      fileSize: 1024,
      downloadedAt: new Date().toISOString(),
      ipAddress: '127.0.0.1',
      userAgent: 'test',
      status: 'completed' as const,
      emailSent: false,
      documentMetadata: {
        pageCount: 1,
        wordCount: 100,
        sectionCount: 1,
        figureCount: 0,
        referenceCount: 0,
        generationTime: 1000
      }
    };

    it('should record a download', async () => {
      const download = await storage.recordDownload({
        ...mockDownloadData,
        userId: user.id
      });

      expect(download).toMatchObject({
        ...mockDownloadData,
        userId: user.id,
        id: expect.stringMatching(/^download_\d+$/)
      });
    });

    it('should retrieve user downloads with pagination', async () => {
      // Create multiple downloads
      for (let i = 0; i < 15; i++) {
        await storage.recordDownload({
          ...mockDownloadData,
          userId: user.id,
          documentTitle: `Document ${i}`
        });
      }

      const page1 = await storage.getUserDownloads(user.id, { page: 1, limit: 10 });
      expect(page1.downloads).toHaveLength(10);
      expect(page1.pagination.currentPage).toBe(1);
      expect(page1.pagination.totalPages).toBe(2);
      expect(page1.pagination.totalItems).toBe(15);
      expect(page1.pagination.hasNext).toBe(true);
      expect(page1.pagination.hasPrev).toBe(false);

      const page2 = await storage.getUserDownloads(user.id, { page: 2, limit: 10 });
      expect(page2.downloads).toHaveLength(5);
      expect(page2.pagination.currentPage).toBe(2);
      expect(page2.pagination.hasNext).toBe(false);
      expect(page2.pagination.hasPrev).toBe(true);
    });

    it('should update download status', async () => {
      const download = await storage.recordDownload({
        ...mockDownloadData,
        userId: user.id,
        status: 'pending'
      });

      await storage.updateDownloadStatus(download.id, 'completed', true);

      const updatedDownload = await storage.getDownloadById(download.id);
      expect(updatedDownload).toMatchObject({
        ...download,
        status: 'completed',
        emailSent: true,
        emailSentAt: expect.any(String)
      });
    });
  });

  describe('Session Operations', () => {
    let user: User;

    beforeEach(async () => {
      user = await storage.createUser({
        googleId: 'google123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg',
        preferences: {
          emailNotifications: true,
          defaultExportFormat: 'pdf',
          theme: 'light'
        }
      });
    });

    it('should create a session', async () => {
      const sessionData = {
        userId: user.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
        lastAccessedAt: new Date().toISOString(),
        ipAddress: '127.0.0.1',
        userAgent: 'test'
      };

      const session = await storage.createSession(sessionData);

      expect(session).toMatchObject({
        ...sessionData,
        sessionId: expect.stringMatching(/^session_\d+_[a-z0-9]+$/),
        createdAt: expect.any(String),
        lastAccessedAt: expect.any(String)
      });
    });

    it('should retrieve active session', async () => {
      const session = await storage.createSession({
        userId: user.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
        lastAccessedAt: new Date().toISOString(),
        ipAddress: '127.0.0.1',
        userAgent: 'test'
      });

      const retrievedSession = await storage.getSession(session.sessionId);
      expect(retrievedSession).toEqual(session);
    });

    it('should not retrieve expired session', async () => {
      const session = await storage.createSession({
        userId: user.id,
        expiresAt: new Date(Date.now() - 1000).toISOString(), // Expired
        isActive: true,
        lastAccessedAt: new Date().toISOString(),
        ipAddress: '127.0.0.1',
        userAgent: 'test'
      });

      const retrievedSession = await storage.getSession(session.sessionId);
      expect(retrievedSession).toBeUndefined();
    });

    it('should update session access time', async () => {
      const session = await storage.createSession({
        userId: user.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
        lastAccessedAt: new Date().toISOString(),
        ipAddress: '127.0.0.1',
        userAgent: 'test'
      });

      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      await storage.updateSessionAccess(session.sessionId);

      const updatedSession = await storage.getSession(session.sessionId);
      expect(updatedSession!.lastAccessedAt).not.toBe(session.lastAccessedAt);
    });

    it('should delete session', async () => {
      const session = await storage.createSession({
        userId: user.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
        lastAccessedAt: new Date().toISOString(),
        ipAddress: '127.0.0.1',
        userAgent: 'test'
      });

      const deleted = await storage.deleteSession(session.sessionId);
      expect(deleted).toBe(true);

      const retrievedSession = await storage.getSession(session.sessionId);
      expect(retrievedSession).toBeUndefined();
    });
  });
});