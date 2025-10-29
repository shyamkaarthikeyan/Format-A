// Test database connection
import dotenv from 'dotenv';
import { neonDb } from './api/_lib/neon-database';

// Load environment variables from .env.local first, then .env
dotenv.config({ path: '.env.local' });
dotenv.config();

async function testConnection() {
  try {
    console.log('🔧 Testing database connection...');
    
    // Debug environment variables
    console.log('Environment check:');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    if (process.env.DATABASE_URL) {
      console.log('DATABASE_URL starts with:', process.env.DATABASE_URL.substring(0, 30) + '...');
    }
    
    // Test basic connection
    const isConnected = await neonDb.testConnection();
    console.log('Connection test result:', isConnected);
    
    if (isConnected) {
      console.log('✅ Database connection successful');
      
      // Try to initialize tables
      await neonDb.initialize();
      console.log('✅ Database initialization successful');
      
      // Test basic queries
      const users = await neonDb.getAllUsers();
      const documents = await neonDb.getAllDocuments();
      const downloads = await neonDb.getAllDownloads();
      
      console.log('📊 Data counts:', {
        users: users.length,
        documents: documents.length,
        downloads: downloads.length
      });
      
      console.log('✅ All database operations working correctly');
      
      // Test a specific analytics query
      console.log('🔍 Testing analytics query...');
      const userAnalytics = await neonDb.getUserAnalytics();
      console.log('User analytics:', userAnalytics);
      
    } else {
      console.log('❌ Database connection failed');
    }
  } catch (error) {
    console.error('❌ Database test failed:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

testConnection();