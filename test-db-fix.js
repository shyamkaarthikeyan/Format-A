import dotenv from 'dotenv';
import { neonDb } from './api/_lib/neon-database.js';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testAndFixDatabase() {
  try {
    console.log('🔧 Testing database connection...');
    
    // Test connection
    const isConnected = await neonDb.testConnection();
    if (!isConnected) {
      console.error('❌ Database connection failed');
      return;
    }
    
    console.log('✅ Database connection successful');
    
    // Initialize tables
    console.log('🔧 Initializing database tables...');
    await neonDb.initializeTables();
    
    console.log('✅ Database initialization complete');
    
    // Test creating a simple user
    console.log('🔧 Testing user creation...');
    const testUser = await neonDb.createOrUpdateUser({
      google_id: 'test_google_123',
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/pic.jpg'
    });
    
    console.log('✅ User created:', testUser.email);
    
    // Test creating a simple document
    console.log('🔧 Testing document creation...');
    const testDoc = await neonDb.createDocument({
      id: 'test_doc_123',
      user_id: testUser.id,
      title: 'Test Document',
      content: { test: 'content' },
      document_type: 'ieee_paper',
      word_count: 100,
      page_count: 1,
      section_count: 1,
      figure_count: 0,
      reference_count: 0
    });
    
    console.log('✅ Document created:', testDoc.title);
    
    // Clean up test data
    await neonDb.deleteDocument(testDoc.id);
    await neonDb.deleteUser(testUser.id);
    
    console.log('✅ Test completed successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAndFixDatabase();