// Standalone storage module for Vercel API functions
// This will work with actual databases in production

interface User {
  id: string;
  googleId: string;
  email: string;
  name: string;
  picture: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
  isActive: boolean;
  preferences: {
    emailNotifications: boolean;
    defaultExportFormat: 'docx' | 'pdf';
    theme: 'light' | 'dark';
  };
}

interface UserSession {
  sessionId: string;
  userId: string;
  expiresAt: string;
  isActive: boolean;
  lastAccessedAt: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

interface DownloadRecord {
  id: string;
  userId: string;
  documentId: string;
  documentTitle: string;
  fileFormat: 'docx' | 'pdf';
  fileSize: number;
  downloadedAt: string;
  ipAddress: string;
  userAgent: string;
  status: 'pending' | 'completed' | 'failed' | 'expired';
  emailSent: boolean;
  emailSentAt?: string;
  emailError?: string;
  documentMetadata: {
    pageCount: number;
    wordCount: number;
    sectionCount: number;
    figureCount: number;
    referenceCount: number;
    generationTime: number;
  };
}

interface PaginatedDownloads {
  downloads: DownloadRecord[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// In-memory storage for development (replace with database in production)
class MemoryStorage {
  private users = new Map<string, User>();
  private sessions = new Map<string, UserSession>();
  private downloads = new Map<string, DownloadRecord>();
  private userIdCounter = 1;
  private downloadIdCounter = 1;

  // User operations
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const id = `user_${this.userIdCounter++}`;
    const now = new Date().toISOString();
    const user: User = {
      id,
      ...userData,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(id, user);
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.googleId === googleId) {
        return user;
      }
    }
    return undefined;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates, updatedAt: new Date().toISOString() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Session operations
  async createSession(sessionData: Omit<UserSession, 'sessionId' | 'createdAt'>): Promise<UserSession> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session: UserSession = {
      sessionId,
      ...sessionData,
      createdAt: new Date().toISOString(),
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  async getSession(sessionId: string): Promise<UserSession | undefined> {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    
    // Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
      this.sessions.delete(sessionId);
      return undefined;
    }
    
    return session;
  }

  async updateSessionAccess(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastAccessedAt = new Date().toISOString();
      this.sessions.set(sessionId, session);
    }
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    return this.sessions.delete(sessionId);
  }

  // Download operations
  async recordDownload(downloadData: Omit<DownloadRecord, 'id'>): Promise<DownloadRecord> {
    const id = `download_${this.downloadIdCounter++}`;
    const download: DownloadRecord = {
      id,
      ...downloadData,
    };
    this.downloads.set(id, download);
    return download;
  }

  async getUserDownloads(userId: string, options?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedDownloads> {
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const sortOrder = options?.sortOrder || 'desc';

    // Get all downloads for user
    const userDownloads = Array.from(this.downloads.values())
      .filter(download => download.userId === userId);

    // Sort by downloadedAt
    userDownloads.sort((a, b) => {
      const dateA = new Date(a.downloadedAt).getTime();
      const dateB = new Date(b.downloadedAt).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    // Paginate
    const totalItems = userDownloads.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const downloads = userDownloads.slice(startIndex, endIndex);

    return {
      downloads,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async getDownloadById(id: string): Promise<DownloadRecord | undefined> {
    return this.downloads.get(id);
  }
}

// Export singleton instance
export const storage = new MemoryStorage();

// Export types
export type { User, UserSession, DownloadRecord, PaginatedDownloads };