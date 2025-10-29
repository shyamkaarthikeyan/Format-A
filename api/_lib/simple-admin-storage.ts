// Simple admin storage without external dependencies
// All types defined inline to avoid import issues

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

interface Document {
  id: string;
  title: string;
  abstract: string | null;
  keywords: string | null;
  authors: any[];
  sections: any[];
  references: any[];
  figures: any[];
  settings: any;
  createdAt?: string;
  updatedAt?: string;
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

export class SimpleAdminStorage {
  private users: Map<string, User> = new Map();
  private downloads: Map<string, DownloadRecord> = new Map();
  private documents: Map<string, Document> = new Map();
  private initialized: boolean = false;

  private async ensureInitialized() {
    if (this.initialized) return;
    
    try {
      console.log('Initializing simple admin storage...');
      
      // Add sample users
      const sampleUsers: User[] = [
        {
          id: 'user_1',
          googleId: 'google_123456789',
          email: 'john.doe@university.edu',
          name: 'Dr. John Doe',
          picture: 'https://via.placeholder.com/150',
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          lastLoginAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          isActive: true,
          preferences: {
            emailNotifications: true,
            defaultExportFormat: 'pdf',
            theme: 'light'
          }
        },
        {
          id: 'user_2',
          googleId: 'google_987654321',
          email: 'jane.smith@research.org',
          name: 'Prof. Jane Smith',
          picture: 'https://via.placeholder.com/150',
          createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
          lastLoginAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          isActive: true,
          preferences: {
            emailNotifications: false,
            defaultExportFormat: 'docx',
            theme: 'dark'
          }
        },
        {
          id: 'user_3',
          googleId: 'google_456789123',
          email: 'mike.wilson@tech.com',
          name: 'Mike Wilson',
          picture: 'https://via.placeholder.com/150',
          createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
          lastLoginAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          isActive: false,
          preferences: {
            emailNotifications: true,
            defaultExportFormat: 'pdf',
            theme: 'light'
          }
        }
      ];

      sampleUsers.forEach(user => {
        this.users.set(user.id, user);
      });

      // Add sample documents
      const sampleDocuments: Document[] = [
        {
          id: 'doc_1',
          title: 'Machine Learning Applications in Healthcare',
          abstract: 'This paper explores the applications of machine learning in modern healthcare systems.',
          keywords: 'machine learning, healthcare, AI, medical diagnosis',
          authors: [{ name: 'Dr. John Doe', email: 'john.doe@university.edu' }],
          sections: [
            { title: 'Introduction', content: 'Healthcare is rapidly evolving...' },
            { title: 'Methodology', content: 'We employed various ML algorithms...' },
            { title: 'Results', content: 'Our findings demonstrate...' },
            { title: 'Conclusion', content: 'Machine learning represents...' }
          ],
          references: [],
          figures: [],
          settings: { fontSize: '10pt', columns: '2', exportFormat: 'docx' },
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'doc_2',
          title: 'Quantum Computing: A Comprehensive Review',
          abstract: 'An extensive review of quantum computing principles and applications.',
          keywords: 'quantum computing, quantum mechanics, algorithms, cryptography',
          authors: [{ name: 'Prof. Jane Smith', email: 'jane.smith@research.org' }],
          sections: [
            { title: 'Quantum Fundamentals', content: 'Quantum mechanics provides...' },
            { title: 'Current Technologies', content: 'Several quantum platforms...' },
            { title: 'Applications', content: 'Quantum computing shows promise...' }
          ],
          references: [],
          figures: [],
          settings: { fontSize: '10pt', columns: '2', exportFormat: 'docx' },
          createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      sampleDocuments.forEach(doc => {
        this.documents.set(doc.id, doc);
      });

      // Add sample downloads
      const sampleDownloads: DownloadRecord[] = [
        {
          id: 'download_1',
          userId: 'user_1',
          documentId: 'doc_1',
          documentTitle: 'Machine Learning Applications in Healthcare',
          fileFormat: 'pdf',
          fileSize: 245760,
          downloadedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          status: 'completed',
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
          id: 'download_2',
          userId: 'user_2',
          documentId: 'doc_2',
          documentTitle: 'Quantum Computing: A Comprehensive Review',
          fileFormat: 'docx',
          fileSize: 189440,
          downloadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          ipAddress: '10.0.0.50',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          status: 'completed',
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
          id: 'download_3',
          userId: 'user_1',
          documentId: 'doc_2',
          documentTitle: 'Quantum Computing: A Comprehensive Review',
          fileFormat: 'pdf',
          fileSize: 298240,
          downloadedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          status: 'completed',
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
          id: 'download_4',
          userId: 'user_3',
          documentId: 'doc_1',
          documentTitle: 'Machine Learning Applications in Healthcare',
          fileFormat: 'docx',
          fileSize: 156672,
          downloadedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          ipAddress: '172.16.0.25',
          userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
          status: 'completed',
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
          id: 'download_5',
          userId: 'user_2',
          documentId: 'doc_1',
          documentTitle: 'Machine Learning Applications in Healthcare',
          fileFormat: 'pdf',
          fileSize: 267264,
          downloadedAt: new Date().toISOString(),
          ipAddress: '10.0.0.50',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          status: 'completed',
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

      sampleDownloads.forEach(download => {
        this.downloads.set(download.id, download);
      });

      this.initialized = true;
      console.log('✅ Simple admin storage initialized successfully');
      console.log(`Users: ${this.users.size}, Documents: ${this.documents.size}, Downloads: ${this.downloads.size}`);
    } catch (error) {
      console.error('❌ Failed to initialize simple admin storage:', error);
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    await this.ensureInitialized();
    return Array.from(this.users.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getAllDocuments(): Promise<Document[]> {
    await this.ensureInitialized();
    return Array.from(this.documents.values()).sort((a, b) => 
      new Date(b.updatedAt || b.createdAt || new Date()).getTime() - 
      new Date(a.updatedAt || a.createdAt || new Date()).getTime()
    );
  }

  async getUserDownloads(userId: string): Promise<PaginatedDownloads> {
    await this.ensureInitialized();
    const userDownloads = Array.from(this.downloads.values())
      .filter(download => download.userId === userId)
      .sort((a, b) => new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime());

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

  async getAllDownloads(): Promise<DownloadRecord[]> {
    await this.ensureInitialized();
    return Array.from(this.downloads.values()).sort((a, b) => 
      new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime()
    );
  }
}

export const simpleAdminStorage = new SimpleAdminStorage();