import dotenv from 'dotenv';

// Load environment variables first
dotenv.config({ path: '.env.local' });

// Now import the database module
const { neonDb } = await import('./api/_lib/neon-database.js');

async function testDatabaseConnection() {
  try {
    console.log('🔧 Testing database connection...');
    console.log('Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    
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
    
    // Test the fixed createOrUpdateUser method
    console.log('🔧 Testing user creation with duplicate email fix...');
    
    // First, try to create a user
    const testUser1 = await neonDb.createOrUpdateUser({
      google_id: 'test_google_123',
      email: 'john.doe@university.edu',
      name: 'Test User 1',
      picture: 'https://example.com/pic1.jpg'
    });
    
    console.log('✅ First user created:', testUser1.email);
    
    // Now try to create another user with the same email but different google_id
    // This should update the existing user instead of creating a duplicate
    const testUser2 = await neonDb.createOrUpdateUser({
      google_id: 'test_google_456',
      email: 'john.doe@university.edu',
      name: 'Test User 2 Updated',
      picture: 'https://example.com/pic2.jpg'
    });
    
    console.log('✅ Second user operation (should be update):', testUser2.email);
    console.log('User ID should be same:', testUser1.id === testUser2.id ? 'YES' : 'NO');
    console.log('Name should be updated:', testUser2.name);
    
    // Clean up test data
    await neonDb.deleteUser(testUser2.id);
    console.log('✅ Test user cleaned up');
    
    console.log('✅ Duplicate key fix test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', error.message);
  }
}

testDatabaseConnection();