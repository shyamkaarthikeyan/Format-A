import { 
  type Document, 
  type InsertDocument, 
  type UpdateDocument,
  type User,
  type UserPreferences,
  type DownloadRecord,
  type UserSession,
  type PaginationOptions,
  type PaginatedDownloads,
  type DownloadStatus
} from "@shared/schema";

// Extended document interface for server-side storage
interface ServerDocument extends Document {
  createdAt?: string;
  updatedAt?: string;
  receivedDate?: string | null;
  revisedDate?: string | null;
  acceptedDate?: string | null;
  funding?: string | null;
  acknowledgments?: string | null;
  doi?: string | null;
}

export interface IStorage {
  // Document operations
  getDocument(id: string): Promise<ServerDocument | undefined>;
  getAllDocuments(): Promise<ServerDocument[]>;
  createDocument(document: InsertDocument): Promise<ServerDocument>;
  updateDocument(id: string, document: UpdateDocument): Promise<ServerDocument | undefined>;
  deleteDocument(id: string): Promise<boolean>;
  
  // User operations
  createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  
  // Download tracking operations
  recordDownload(download: Omit<DownloadRecord, 'id'>): Promise<DownloadRecord>;
  getUserDownloads(userId: string, pagination?: PaginationOptions): Promise<PaginatedDownloads>;
  getDownloadById(id: string): Promise<DownloadRecord | undefined>;
  updateDownloadStatus(id: string, status: DownloadStatus, emailSent?: boolean, emailError?: string): Promise<void>;
  deleteUserDownloads(userId: string): Promise<boolean>;
  
  // Session operations
  createSession(session: Omit<UserSession, 'sessionId' | 'createdAt'>): Promise<UserSession>;
  getSession(sessionId: string): Promise<UserSession | undefined>;
  updateSessionAccess(sessionId: string): Promise<void>;
  deleteSession(sessionId: string): Promise<boolean>;
  deleteUserSessions(userId: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private documents: Map<string, ServerDocument>;
  private users: Map<string, User>;
  private downloads: Map<string, DownloadRecord>;
  private sessions: Map<string, UserSession>;
  private currentId: number;
  private currentUserId: number;
  private currentDownloadId: number;

  constructor() {
    this.documents = new Map();
    this.users = new Map();
    this.downloads = new Map();
    this.sessions = new Map();
    this.currentId = 1;
    this.currentUserId = 1;
    this.currentDownloadId = 1;
  }

  async getDocument(id: string): Promise<ServerDocument | undefined> {
    return this.documents.get(id);
  }

  async getAllDocuments(): Promise<ServerDocument[]> {
    return Array.from(this.documents.values()).sort((a, b) => 
      new Date(b.updatedAt || new Date()).getTime() - new Date(a.updatedAt || new Date()).getTime()
    );
  }

  async createDocument(insertDocument: InsertDocument): Promise<ServerDocument> {
    const id = `doc_${this.currentId++}`;
    const now = new Date().toISOString();
    const document: ServerDocument = { 
      id,
      title: insertDocument.title || "",
      abstract: insertDocument.abstract || null,
      keywords: insertDocument.keywords || null,
      authors: insertDocument.authors || [],
      sections: insertDocument.sections || [],
      references: insertDocument.references || [],
      figures: insertDocument.figures || [],
      settings: insertDocument.settings || {
        fontSize: "9.5pt",
        columns: "2",
        exportFormat: "docx",
        includePageNumbers: true,
        includeCopyright: true
      },
      // Server-specific fields
      createdAt: now,
      updatedAt: now,
      receivedDate: null,
      revisedDate: null,
      acceptedDate: null,
      funding: null,
      acknowledgments: null,
      doi: null
    };
    this.documents.set(id, document);
    return document;
  }

  async updateDocument(id: string, updateDocument: UpdateDocument): Promise<ServerDocument | undefined> {
    const existing = this.documents.get(id);
    if (!existing) return undefined;

    const updated: ServerDocument = {
      ...existing,
      ...updateDocument,
      updatedAt: new Date().toISOString()
    };
    this.documents.set(id, updated);
    return updated;
  }

  async deleteDocument(id: string): Promise<boolean> {
    return this.documents.delete(id);
  }

  // User operations
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const id = `user_${this.currentUserId++}`;
    const now = new Date().toISOString();
    const user: User = {
      id,
      ...userData,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
      isActive: true,
      preferences: userData.preferences || {
        emailNotifications: true,
        defaultExportFormat: 'pdf',
        theme: 'light'
      }
    };
    this.users.set(id, user);
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.googleId === googleId);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const existing = this.users.get(id);
    if (!existing) return undefined;

