import dotenv from 'dotenv';

// Load environment variables first
dotenv.config({ path: '.env.local' });

// Import the database module
const { neonDb } = await import('./api/_lib/neon-database.js');

async function fixDatabaseSchema() {
  try {
    console.log('🔧 Fixing database schema...');
    
    // Test connection
    const isConnected = await neonDb.testConnection();
    if (!isConnected) {
      console.error('❌ Database connection failed');
      return;
    }
    
    console.log('✅ Database connection successful');
    
    // Check current downloads table schema
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    console.log('🔧 Checking downloads table schema...');
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'downloads' AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    
    console.log('Current downloads table columns:');
    if (columns && columns.rows) {
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      // Check if document_metadata column exists
      const hasDocumentMetadata = columns.rows.some(col => col.column_name === 'document_metadata');
      
      if (!hasDocumentMetadata) {
        console.log('🔧 Adding missing document_metadata column...');
        await sql`ALTER TABLE downloads ADD COLUMN document_metadata JSONB DEFAULT '{}'::jsonb`;
        console.log('✅ Added document_metadata column');
      } else {
        console.log('✅ document_metadata column already exists');
      }
      
      // Check if generation_time_ms column exists
      const hasGenerationTime = columns.rows.some(col => col.column_name === 'generation_time_ms');
      
      if (!hasGenerationTime) {
        console.log('🔧 Adding missing generation_time_ms column...');
        await sql`ALTER TABLE downloads ADD COLUMN generation_time_ms INTEGER DEFAULT 0`;
        console.log('✅ Added generation_time_ms column');
      } else {
        console.log('✅ generation_time_ms column already exists');
      }
    } else {
      console.log('No columns found or table does not exist');
    }
    
    // Verify the fix
    console.log('🔧 Verifying schema fix...');
    const updatedColumns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'downloads' AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    
    console.log('Updated downloads table columns:');
    updatedColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    console.log('✅ Database schema fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Schema fix failed:', error);
    console.error('Error details:', error.message);
  }
}

fixDatabaseSchema();