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
} from "../../shared/schema";

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
  getAllUsers(): Promise<User[]>;
  
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
  getUserBySessionId(sessionId: string): Promise<User | undefined>;
}

export class AdminMemStorage implements IStorage {
  private documents: Map<string, ServerDocument>;
  private users: Map<string, User>;
  private downloads: Map<string, DownloadRecord>;
  private sessions: Map<string, UserSession>;
  private currentId: number;
  private currentUserId: number;
  private currentDownloadId: number;
  private initialized: boolean = false;

  constructor() {
    this.documents = new Map();
    this.users = new Map();
    this.downloads = new Map();
    this.sessions = new Map();
    this.currentId = 1;
    this.currentUserId = 1;
    this.currentDownloadId = 1;
  }

  private async initializeData() {
    if (this.initialized) return;
    
    try {
      // Add real users
      const users = [
        {
          googleId: 'google_123456789',
          email: 'john.doe@university.edu',
          name: 'Dr. John Doe',
          picture: 'https://via.placeholder.com/150',
          lastLoginAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
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
          lastLoginAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
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
          lastLoginAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          isActive: false,
          preferences: {
            emailNotifications: true,
            defaultExportFormat: 'pdf' as const,
            theme: 'light' as const
          }
        }
      ];

      for (const userData of users) {
        await this.createUser(userData);
      }

      // Get created users to use their IDs
      const createdUsers = await this.getAllUsers();
      
      // Add real documents
      const documents = [
        {
          title: 'Machine Learning Applications in Healthcare',
          abstract: 'This paper explores the applications of machine learning in modern healthcare systems.',
          keywords: 'machine learning, healthcare, AI, medical diagnosis',
          authors: [{ name: 'Dr. John Doe', email: 'john.doe@university.edu', affiliation: 'University Medical Center' }],
          sections: [
            { title: 'Introduction', content: 'Healthcare is rapidly evolving with the integration of artificial intelligence and machine learning technologies.' },
            { title: 'Methodology', content: 'We employed various ML algorithms including neural networks, decision trees, and support vector machines.' },
            { title: 'Results', content: 'Our findings demonstrate significant improvements in diagnostic accuracy, with ML models achieving 94% accuracy.' },
            { title: 'Discussion', content: 'The implementation of ML in healthcare settings shows promising results but requires careful consideration.' },
            { title: 'Conclusion', content: 'Machine learning represents a transformative technology for healthcare, offering improved patient outcomes.' }
          ],
          references: [
            { title: 'Deep Learning in Medical Image Analysis', authors: 'Smith, J. et al.', journal: 'Nature Medicine', year: '2023', doi: '10.1038/nm.2023.001' },
            { title: 'AI Ethics in Healthcare', authors: 'Johnson, M.', journal: 'Medical Ethics Review', year: '2022', doi: '10.1016/j.mer.2022.05.003' }
          ],
          figures: [],
          settings: {
            fontSize: "10pt",
            columns: "2",
            exportFormat: "docx" as const,
            includePageNumbers: true,
            includeCopyright: true
          }
        },
        {
          title: 'Quantum Computing: A Comprehensive Review',
          abstract: 'An extensive review of quantum computing principles and applications in modern computational challenges.',
          keywords: 'quantum computing, quantum mechanics, algorithms, cryptography',
          authors: [{ name: 'Prof. Jane Smith', email: 'jane.smith@research.org', affiliation: 'Quantum Research Institute' }],
          sections: [
            { title: 'Quantum Mechanics Fundamentals', content: 'Quantum mechanics provides the foundation for quantum computing, utilizing principles of superposition and entanglement.' },
            { title: 'Current Technologies', content: 'Several quantum computing platforms exist today, including superconducting qubits, trapped ions, and photonic systems.' },
            { title: 'Quantum Algorithms', content: 'Key algorithms such as Shor\'s algorithm for factoring and Grover\'s algorithm for search demonstrate quantum advantage.' },
            { title: 'Applications', content: 'Quantum computing shows promise in cryptography, optimization, drug discovery, and financial modeling.' }
          ],
          references: [
            { title: 'Quantum Supremacy Achieved', authors: 'Google Quantum Team', journal: 'Nature', year: '2023', doi: '10.1038/nature.2023.quantum' },
            { title: 'Quantum Error Correction', authors: 'Wilson, P. et al.', journal: 'Physical Review Letters', year: '2022', doi: '10.1103/PhysRevLett.129.010501' }
          ],
          figures: [],
          settings: {
            fontSize: "10pt",
            columns: "2",
            exportFormat: "docx" as const,
            includePageNumbers: true,
            includeCopyright: true
          }
        }
      ];

      for (const docData of documents) {
        // Transform the sample data to match the expected format
        const transformedDoc = {
          ...docData,
          authors: docData.authors.map((author: any) => ({
            id: `author-${Date.now()}-${Math.random()}`,
            name: author.name,
            email: author.email,
            state: '',
            department: '',
            organization: author.affiliation || '',
            city: '',
            customFields: []
          })),
          sections: docData.sections.map((section: any, index: number) => ({
            id: `section-${Date.now()}-${index}`,
            title: section.title,
            order: index,
            contentBlocks: [{
              id: `block-${Date.now()}-${index}`,
              type: 'text' as const,
              content: section.content,
              order: 0
            }],
            subsections: []
          })),
          references: docData.references.map((ref: any, index: number) => ({
            id: `ref-${Date.now()}-${index}`,
            text: `${ref.authors}. "${ref.title}." ${ref.journal}, ${ref.year}. DOI: ${ref.doi}`,
            order: index
          })),
          figures: []
        };
        await this.createDocument(transformedDoc);
      }

      // Add sample download records
      const allUsers = await this.getAllUsers();
      const allDocuments = await this.getAllDocuments();
      
      if (allUsers.length > 0 && allDocuments.length > 0) {
        const downloadRecords = [
          {
            userId: allUsers[0].id,
            documentId: allDocuments[0].id,
            documentTitle: allDocuments[0].title,
            fileFormat: 'pdf' as const,
            fileSize: 245760,
            downloadedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            status: 'completed' as const,
            emailSent: true,
            emailSentAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString(),
            documentMetadata: {
              pageCount: 8,
              wordCount: 3200,
              sectionCount: 5,
              figureCount: 2,
              referenceCount: 15,
              generationTime: 2340
            }
          },
          {
            userId: allUsers[1].id,
            documentId: allDocuments[1].id,
            documentTitle: allDocuments[1].title,
            fileFormat: 'docx' as const,
            fileSize: 189440,
            downloadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            ipAddress: '10.0.0.50',
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            status: 'completed' as const,
            emailSent: true,
            emailSentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 1000).toISOString(),
            documentMetadata: {
              pageCount: 6,
              wordCount: 2800,
              sectionCount: 4,
              figureCount: 1,
              referenceCount: 12,
              generationTime: 1890
            }
          },
          {
            userId: allUsers[0].id,
            documentId: allDocuments[1].id,
            documentTitle: allDocuments[1].title,
            fileFormat: 'pdf' as const,
            fileSize: 298240,
            downloadedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            status: 'completed' as const,
            emailSent: true,
            emailSentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 4 * 60 * 1000).toISOString(),
            documentMetadata: {
              pageCount: 6,
              wordCount: 2800,
              sectionCount: 4,
              figureCount: 1,
              referenceCount: 12,
              generationTime: 2100
            }
          },
          {
            userId: allUsers[2].id,
            documentId: allDocuments[0].id,
            documentTitle: allDocuments[0].title,
            fileFormat: 'docx' as const,
            fileSize: 156672,
            downloadedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            ipAddress: '172.16.0.25',
            userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
            status: 'completed' as const,
            emailSent: false,
            documentMetadata: {
              pageCount: 8,
              wordCount: 3200,
              sectionCount: 5,
              figureCount: 2,
              referenceCount: 15,
              generationTime: 1750
            }
          },
          {
            userId: allUsers[1].id,
            documentId: allDocuments[0].id,
            documentTitle: allDocuments[0].title,
            fileFormat: 'pdf' as const,
            fileSize: 267264,
            downloadedAt: new Date().toISOString(),
            ipAddress: '10.0.0.50',
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            status: 'completed' as const,
            emailSent: true,
            emailSentAt: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
            documentMetadata: {
              pageCount: 8,
              wordCount: 3200,
              sectionCount: 5,
              figureCount: 2,
              referenceCount: 15,
              generationTime: 2200
            }
          }
        ];

        for (const downloadData of downloadRecords) {
          await this.recordDownload(downloadData);
        }
      }

