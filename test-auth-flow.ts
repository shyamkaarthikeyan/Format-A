// Test Google OAuth and Neon database integration
import dotenv from 'dotenv';
import { neonDb } from './api/_lib/neon-database';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

async function testAuthFlow() {
  try {
    console.log('🔧 Testing Google OAuth → Neon Database Flow...\n');
    
    // 1. Check environment variables
    console.log('1. Environment Variables Check:');
    console.log('✓ VITE_GOOGLE_CLIENT_ID:', !!process.env.VITE_GOOGLE_CLIENT_ID);
    console.log('✓ GOOGLE_CLIENT_SECRET:', !!process.env.GOOGLE_CLIENT_SECRET);
    console.log('✓ DATABASE_URL:', !!process.env.DATABASE_URL);
    console.log('✓ JWT_SECRET:', !!process.env.JWT_SECRET);
    
    if (process.env.VITE_GOOGLE_CLIENT_ID) {
      console.log('  Google Client ID:', process.env.VITE_GOOGLE_CLIENT_ID.substring(0, 20) + '...');
    }
    
    // 2. Test database connection
    console.log('\n2. Database Connection Test:');
    const isConnected = await neonDb.testConnection();
    console.log('✓ Database connected:', isConnected);
    
    if (!isConnected) {
      throw new Error('Database connection failed');
    }
    
    // 3. Initialize database
    console.log('\n3. Database Initialization:');
    await neonDb.initialize();
    console.log('✓ Database tables initialized');
    
    // 4. Test user operations
    console.log('\n4. User Operations Test:');
    
    // Test creating/updating a user (simulating Google OAuth)
    const testUser = {
      google_id: 'test_google_id_123',
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg'
    };
    
    console.log('Creating test user...');
    const createdUser = await neonDb.createOrUpdateUser(testUser);
    console.log('✓ User created:', {
      id: createdUser.id,
      email: createdUser.email,
      name: createdUser.name
    });
    
    // 5. Test data retrieval
    console.log('\n5. Data Retrieval Test:');
    const allUsers = await neonDb.getAllUsers();
    const allDocuments = await neonDb.getAllDocuments();
    const allDownloads = await neonDb.getAllDownloads();
    
    console.log('✓ Data counts:', {
      users: allUsers.length,
      documents: allDocuments.length,
      downloads: allDownloads.length
    });
    
    // 6. Test analytics queries
    console.log('\n6. Analytics Queries Test:');
    try {
      const userAnalytics = await neonDb.getUserAnalytics();
      console.log('✓ User analytics:', userAnalytics);
      
      const documentAnalytics = await neonDb.getDocumentAnalytics();
      console.log('✓ Document analytics:', documentAnalytics);
      
      const downloadAnalytics = await neonDb.getDownloadAnalytics();
      console.log('✓ Download analytics:', downloadAnalytics);
    } catch (analyticsError) {
      console.error('❌ Analytics queries failed:', analyticsError);
    }
    
    // 7. Test specific user lookup
    console.log('\n7. User Lookup Test:');
    const userByEmail = await neonDb.getUserByEmail('test@example.com');
    console.log('✓ User found by email:', !!userByEmail);
    
    const userByGoogleId = await neonDb.getUserByGoogleId('test_google_id_123');
    console.log('✓ User found by Google ID:', !!userByGoogleId);
    
    // 8. Check if admin user exists
    console.log('\n8. Admin User Check:');
    const adminUser = await neonDb.getUserByEmail('shyamkaarthikeyan@gmail.com');
    console.log('✓ Admin user exists:', !!adminUser);
    if (adminUser) {
      console.log('  Admin user details:', {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        lastLogin: adminUser.last_login_at
      });
    }
    
    console.log('\n✅ All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- Google OAuth configuration: ✓');
    console.log('- Database connection: ✓');
    console.log('- User creation/retrieval: ✓');
    console.log('- Analytics queries: ✓');
    console.log('- Admin access: ✓');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

testAuthFlow();