import { neon } from '@neondatabase/serverless';

// Enhanced Neon database connection with configuration
const connectionConfig = {
  connectionTimeoutMillis: 30000,
  queryTimeoutMillis: 60000,
  maxRetries: 3,
  retryDelay: 1000
};

// Lazy initialization of SQL connection
let sql: any = null;

function getSqlConnection() {
  if (!sql) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set. Please check your .env.local file.');
    }
    sql = neon(databaseUrl, {
      fullResults: true,
      arrayMode: false
    });
  }
  return sql;
}

// Connection health monitoring
interface ConnectionHealth {
  isHealthy: boolean;
  lastChecked: string;
  responseTime: number;
  errorCount: number;
  lastError?: string;
}

let connectionHealth: ConnectionHealth = {
  isHealthy: true,
  lastChecked: new Date().toISOString(),
  responseTime: 0,
  errorCount: 0
};

export interface User {
  id: string;
  google_id: string;
  email: string;
  name: string;
  picture: string;
  created_at: string;
  updated_at: string;
  last_login_at: string;
  is_active: boolean;
  preferences: any;
}

export interface Document {
  id: string;
  user_id: string;
  title: string;
  content: any; // JSON content
  document_type?: string;
  word_count?: number;
  page_count?: number;
  section_count?: number;
  figure_count?: number;
  reference_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Download {
  id: string;
  user_id: string;
  document_id: string;
  document_title: string;
  file_format: string;
  file_size: number;
  downloaded_at: string;
  ip_address: string;
  user_agent: string;
  status: string;
  email_sent: boolean;
  document_metadata: any;
}

export class NeonDatabase {
  
  // Test database connection
  async testConnection(): Promise<boolean> {
    const startTime = Date.now();
    try {
      const sql = getSqlConnection();
      await sql`SELECT 1 as test`;
      const responseTime = Date.now() - startTime;
      
      connectionHealth = {
        isHealthy: true,
        lastChecked: new Date().toISOString(),
        responseTime,
        errorCount: 0
      };
      
      return true;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      connectionHealth = {
        isHealthy: false,
        lastChecked: new Date().toISOString(),
        responseTime,
        errorCount: connectionHealth.errorCount + 1,
        lastError: error instanceof Error ? error.message : 'Unknown error'
      };
      
      console.error('❌ Database connection test failed:', error);
      return false;
    }
  }

  // Get connection health status
  getConnectionHealth(): ConnectionHealth {
    return { ...connectionHealth };
  }

