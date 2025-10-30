import { sql } from '@vercel/postgres';

// Database storage using Vercel Postgres
export class PostgresStorage {
  
  // Initialize database tables
  async initializeTables() {
    try {
      // Create users table
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(255) PRIMARY KEY,
          google_id VARCHAR(255) UNIQUE,
          email VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          picture TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          last_login_at TIMESTAMP,
          is_active BOOLEAN DEFAULT true,
          preferences JSONB DEFAULT '{
            "emailNotifications": true,
            "defaultExportFormat": "pdf",
            "theme": "light"
          }'::jsonb
        )
      `;

      // Create documents table (metadata only)
      await sql`
        CREATE TABLE IF NOT EXISTS documents (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(500) NOT NULL,
          abstract TEXT,
          keywords TEXT,
          author_count INTEGER DEFAULT 0,
          section_count INTEGER DEFAULT 0,
          reference_count INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // Create downloads table
      await sql`
        CREATE TABLE IF NOT EXISTS downloads (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
          document_id VARCHAR(255) REFERENCES documents(id) ON DELETE CASCADE,
          document_title VARCHAR(500) NOT NULL,
          file_format VARCHAR(10) NOT NULL,
          file_size INTEGER,
          downloaded_at TIMESTAMP DEFAULT NOW(),
          ip_address VARCHAR(45),
          user_agent TEXT,
          status VARCHAR(20) DEFAULT 'completed',
          email_sent BOOLEAN DEFAULT false,
          email_sent_at TIMESTAMP,
          email_error TEXT,
          metadata JSONB DEFAULT '{}'::jsonb
        )
      `;

      console.log('✅ Database tables initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize database tables:', error);
      throw error;
    }
  }

  // Seed with sample data if empty
  async seedSampleData() {
    try {
      // Check if we already have users
      const existingUsers = await sql`SELECT COUNT(*) as count FROM users`;
      if (existingUsers.rows[0].count > 0) {
        console.log('Database already has data, skipping seed');
        return;
      }

      console.log('Seeding database with sample data...');

      // Insert sample users
      const sampleUsers = [
        {
          id: 'user_1',
          google_id: 'google_123456789',
          email: 'john.doe@university.edu',
          name: 'Dr. John Doe',
          picture: 'https://via.placeholder.com/150',
          last_login_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'user_2',
          google_id: 'google_987654321',
          email: 'jane.smith@research.org',
          name: 'Prof. Jane Smith',
          picture: 'https://via.placeholder.com/150',
          last_login_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'user_3',
          google_id: 'google_456789123',
          email: 'mike.wilson@tech.com',
          name: 'Mike Wilson',
          picture: 'https://via.placeholder.com/150',
          last_login_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: false
        }
      ];

      for (const user of sampleUsers) {
        await sql`
          INSERT INTO users (id, google_id, email, name, picture, last_login_at, created_at, is_active)
          VALUES (${user.id}, ${user.google_id}, ${user.email}, ${user.name}, ${user.picture}, 
                  ${user.last_login_at}, ${user.created_at}, ${user.is_active ?? true})
        `;
      }

      // Insert sample documents
      const sampleDocuments = [
        {
          id: 'doc_1',
          user_id: 'user_1',
          title: 'Machine Learning Applications in Healthcare',
          abstract: 'This paper explores the applications of machine learning in modern healthcare systems.',
          keywords: 'machine learning, healthcare, AI, medical diagnosis',
          author_count: 1,
          section_count: 5,
          reference_count: 15,
          created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'doc_2',
          user_id: 'user_2',
          title: 'Quantum Computing: A Comprehensive Review',
          abstract: 'An extensive review of quantum computing principles and applications.',
          keywords: 'quantum computing, quantum mechanics, algorithms, cryptography',
          author_count: 1,
          section_count: 4,
          reference_count: 12,
          created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      for (const doc of sampleDocuments) {
        await sql`
          INSERT INTO documents (id, user_id, title, abstract, keywords, author_count, section_count, reference_count, created_at)
          VALUES (${doc.id}, ${doc.user_id}, ${doc.title}, ${doc.abstract}, ${doc.keywords}, 
                  ${doc.author_count}, ${doc.section_count}, ${doc.reference_count}, ${doc.created_at})
        `;
      }

      // Insert sample downloads
      const sampleDownloads = [
        {
          id: 'download_1',
          user_id: 'user_1',
          document_id: 'doc_1',
          document_title: 'Machine Learning Applications in Healthcare',
          file_format: 'pdf',
          file_size: 245760,
          downloaded_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          metadata: JSON.stringify({
            pageCount: 8,
            wordCount: 3200,
            sectionCount: 5,
            figureCount: 2,
            referenceCount: 15,
            generationTime: 2340
          })
        },
        {
          id: 'download_2',
          user_id: 'user_2',
          document_id: 'doc_2',
          document_title: 'Quantum Computing: A Comprehensive Review',
          file_format: 'docx',
          file_size: 189440,
          downloaded_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          metadata: JSON.stringify({
            pageCount: 6,
            wordCount: 2800,
            sectionCount: 4,
            figureCount: 1,
            referenceCount: 12,
            generationTime: 1890
          })
        },
        {
          id: 'download_3',
          user_id: 'user_1',
          document_id: 'doc_2',
          document_title: 'Quantum Computing: A Comprehensive Review',
          file_format: 'pdf',
          file_size: 298240,
          downloaded_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          metadata: JSON.stringify({
            pageCount: 6,
            wordCount: 2800,
            sectionCount: 4,
            figureCount: 1,
            referenceCount: 12,
            generationTime: 2100
          })
        },
        {
          id: 'download_4',
          user_id: 'user_3',
          document_id: 'doc_1',
          document_title: 'Machine Learning Applications in Healthcare',
          file_format: 'docx',
          file_size: 156672,
          downloaded_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          email_sent: false,
          metadata: JSON.stringify({
            pageCount: 8,
            wordCount: 3200,
            sectionCount: 5,
            figureCount: 2,
            referenceCount: 15,
            generationTime: 1750
          })
        },
        {
          id: 'download_5',
          user_id: 'user_2',
          document_id: 'doc_1',
          document_title: 'Machine Learning Applications in Healthcare',
          file_format: 'pdf',
          file_size: 267264,
          downloaded_at: new Date().toISOString(),
          email_sent: true,
          email_sent_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
          metadata: JSON.stringify({
            pageCount: 8,
            wordCount: 3200,
            sectionCount: 5,
            figureCount: 2,
            referenceCount: 15,
            generationTime: 2200
          })
        }
      ];

      for (const download of sampleDownloads) {
        await sql`
          INSERT INTO downloads (id, user_id, document_id, document_title, file_format, file_size, 
                               downloaded_at, email_sent, email_sent_at, metadata)
          VALUES (${download.id}, ${download.user_id}, ${download.document_id}, ${download.document_title}, 
                  ${download.file_format}, ${download.file_size}, ${download.downloaded_at}, 
                  ${download.email_sent ?? false}, ${download.email_sent_at || null}, ${download.metadata})
        `;
      }

      console.log('✅ Sample data seeded successfully');
    } catch (error) {
      console.error('❌ Failed to seed sample data:', error);
      throw error;
    }
  }

  // User operations
  async getAllUsers() {
    try {
      const result = await sql`
        SELECT id, google_id, email, name, picture, created_at, updated_at, 
               last_login_at, is_active, preferences
        FROM users 
        ORDER BY created_at DESC
      `;
      return result.rows;
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }

  async createUser(userData: any) {
    try {
      const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      
      const result = await sql`
        INSERT INTO users (id, google_id, email, name, picture, created_at, updated_at, last_login_at, is_active, preferences)
        VALUES (${id}, ${userData.google_id}, ${userData.email}, ${userData.name}, ${userData.picture}, 
                ${now}, ${now}, ${now}, ${userData.is_active ?? true}, ${JSON.stringify(userData.preferences || {})})
        RETURNING *
      `;
      return result.rows[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async getUserByEmail(email: string) {
    try {
      const result = await sql`
        SELECT * FROM users WHERE email = ${email} LIMIT 1
      `;
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  }

  // Document operations
  async getAllDocuments() {
    try {
      const result = await sql`
        SELECT d.*, u.name as author_name, u.email as author_email
        FROM documents d
        LEFT JOIN users u ON d.user_id = u.id
        ORDER BY d.created_at DESC
      `;
      return result.rows;
    } catch (error) {
      console.error('Error getting all documents:', error);
      throw error;
    }
  }

  async createDocument(documentData: any) {
    try {
      const id = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      
      const result = await sql`
        INSERT INTO documents (id, user_id, title, abstract, keywords, author_count, section_count, reference_count, created_at, updated_at)
        VALUES (${id}, ${documentData.user_id}, ${documentData.title}, ${documentData.abstract || null}, 
                ${documentData.keywords || null}, ${documentData.author_count || 0}, ${documentData.section_count || 0}, 
                ${documentData.reference_count || 0}, ${now}, ${now})
        RETURNING *
      `;
      return result.rows[0];
    } catch (error) {
      console.error('Error creating document:', error);
      throw error;
    }
  }

  // Download operations
  async getAllDownloads() {
    try {
      const result = await sql`
        SELECT d.*, u.name as user_name, u.email as user_email
        FROM downloads d
        LEFT JOIN users u ON d.user_id = u.id
        ORDER BY d.downloaded_at DESC
      `;
      return result.rows;
    } catch (error) {
      console.error('Error getting all downloads:', error);
      throw error;
    }
  }

  async recordDownload(downloadData: any) {
    try {
      const id = `download_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const result = await sql`
        INSERT INTO downloads (id, user_id, document_id, document_title, file_format, file_size, 
                             downloaded_at, ip_address, user_agent, status, email_sent, metadata)
        VALUES (${id}, ${downloadData.user_id}, ${downloadData.document_id}, ${downloadData.document_title}, 
                ${downloadData.file_format}, ${downloadData.file_size}, ${downloadData.downloaded_at || new Date().toISOString()}, 
                ${downloadData.ip_address || null}, ${downloadData.user_agent || null}, ${downloadData.status || 'completed'}, 
                ${downloadData.email_sent || false}, ${JSON.stringify(downloadData.metadata || {})})
        RETURNING *
      `;
      return result.rows[0];
    } catch (error) {
      console.error('Error recording download:', error);
      throw error;
    }
  }

  // Initialize database on first use
  async initialize() {
    await this.initializeTables();
    // Disable sample data seeding in production
    if (process.env.NODE_ENV === 'development' && process.env.SEED_SAMPLE_DATA === 'true') {
      await this.seedSampleData();
    }
  }
}

export const postgresStorage = new PostgresStorage();