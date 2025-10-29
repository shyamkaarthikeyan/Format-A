import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

// Load environment variables first
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

async function directDatabaseFix() {
  try {
    console.log('🔧 Direct database fix...');
    console.log('Database URL exists:', !!process.env.DATABASE_URL);
    
    // Test connection
    await sql`SELECT 1 as test`;
    console.log('✅ Database connection successful');
    
    // Check if downloads table exists
    console.log('🔧 Checking if downloads table exists...');
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'downloads'
      )
    `;
    
    console.log('Table exists result:', tableExists);
    const exists = tableExists && tableExists.length > 0 ? tableExists[0].exists : false;
    console.log('Downloads table exists:', exists);
    
    if (!exists) {
      console.log('🔧 Creating downloads table...');
      await sql`
        CREATE TABLE downloads (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255),
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
      console.log('✅ Downloads table created');
    } else {
      // Check columns
      const columns = await sql`
        SELECT column_name, data_type
        FROM information_schema.columns 
        WHERE table_name = 'downloads' AND table_schema = 'public'
        ORDER BY ordinal_position
      `;
      
      console.log('Current columns:');
      if (columns && columns.length > 0) {
        columns.forEach(col => {
          console.log(`  - ${col.column_name}: ${col.data_type}`);
        });
        
        // Add missing columns
        const hasDocumentMetadata = columns.some(col => col.column_name === 'document_metadata');
        if (!hasDocumentMetadata) {
          console.log('🔧 Adding document_metadata column...');
          await sql`ALTER TABLE downloads ADD COLUMN document_metadata JSONB DEFAULT '{}'::jsonb`;
          console.log('✅ Added document_metadata column');
        } else {
          console.log('✅ document_metadata column already exists');
        }
        
        const hasGenerationTime = columns.some(col => col.column_name === 'generation_time_ms');
        if (!hasGenerationTime) {
          console.log('🔧 Adding generation_time_ms column...');
          await sql`ALTER TABLE downloads ADD COLUMN generation_time_ms INTEGER DEFAULT 0`;
          console.log('✅ Added generation_time_ms column');
        } else {
          console.log('✅ generation_time_ms column already exists');
        }
      } else {
        console.log('No columns found');
      }
    }
    
    // Test inserting a record
    console.log('🔧 Testing download record insertion...');
    const testId = `test_${Date.now()}`;
    await sql`
      INSERT INTO downloads (id, user_id, document_title, file_format, file_size, document_metadata)
      VALUES (${testId}, 'test_user', 'Test Document', 'pdf', 1024, '{"test": true}'::jsonb)
    `;
    console.log('✅ Test record inserted');
    
    // Clean up test record
    await sql`DELETE FROM downloads WHERE id = ${testId}`;
    console.log('✅ Test record cleaned up');
    
    console.log('✅ Direct database fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Direct database fix failed:', error);
    console.error('Error details:', error.message);
  }
}

directDatabaseFix();