  // Initialize database tables with enhanced schema
  async initializeTables() {
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        console.log('🔧 Initializing Neon database tables...');

        // Test connection first
        const isConnected = await this.testConnection();
        if (!isConnected) {
          throw new Error('Database connection failed');
        }

        const sql = getSqlConnection();

        // Create users table with enhanced fields
        await sql`
          CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(255) PRIMARY KEY,
            google_id VARCHAR(255) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            picture TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            last_login_at TIMESTAMP DEFAULT NOW(),
            is_active BOOLEAN DEFAULT true,
            preferences JSONB DEFAULT '{"emailNotifications": true, "defaultExportFormat": "pdf", "theme": "light"}'::jsonb
          )
        `;

        // Check if documents table exists and has the right schema
        const documentsTableExists = await sql`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'documents' AND table_schema = 'public'
        `;

        if (documentsTableExists.rows.length === 0) {
          // Create documents table with metadata fields
          await sql`
            CREATE TABLE documents (
              id VARCHAR(255) PRIMARY KEY,
              user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
              title VARCHAR(500) NOT NULL,
              content JSONB NOT NULL,
              document_type VARCHAR(50) DEFAULT 'ieee_paper',
              word_count INTEGER DEFAULT 0,
              page_count INTEGER DEFAULT 0,
              section_count INTEGER DEFAULT 0,
              figure_count INTEGER DEFAULT 0,
              reference_count INTEGER DEFAULT 0,
              created_at TIMESTAMP DEFAULT NOW(),
              updated_at TIMESTAMP DEFAULT NOW()
            )
          `;
        } else {
          // Check if content column exists
          const hasContentColumn = documentsTableExists.rows.some(row => row.column_name === 'content');
          if (!hasContentColumn) {
            // Add missing columns to existing table
            await sql`ALTER TABLE documents ADD COLUMN IF NOT EXISTS content JSONB NOT NULL DEFAULT '{}'::jsonb`;
          }
          
          // Add other missing columns
          await sql`ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_type VARCHAR(50) DEFAULT 'ieee_paper'`;
          await sql`ALTER TABLE documents ADD COLUMN IF NOT EXISTS word_count INTEGER DEFAULT 0`;
          await sql`ALTER TABLE documents ADD COLUMN IF NOT EXISTS page_count INTEGER DEFAULT 0`;
          await sql`ALTER TABLE documents ADD COLUMN IF NOT EXISTS section_count INTEGER DEFAULT 0`;
          await sql`ALTER TABLE documents ADD COLUMN IF NOT EXISTS figure_count INTEGER DEFAULT 0`;
          await sql`ALTER TABLE documents ADD COLUMN IF NOT EXISTS reference_count INTEGER DEFAULT 0`;
        }

        // Create downloads table with enhanced tracking
        await sql`
          CREATE TABLE IF NOT EXISTS downloads (
            id VARCHAR(255) PRIMARY KEY,
            user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
            document_id VARCHAR(255),
            document_title VARCHAR(500) NOT NULL,
            file_format VARCHAR(10) NOT NULL,
            file_size INTEGER DEFAULT 0,
            downloaded_at TIMESTAMP DEFAULT NOW(),
            ip_address VARCHAR(45),
            user_agent TEXT,
            status VARCHAR(20) DEFAULT 'completed',
            email_sent BOOLEAN DEFAULT false,
            email_sent_at TIMESTAMP,
            email_error TEXT,
            document_metadata JSONB DEFAULT '{}'::jsonb,
            generation_time_ms INTEGER DEFAULT 0
          )
        `;

        // Add missing columns to downloads table if they don't exist
        await sql`ALTER TABLE downloads ADD COLUMN IF NOT EXISTS document_metadata JSONB DEFAULT '{}'::jsonb`;
        await sql`ALTER TABLE downloads ADD COLUMN IF NOT EXISTS generation_time_ms INTEGER DEFAULT 0`;

        // Create user sessions table for better session management
        await sql`
          CREATE TABLE IF NOT EXISTS user_sessions (
            session_id VARCHAR(255) PRIMARY KEY,
            user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT NOW(),
            expires_at TIMESTAMP NOT NULL,
            last_accessed_at TIMESTAMP DEFAULT NOW(),
            is_active BOOLEAN DEFAULT true,
            ip_address VARCHAR(45),
            user_agent TEXT
          )
        `;

        // Create comprehensive indexes for performance
        await sql`CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active)`;
        
        await sql`CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_documents_title ON documents(title)`;
        
        await sql`CREATE INDEX IF NOT EXISTS idx_downloads_user_id ON downloads(user_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_downloads_document_id ON downloads(document_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_downloads_downloaded_at ON downloads(downloaded_at)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_downloads_format ON downloads(file_format)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_downloads_status ON downloads(status)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_downloads_date_format ON downloads(downloaded_at, file_format)`;
        
        await sql`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON user_sessions(expires_at)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_sessions_active ON user_sessions(is_active)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_sessions_last_accessed ON user_sessions(last_accessed_at)`;

        console.log('✅ Database tables initialized successfully');
        return true;
      } catch (error) {
        retryCount++;
        console.error(`❌ Failed to initialize database tables (attempt ${retryCount}/${maxRetries}):`, error);
        
        if (retryCount >= maxRetries) {
          throw new Error(`Database initialization failed after ${maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, connectionConfig.retryDelay * retryCount));
      }
    }
  }

  // User operations
  async createOrUpdateUser(userData: {
    google_id: string;
    email: string;
    name: string;
    picture?: string;
  }): Promise<User> {
    try {
      const sql = getSqlConnection();
      // Check if user exists by google_id or email
      const existingUser = await sql`
        SELECT * FROM users WHERE google_id = ${userData.google_id} OR email = ${userData.email} LIMIT 1
      `;

      if (existingUser.rows.length > 0) {
        // Update existing user
        const updated = await sql`
          UPDATE users 
          SET name = ${userData.name},
              picture = ${userData.picture || null},
              google_id = ${userData.google_id},
              email = ${userData.email},
              last_login_at = NOW(),
              updated_at = NOW(),
              is_active = true
          WHERE id = ${existingUser.rows[0].id}
          RETURNING *
        `;
        console.log('✅ Updated existing user:', userData.email);
        return updated.rows[0] as User;
      } else {
        // Create new user
        const id = `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const newUser = await sql`
          INSERT INTO users (id, google_id, email, name, picture, created_at, updated_at, last_login_at, is_active)
          VALUES (${id}, ${userData.google_id}, ${userData.email}, ${userData.name}, 
                  ${userData.picture || null}, NOW(), NOW(), NOW(), true)
          RETURNING *
        `;
        console.log('✅ Created new user:', userData.email);
        return newUser.rows[0] as User;
      }
    } catch (error) {
      console.error('❌ Error creating/updating user:', error);
      throw error;
    }
  }

