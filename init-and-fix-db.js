import dotenv from 'dotenv';

// Load environment variables first
dotenv.config({ path: '.env.local' });

// Import the database module
const { neonDb } = await import('./api/_lib/neon-database.js');

async function initAndFixDatabase() {
  try {
    console.log('🔧 Initializing and fixing database...');
    
    // Test connection
    const isConnected = await neonDb.testConnection();
    if (!isConnected) {
      console.error('❌ Database connection failed');
      return;
    }
    
    console.log('✅ Database connection successful');
    
    // Initialize tables first
    console.log('🔧 Initializing database tables...');
    await neonDb.initializeTables();
    console.log('✅ Database tables initialized');
    
    // Now check and fix the schema
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    console.log('🔧 Checking downloads table schema...');
    const result = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'downloads' AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    
    console.log('Current downloads table columns:');
    if (result.rows && result.rows.length > 0) {
      result.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      // Check if document_metadata column exists
      const hasDocumentMetadata = result.rows.some(col => col.column_name === 'document_metadata');
      
      if (!hasDocumentMetadata) {
        console.log('🔧 Adding missing document_metadata column...');
        await sql`ALTER TABLE downloads ADD COLUMN document_metadata JSONB DEFAULT '{}'::jsonb`;
        console.log('✅ Added document_metadata column');
      } else {
        console.log('✅ document_metadata column already exists');
      }
      
      // Check if generation_time_ms column exists
      const hasGenerationTime = result.rows.some(col => col.column_name === 'generation_time_ms');
      
      if (!hasGenerationTime) {
        console.log('🔧 Adding missing generation_time_ms column...');
        await sql`ALTER TABLE downloads ADD COLUMN generation_time_ms INTEGER DEFAULT 0`;
        console.log('✅ Added generation_time_ms column');
      } else {
        console.log('✅ generation_time_ms column already exists');
      }
    } else {
      console.log('❌ Downloads table not found or has no columns');
    }
    
    console.log('✅ Database initialization and fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Database init/fix failed:', error);
    console.error('Error details:', error.message);
  }
}

initAndFixDatabase();