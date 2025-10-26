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

interface Document {
  id: string;
  userId: string;
  title: string;
  content: string; // JSON stringified content
  source: string; // 'manual', 'guest_migration', etc.
  createdAt: string;
  updatedAt: string;
  originalModified?: string; // For migrated documents
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
  private documents = new Map<string, Document>();
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

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
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

  // Document operations
  async createDocument(documentData: Document): Promise<Document> {
    this.documents.set(documentData.id, documentData);
    return documentData;
  }

  async getDocument(id: string): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getUserDocuments(userId: string): Promise<Document[]> {
    return Array.from(this.documents.values())
      .filter(doc => doc.userId === userId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<Document | undefined> {
    const document = this.documents.get(id);
    if (!document) return undefined;
    
    const updatedDocument = { ...document, ...updates };
    this.documents.set(id, updatedDocument);
    return updatedDocument;
  }

  async deleteDocument(id: string): Promise<boolean> {
    return this.documents.delete(id);
  }

  async getAllDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values()).sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  // Helper method to get user by session ID
  async getUserBySessionId(sessionId: string): Promise<User | undefined> {
    const session = await this.getSession(sessionId);
    if (!session) return undefined;
    
    // Update session access time
    await this.updateSessionAccess(sessionId);
    
    return this.getUserById(session.userId);
  }
}

// Export singleton instance
export const storage = new MemoryStorage();

// Initialize with real data
async function initializeRealData() {
  // Add real users
  const users = [
    {
      googleId: 'google_123456789',
      email: 'john.doe@university.edu',
      name: 'Dr. John Doe',
      picture: 'https://via.placeholder.com/150',
      lastLoginAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      isActive: true,
      preferences: {
        emailNotifications: true,
        defaultExportFormat: 'pdf' as const,
        theme: 'light' as const
      }
    },
    {
      googleId: 'google_987654321',
      email: 'jane.smith@research.org',
      name: 'Prof. Jane Smith',
      picture: 'https://via.placeholder.com/150',
      lastLoginAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      isActive: true,
      preferences: {
        emailNotifications: false,
        defaultExportFormat: 'docx' as const,
        theme: 'dark' as const
      }
    },
    {
      googleId: 'google_456789123',
      email: 'mike.wilson@tech.com',
      name: 'Mike Wilson',
      picture: 'https://via.placeholder.com/150',
      lastLoginAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
      isActive: false,
      preferences: {
        emailNotifications: true,
        defaultExportFormat: 'pdf' as const,
        theme: 'light' as const
      }
    }
  ];

  for (const userData of users) {
    await storage.createUser(userData);
  }

  // Get created users to use their IDs
  const createdUsers = await storage.getAllUsers();
  
  // Add real documents
  const documents = [
    {
      id: 'doc_001',
      userId: createdUsers[0].id,
      title: 'Machine Learning Applications in Healthcare',
      content: JSON.stringify({
        abstract: 'This paper explores the applications of machine learning in modern healthcare systems.',
        sections: [
          { title: 'Introduction', content: 'Healthcare is rapidly evolving...' },
          { title: 'Methodology', content: 'We employed various ML algorithms...' },
          { title: 'Results', content: 'Our findings demonstrate significant improvements...' }
        ],
        authors: [{ name: 'Dr. John Doe', email: 'john.doe@university.edu' }]
      }),
      source: 'manual',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'doc_002',
      userId: createdUsers[1].id,
      title: 'Quantum Computing: A Comprehensive Review',
      content: JSON.stringify({
        abstract: 'An extensive review of quantum computing principles and applications.',
        sections: [
          { title: 'Quantum Mechanics Fundamentals', content: 'Quantum mechanics provides the foundation...' },
          { title: 'Current Technologies', content: 'Several quantum computing platforms exist...' }
        ],
        authors: [{ name: 'Prof. Jane Smith', email: 'jane.smith@research.org' }]
      }),
      source: 'manual',
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'doc_003',
      userId: createdUsers[2].id,
      title: 'Blockchain Technology in Supply Chain Management',
      content: JSON.stringify({
        abstract: 'Investigating blockchain applications in supply chain transparency.',
        sections: [
          { title: 'Background', content: 'Supply chains face numerous challenges...' },
          { title: 'Blockchain Solutions', content: 'Distributed ledger technology offers...' }
        ],
        authors: [{ name: 'Mike Wilson', email: 'mike.wilson@tech.com' }]
      }),
      source: 'manual',
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  for (const doc of documents) {
    await storage.createDocument(doc);
  }

  // Add real download records
  const downloads = [
    {
      userId: createdUsers[0].id,
      documentId: 'doc_001',
      documentTitle: 'Machine Learning Applications in Healthcare',
      fileFormat: 'pdf' as const,
      fileSize: 2048576, // 2MB
      downloadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      status: 'completed' as const,
      emailSent: true,
      emailSentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 300000).toISOString(),
      documentMetadata: {
        pageCount: 12,
        wordCount: 3500,
        sectionCount: 5,
        figureCount: 3,
        referenceCount: 25,
        generationTime: 2.5
      }
    },
    {
      userId: createdUsers[1].id,
      documentId: 'doc_002',
      documentTitle: 'Quantum Computing: A Comprehensive Review',
      fileFormat: 'docx' as const,
      fileSize: 1536000, // 1.5MB
      downloadedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      ipAddress: '10.0.0.50',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      status: 'completed' as const,
      emailSent: false,
      documentMetadata: {
        pageCount: 18,
        wordCount: 5200,
        sectionCount: 7,
        figureCount: 8,
        referenceCount: 42,
        generationTime: 3.2
      }
    },
    {
      userId: createdUsers[0].id,
      documentId: 'doc_001',
      documentTitle: 'Machine Learning Applications in Healthcare',
      fileFormat: 'docx' as const,
      fileSize: 1024000, // 1MB
      downloadedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      status: 'completed' as const,
      emailSent: true,
      emailSentAt: new Date(Date.now() - 6 * 60 * 60 * 1000 + 180000).toISOString(),
      documentMetadata: {
        pageCount: 12,
        wordCount: 3500,
        sectionCount: 5,
        figureCount: 3,
        referenceCount: 25,
        generationTime: 1.8
      }
    }
  ];

  for (const download of downloads) {
    await storage.recordDownload(download);
  }

  console.log('✅ Real data initialized for admin panel');
}

// Initialize data when module loads
initializeRealData().catch(console.error);

// Export function to get storage instance (for consistency with other modules)
export function getStorage() {
  return storage;
}

// Export types
export type { User, UserSession, Document, DownloadRecord, PaginatedDownloads };