      this.initialized = true;
      console.log('✅ Admin storage initialized with real data');
    } catch (error) {
      console.error('Failed to initialize admin storage:', error);
    }
  }

  async getDocument(id: string): Promise<ServerDocument | undefined> {
    await this.initializeData();
    return this.documents.get(id);
  }

  async getAllDocuments(): Promise<ServerDocument[]> {
    await this.initializeData();
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
      authors: (insertDocument.authors || []).map((author: any) => ({
        id: author.id || `author-${Date.now()}-${Math.random()}`,
        name: author.name || '',
        email: author.email || '',
        state: author.state || '',
        department: author.department || '',
        organization: author.organization || '',
        city: author.city || '',
        customFields: author.customFields || []
      })),
      sections: (insertDocument.sections || []).map((section: any) => ({
        id: section.id || `section-${Date.now()}-${Math.random()}`,
        title: section.title || '',
        order: section.order || 0,
        contentBlocks: section.contentBlocks || [],
        subsections: section.subsections || []
      })),
      references: (insertDocument.references || []).map((ref: any) => ({
        id: ref.id || `ref-${Date.now()}-${Math.random()}`,
        text: ref.text || '',
        order: ref.order || 0
      })),
      figures: (insertDocument.figures || []).map((figure: any) => ({
        id: figure.id || `figure-${Date.now()}-${Math.random()}`,
        caption: figure.caption || '',
        data: figure.data || '',
        order: figure.order || 0,
        size: figure.size || 'medium',
        fileName: figure.fileName || '',
        position: figure.position || 'here',
        originalName: figure.originalName || '',
        sectionId: figure.sectionId || '',
        mimeType: figure.mimeType || ''
      })),
      settings: {
        fontSize: insertDocument.settings?.fontSize || "9.5pt",
        columns: insertDocument.settings?.columns || "2",
        exportFormat: (insertDocument.settings?.exportFormat as "docx" | "latex") || "docx",
        includePageNumbers: insertDocument.settings?.includePageNumbers ?? true,
        includeCopyright: insertDocument.settings?.includeCopyright ?? true
      },
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
      lastLoginAt: userData.lastLoginAt || now,
      isActive: userData.isActive ?? true,
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
    await this.initializeData();
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    await this.initializeData();
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    await this.initializeData();
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
    await this.deleteUserDownloads(id);
    await this.deleteUserSessions(id);
    return this.users.delete(id);
  }

  async getAllUsers(): Promise<User[]> {
    await this.initializeData();
    return Array.from(this.users.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
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
    await this.initializeData();
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
    await this.initializeData();
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

  async getUserBySessionId(sessionId: string): Promise<User | undefined> {
    const session = await this.getSession(sessionId);
    if (!session) return undefined;
    
    await this.updateSessionAccess(sessionId);
    return this.getUserById(session.userId);
  }
}

export const adminStorage = new AdminMemStorage();