  async getUserByGoogleId(googleId: string): Promise<User | null> {
    try {
      const sql = getSqlConnection();
      const result = await sql`
        SELECT * FROM users WHERE google_id = ${googleId} LIMIT 1
      `;
      return result.rows.length > 0 ? result.rows[0] as User : null;
    } catch (error) {
      console.error('Error getting user by Google ID:', error);
      return null;
    }
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      const sql = getSqlConnection();
      const result = await sql`
        SELECT * FROM users WHERE id = ${id} LIMIT 1
      `;
      return result.rows.length > 0 ? result.rows[0] as User : null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const sql = getSqlConnection();
      const result = await sql`
        SELECT * FROM users ORDER BY created_at DESC
      `;
      return result.rows as User[];
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  async getAllUsersWithStats(): Promise<any[]> {
    try {
      const sql = getSqlConnection();
      const result = await sql`
        SELECT 
          u.*,
          COUNT(DISTINCT d.id) as total_documents,
          COUNT(DISTINCT dl.id) as total_downloads,
          MAX(d.created_at) as last_document_created,
          MAX(dl.downloaded_at) as last_download,
          COALESCE(SUM(dl.file_size), 0) as total_download_size
        FROM users u
        LEFT JOIN documents d ON u.id = d.user_id
        LEFT JOIN downloads dl ON u.id = dl.user_id
        GROUP BY u.id, u.google_id, u.email, u.name, u.picture, u.created_at, u.updated_at, u.last_login_at, u.is_active, u.preferences
        ORDER BY u.created_at DESC
      `;
      return result.rows;
    } catch (error) {
      console.error('Error getting all users with stats:', error);
      return [];
    }
  }

  // DANGER: Clear all data from database while preserving structure
  async clearAllData(keepStructure: boolean = true): Promise<any> {
    try {
      const sql = getSqlConnection();
      
      console.log('🧹 Starting database data clearing operation...');
      
      // Get counts before deletion for reporting
      const beforeCounts = await sql`
        SELECT 
          (SELECT COUNT(*) FROM users) as users_count,
          (SELECT COUNT(*) FROM documents) as documents_count,
          (SELECT COUNT(*) FROM downloads) as downloads_count,
          (SELECT COUNT(*) FROM user_sessions) as sessions_count
      `;
      
      const initialCounts = beforeCounts.rows[0];
      
      console.log('📊 Data before clearing:', {
        users: initialCounts.users_count,
        documents: initialCounts.documents_count,
        downloads: initialCounts.downloads_count,
        sessions: initialCounts.sessions_count
      });
      
      // Clear data in correct order (respecting foreign key constraints)
      console.log('🗑️  Clearing user_sessions...');
      const sessionsResult = await sql`DELETE FROM user_sessions RETURNING id`;
      
      console.log('🗑️  Clearing downloads...');
      const downloadsResult = await sql`DELETE FROM downloads RETURNING id`;
      
      console.log('🗑️  Clearing documents...');
      const documentsResult = await sql`DELETE FROM documents RETURNING id`;
      
      console.log('🗑️  Clearing users...');
      const usersResult = await sql`DELETE FROM users RETURNING id`;
      
      // Get counts after deletion to verify
      const afterCounts = await sql`
        SELECT 
          (SELECT COUNT(*) FROM users) as users_count,
          (SELECT COUNT(*) FROM documents) as documents_count,
          (SELECT COUNT(*) FROM downloads) as downloads_count,
          (SELECT COUNT(*) FROM user_sessions) as sessions_count
      `;
      
      const finalCounts = afterCounts.rows[0];
      
      console.log('📊 Data after clearing:', {
        users: finalCounts.users_count,
        documents: finalCounts.documents_count,
        downloads: finalCounts.downloads_count,
        sessions: finalCounts.sessions_count
      });
      
      // Reset sequences if they exist (PostgreSQL auto-increment)
      if (keepStructure) {
        try {
          console.log('🔄 Resetting sequences...');
          // Note: Our tables use custom IDs, not auto-increment, so no sequences to reset
          console.log('✅ No sequences to reset (using custom IDs)');
        } catch (seqError) {
          console.warn('⚠️  Sequence reset warning:', seqError);
        }
      }
      
      const deletionSummary = {
        before: {
          users: parseInt(initialCounts.users_count),
          documents: parseInt(initialCounts.documents_count),
          downloads: parseInt(initialCounts.downloads_count),
          sessions: parseInt(initialCounts.sessions_count)
        },
        after: {
          users: parseInt(finalCounts.users_count),
          documents: parseInt(finalCounts.documents_count),
          downloads: parseInt(finalCounts.downloads_count),
          sessions: parseInt(finalCounts.sessions_count)
        },
        deleted: {
          users: usersResult.rows.length,
          documents: documentsResult.rows.length,
          downloads: downloadsResult.rows.length,
          sessions: sessionsResult.rows.length
        },
        structurePreserved: keepStructure,
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ Database clearing completed successfully');
      console.log('📋 Summary:', deletionSummary);
      
      return deletionSummary;
      
    } catch (error) {
      console.error('❌ Error clearing database data:', error);
      throw new Error(`Failed to clear database data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const sql = getSqlConnection();
      const result = await sql`
        SELECT * FROM users WHERE email = ${email} LIMIT 1
      `;
      return result.rows.length > 0 ? result.rows[0] as User : null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    try {
      const sql = getSqlConnection();
      const setClause = Object.keys(updates)
        .filter(key => key !== 'id' && updates[key as keyof User] !== undefined)
        .map(key => `${key} = $${key}`)
        .join(', ');

      if (!setClause) {
        throw new Error('No valid fields to update');
      }

      const result = await sql`
        UPDATE users 
        SET name = COALESCE(${updates.name}, name),
            email = COALESCE(${updates.email}, email),
            picture = COALESCE(${updates.picture}, picture),
            is_active = COALESCE(${updates.is_active}, is_active),
            preferences = COALESCE(${updates.preferences ? JSON.stringify(updates.preferences) : null}, preferences),
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
      
      return result.rows.length > 0 ? result.rows[0] as User : null;
    } catch (error) {
      console.error('Error updating user:', error);
      return null;
    }
  }

  async updateUserPreferences(userId: string, preferences: any): Promise<User | null> {
    try {
      const sql = getSqlConnection();
      const result = await sql`
        UPDATE users 
        SET preferences = ${JSON.stringify(preferences)}, updated_at = NOW()
        WHERE id = ${userId}
        RETURNING *
      `;
      
      return result.rows.length > 0 ? result.rows[0] as User : null;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      return null;
    }
  }

  async deactivateUser(userId: string): Promise<boolean> {
    try {
      const sql = getSqlConnection();
      const result = await sql`
        UPDATE users 
        SET is_active = false, updated_at = NOW()
        WHERE id = ${userId}
        RETURNING id
      `;
      
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error deactivating user:', error);
      return false;
    }
  }

  async deleteUser(userId: string): Promise<any> {
    try {
      const sql = getSqlConnection();
      
      // Get user info before deletion
      const userInfo = await sql`SELECT name, email FROM users WHERE id = ${userId}`;
      
      // Count related records before deletion
      const downloadCount = await sql`SELECT COUNT(*) as count FROM downloads WHERE user_id = ${userId}`;
      const documentCount = await sql`SELECT COUNT(*) as count FROM documents WHERE user_id = ${userId}`;
      
      // This will cascade delete related records due to foreign key constraints
      const result = await sql`
        DELETE FROM users WHERE id = ${userId}
        RETURNING id
      `;
      
      return {
        success: result.rows.length > 0,
        deletedUser: userInfo.rows[0] || null,
        deletedRecords: {
          downloads: parseInt(downloadCount.rows[0].count),
          documents: parseInt(documentCount.rows[0].count)
        }
      };
    } catch (error) {
      console.error('Error deleting user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getUserDownloads(userId: string, page: number = 1, limit: number = 20): Promise<any> {
    try {
      const sql = getSqlConnection();
      const offset = (page - 1) * limit;
      
      // Get total count
      const countResult = await sql`
        SELECT COUNT(*) as total FROM downloads WHERE user_id = ${userId}
      `;
      const totalItems = parseInt(countResult.rows[0].total);
      
      // Get paginated downloads
      const downloads = await sql`
        SELECT 
          id,
          document_title,
          file_format,
          file_size,
          downloaded_at,
          ip_address,
          user_agent,
          status,
          email_sent,
          document_metadata
        FROM downloads 
        WHERE user_id = ${userId}
        ORDER BY downloaded_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      
      const totalPages = Math.ceil(totalItems / limit);
      
      return {
        downloads: downloads.rows,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          hasNext: page < totalPages,
          hasPrev: page > 1,
          limit
        }
      };
    } catch (error) {
      console.error('Error getting user downloads:', error);
      return {
        downloads: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          hasNext: false,
          hasPrev: false,
          limit
        }
      };
    }
  }

  async getUserStats(userId: string): Promise<any> {
    try {
      const sql = getSqlConnection();
      const result = await sql`
        SELECT 
          u.*,
          COUNT(DISTINCT d.id) as total_documents,
          COUNT(DISTINCT dl.id) as total_downloads,
          MAX(d.created_at) as last_document_created,
          MAX(dl.downloaded_at) as last_download
        FROM users u
        LEFT JOIN documents d ON u.id = d.user_id
        LEFT JOIN downloads dl ON u.id = dl.user_id
        WHERE u.id = ${userId}
        GROUP BY u.id
      `;
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error getting user stats:', error);
      return null;
    }
  }

  // Document operations
  async createDocument(documentData: {
    id: string;
    user_id: string;
    title: string;
    content: any;
    document_type?: string;
    word_count?: number;
    page_count?: number;
    section_count?: number;
    figure_count?: number;
    reference_count?: number;
  }): Promise<Document> {
    try {
      const sql = getSqlConnection();
      const result = await sql`
        INSERT INTO documents (id, user_id, title, content, document_type, word_count, page_count, 
                             section_count, figure_count, reference_count, created_at, updated_at)
        VALUES (${documentData.id}, ${documentData.user_id}, ${documentData.title}, 
                ${JSON.stringify(documentData.content)}, ${documentData.document_type || 'ieee_paper'},
                ${documentData.word_count || 0}, ${documentData.page_count || 0},
                ${documentData.section_count || 0}, ${documentData.figure_count || 0},
                ${documentData.reference_count || 0}, NOW(), NOW())
        RETURNING *
      `;
      return result.rows[0] as Document;
    } catch (error) {
      console.error('Error creating document:', error);
      throw error;
    }
  }

  async getDocumentById(id: string): Promise<Document | null> {
    try {
      const sql = getSqlConnection();
      const result = await sql`
        SELECT d.*, u.name as user_name, u.email as user_email
        FROM documents d
        LEFT JOIN users u ON d.user_id = u.id
        WHERE d.id = ${id}
        LIMIT 1
      `;
      return result.rows.length > 0 ? result.rows[0] as Document : null;
    } catch (error) {
      console.error('Error getting document by ID:', error);
      return null;
    }
  }

  async getUserDocuments(userId: string): Promise<Document[]> {
    try {
      const sql = getSqlConnection();
      const result = await sql`
        SELECT d.*, 
               COUNT(dl.id) as download_count,
               MAX(dl.downloaded_at) as last_downloaded
        FROM documents d
        LEFT JOIN downloads dl ON d.id = dl.document_id
        WHERE d.user_id = ${userId} 
        GROUP BY d.id
        ORDER BY d.updated_at DESC
      `;
      return result.rows as Document[];
    } catch (error) {
      console.error('Error getting user documents:', error);
      return [];
    }
  }

  async getAllDocuments(): Promise<Document[]> {
    try {
      const sql = getSqlConnection();
      const result = await sql`
        SELECT d.*, u.name as user_name, u.email as user_email,
               COUNT(dl.id) as download_count,
               MAX(dl.downloaded_at) as last_downloaded
        FROM documents d
        LEFT JOIN users u ON d.user_id = u.id
        LEFT JOIN downloads dl ON d.id = dl.document_id
        GROUP BY d.id, u.name, u.email
        ORDER BY d.created_at DESC
      `;
      return result.rows as Document[];
    } catch (error) {
      console.error('Error getting all documents:', error);
      return [];
    }
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<Document | null> {
    try {
      const sql = getSqlConnection();
      const result = await sql`
        UPDATE documents 
        SET title = COALESCE(${updates.title}, title),
            content = COALESCE(${updates.content ? JSON.stringify(updates.content) : null}, content),
            word_count = COALESCE(${updates.word_count}, word_count),
            page_count = COALESCE(${updates.page_count}, page_count),
            section_count = COALESCE(${updates.section_count}, section_count),
            figure_count = COALESCE(${updates.figure_count}, figure_count),
            reference_count = COALESCE(${updates.reference_count}, reference_count),
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
      
      return result.rows.length > 0 ? result.rows[0] as Document : null;
    } catch (error) {
      console.error('Error updating document:', error);
      return null;
    }
  }

  async deleteDocument(id: string): Promise<boolean> {
    try {
      const sql = getSqlConnection();
      const result = await sql`
        DELETE FROM documents WHERE id = ${id}
        RETURNING id
      `;
      
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error deleting document:', error);
      return false;
    }
  }

  async searchDocuments(query: string, userId?: string): Promise<Document[]> {
    try {
      const sql = getSqlConnection();
      const searchQuery = `%${query}%`;
      const result = userId 
        ? await sql`
            SELECT d.*, u.name as user_name, u.email as user_email
            FROM documents d
            LEFT JOIN users u ON d.user_id = u.id
            WHERE d.user_id = ${userId} AND (d.title ILIKE ${searchQuery} OR d.content::text ILIKE ${searchQuery})
            ORDER BY d.updated_at DESC
          `
        : await sql`
            SELECT d.*, u.name as user_name, u.email as user_email
            FROM documents d
            LEFT JOIN users u ON d.user_id = u.id
            WHERE d.title ILIKE ${searchQuery} OR d.content::text ILIKE ${searchQuery}
            ORDER BY d.updated_at DESC
          `;
      
      return result.rows as Document[];
    } catch (error) {
      console.error('Error searching documents:', error);
      return [];
    }
  }

  // Download operations
  async recordDownload(downloadData: {
    user_id: string;
    document_id?: string;
    document_title: string;
    file_format: string;
    file_size: number;
    ip_address?: string;
    user_agent?: string;
    document_metadata?: any;
  }): Promise<Download> {
    try {
      const sql = getSqlConnection();
      const id = `download_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      
      const result = await sql`
        INSERT INTO downloads (id, user_id, document_id, document_title, file_format, file_size, 
                             downloaded_at, ip_address, user_agent, status, email_sent, document_metadata)
        VALUES (${id}, ${downloadData.user_id}, ${downloadData.document_id || null}, 
                ${downloadData.document_title}, ${downloadData.file_format}, ${downloadData.file_size},
                NOW(), ${downloadData.ip_address || null}, ${downloadData.user_agent || null}, 
                'completed', false, ${JSON.stringify(downloadData.document_metadata || {})})
        RETURNING *
      `;
      
      console.log('✅ Download recorded:', downloadData.document_title);
      return result.rows[0] as Download;
    } catch (error) {
      console.error('Error recording download:', error);
      throw error;
    }
  }

  async getUserDownloads(userId: string): Promise<Download[]> {
    try {
      const sql = getSqlConnection();
      const result = await sql`
        SELECT * FROM downloads 
        WHERE user_id = ${userId} 
        ORDER BY downloaded_at DESC
      `;
      return result.rows as Download[];
    } catch (error) {
      console.error('Error getting user downloads:', error);
      return [];
    }
  }

  async getAllDownloads(): Promise<Download[]> {
    try {
      const sql = getSqlConnection();
      const result = await sql`
        SELECT d.*, u.name as user_name, u.email as user_email
        FROM downloads d
        LEFT JOIN users u ON d.user_id = u.id
        ORDER BY d.downloaded_at DESC
      `;
      return result.rows as Download[];
    } catch (error) {
      console.error('Error getting all downloads:', error);
      return [];
    }
  }

  async getDownloadById(id: string): Promise<Download | null> {
    try {
      const sql = getSqlConnection();
      const result = await sql`
        SELECT d.*, u.name as user_name, u.email as user_email
        FROM downloads d
        LEFT JOIN users u ON d.user_id = u.id
        WHERE d.id = ${id}
        LIMIT 1
      `;
      return result.rows.length > 0 ? result.rows[0] as Download : null;
    } catch (error) {
      console.error('Error getting download by ID:', error);
      return null;
    }
  }

  async updateDownloadStatus(id: string, status: string, emailSent?: boolean, emailError?: string): Promise<void> {
    try {
      const sql = getSqlConnection();
      await sql`
        UPDATE downloads 
        SET status = ${status},
            email_sent = COALESCE(${emailSent}, email_sent),
            email_sent_at = CASE WHEN ${emailSent} = true THEN NOW() ELSE email_sent_at END,
            email_error = COALESCE(${emailError}, email_error)
        WHERE id = ${id}
      `;
    } catch (error) {
      console.error('Error updating download status:', error);
      throw error;
    }
  }

  async deleteUserDownloads(userId: string): Promise<boolean> {
    try {
      const sql = getSqlConnection();
      const result = await sql`
        DELETE FROM downloads WHERE user_id = ${userId}
        RETURNING id
      `;
      
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error deleting user downloads:', error);
      return false;
    }
  }

  async getDownloadTrends(days: number = 30): Promise<any[]> {
    try {
      const sql = getSqlConnection();
      const result = await sql`
        SELECT 
          DATE(downloaded_at) as date,
          COUNT(*) as downloads,
          COUNT(CASE WHEN file_format = 'pdf' THEN 1 END) as pdf_downloads,
          COUNT(CASE WHEN file_format = 'docx' THEN 1 END) as docx_downloads,
          AVG(file_size) as avg_file_size
        FROM downloads 
        WHERE downloaded_at >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE(downloaded_at)
        ORDER BY date DESC
      `;
      return result.rows;
    } catch (error) {
      console.error('Error getting download trends:', error);
      return [];
    }
  }

  async getTopDownloadedDocuments(limit: number = 10): Promise<any[]> {
    try {
      const sql = getSqlConnection();
      const result = await sql`
        SELECT 
          document_title,
          COUNT(*) as download_count,
          AVG(file_size) as avg_file_size,
          MAX(downloaded_at) as last_downloaded
        FROM downloads 
        WHERE document_title IS NOT NULL
        GROUP BY document_title
        ORDER BY download_count DESC
        LIMIT ${limit}
      `;
      return result.rows;
    } catch (error) {
      console.error('Error getting top downloaded documents:', error);
      return [];
    }
  }

  // Analytics operations
  async getUserAnalytics() {
    try {
      const sql = getSqlConnection();
      const result = await sql`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN 1 END) as new_users_today,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_users_7d,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_users_30d,
          COUNT(CASE WHEN last_login_at >= NOW() - INTERVAL '7 days' THEN 1 END) as active_users_7d,
          COUNT(CASE WHEN last_login_at >= NOW() - INTERVAL '30 days' THEN 1 END) as active_users_30d,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_users
        FROM users
      `;
      return result.rows[0];
    } catch (error) {
      console.error('Error getting user analytics:', error);
      return {
        total_users: 0,
        new_users_today: 0,
        new_users_7d: 0,
        new_users_30d: 0,
        active_users_7d: 0,
        active_users_30d: 0,
        active_users: 0
      };
    }
  }

  async getDocumentAnalytics() {
    try {
      const sql = getSqlConnection();
      const result = await sql`
        SELECT 
          COUNT(*) as total_documents,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN 1 END) as documents_today,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as documents_7d,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as documents_30d
        FROM documents
      `;
      return result.rows[0];
    } catch (error) {
      console.error('Error getting document analytics:', error);
      return {
        total_documents: 0,
        documents_today: 0,
        documents_7d: 0,
        documents_30d: 0
      };
    }
  }

  async getDownloadAnalytics() {
    try {
      const sql = getSqlConnection();
      const result = await sql`
        SELECT 
          COUNT(*) as total_downloads,
          COUNT(CASE WHEN downloaded_at >= NOW() - INTERVAL '1 day' THEN 1 END) as downloads_today,
          COUNT(CASE WHEN downloaded_at >= NOW() - INTERVAL '7 days' THEN 1 END) as downloads_7d,
          COUNT(CASE WHEN downloaded_at >= NOW() - INTERVAL '30 days' THEN 1 END) as downloads_30d,
          COUNT(CASE WHEN file_format = 'pdf' THEN 1 END) as pdf_downloads,
          COUNT(CASE WHEN file_format = 'docx' THEN 1 END) as docx_downloads,
          AVG(file_size) as avg_file_size
        FROM downloads
      `;
      return result.rows[0];
    } catch (error) {
      console.error('Error getting download analytics:', error);
      return {
        total_downloads: 0,
        downloads_today: 0,
        downloads_7d: 0,
        downloads_30d: 0,
        pdf_downloads: 0,
        docx_downloads: 0,
        avg_file_size: 0
      };
    }
  }

  // Initialize database on first use
  async initialize() {
    await this.initializeTables();
    console.log('✅ Neon database initialized successfully');
  }
}

// Export singleton instance
export const neonDb = new NeonDatabase();