    const updated: User = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.users.set(id, updated);
    return updated;
  }

  async deleteUser(id: string): Promise<boolean> {
    // Also delete user's downloads and sessions
    await this.deleteUserDownloads(id);
    await this.deleteUserSessions(id);
    return this.users.delete(id);
  }

  // Download tracking operations
  async recordDownload(download: Omit<DownloadRecord, 'id'>): Promise<DownloadRecord> {
    const id = `download_${this.currentDownloadId++}`;
    const downloadRecord: DownloadRecord = {
      id,
      ...download
    };
    this.downloads.set(id, downloadRecord);
    return downloadRecord;
  }

  async getUserDownloads(userId: string, pagination?: PaginationOptions): Promise<PaginatedDownloads> {
    const userDownloads = Array.from(this.downloads.values())
      .filter(download => download.userId === userId)
      .sort((a, b) => new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime());

    if (!pagination) {
      return {
        downloads: userDownloads,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: userDownloads.length,
          hasNext: false,
          hasPrev: false
        }
      };
    }

    const { page = 1, limit = 10 } = pagination;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedDownloads = userDownloads.slice(startIndex, endIndex);
    const totalPages = Math.ceil(userDownloads.length / limit);

    return {
      downloads: paginatedDownloads,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: userDownloads.length,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  async getDownloadById(id: string): Promise<DownloadRecord | undefined> {
    return this.downloads.get(id);
  }

  async updateDownloadStatus(id: string, status: DownloadStatus, emailSent?: boolean, emailError?: string): Promise<void> {
    const download = this.downloads.get(id);
    if (!download) return;

    const updated: DownloadRecord = {
      ...download,
      status,
      emailSent: emailSent ?? download.emailSent,
      emailSentAt: emailSent ? new Date().toISOString() : download.emailSentAt,
      emailError: emailError ?? download.emailError
    };
    this.downloads.set(id, updated);
  }

  async deleteUserDownloads(userId: string): Promise<boolean> {
    const userDownloads = Array.from(this.downloads.entries())
      .filter(([_, download]) => download.userId === userId);
    
    userDownloads.forEach(([id, _]) => {
      this.downloads.delete(id);
    });
    
    return true;
  }

  // Session operations
  async createSession(session: Omit<UserSession, 'sessionId' | 'createdAt'>): Promise<UserSession> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const userSession: UserSession = {
      sessionId,
      createdAt: now,
      ...session,
      lastAccessedAt: now
    };
    this.sessions.set(sessionId, userSession);
    return userSession;
  }

  async getSession(sessionId: string): Promise<UserSession | undefined> {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    // Check if session is expired
    if (new Date() > new Date(session.expiresAt)) {
      this.sessions.delete(sessionId);
      return undefined;
    }

    return session;
  }

  async updateSessionAccess(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const updated: UserSession = {
      ...session,
      lastAccessedAt: new Date().toISOString()
    };
    this.sessions.set(sessionId, updated);
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    return this.sessions.delete(sessionId);
  }

  async deleteUserSessions(userId: string): Promise<boolean> {
    const userSessions = Array.from(this.sessions.entries())
      .filter(([_, session]) => session.userId === userId);
    
    userSessions.forEach(([sessionId, _]) => {
      this.sessions.delete(sessionId);
    });
    
    return true;
  }
}

export const storage = new MemStorage();
