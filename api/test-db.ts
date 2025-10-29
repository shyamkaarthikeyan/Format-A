import { VercelRequest, VercelResponse } from '@vercel/node';
import { neonDb } from './_lib/neon-database.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log('🔧 Testing database connection...');
    
    // Test basic connection
    const isConnected = await neonDb.testConnection();
    
    if (!isConnected) {
      return res.status(500).json({
        success: false,
        error: 'Database connection failed',
        details: 'Could not connect to Neon database'
      });
    }

    // Test database initialization
    await neonDb.initialize();
    
    // Test getting users (should work even if empty)
    const users = await neonDb.getAllUsers();
    
    return res.status(200).json({
      success: true,
      message: 'Database connection successful',
      data: {
        connected: true,
        userCount: users.length,
        connectionHealth: neonDb.getConnectionHealth()
      }
    });

  } catch (error) {
    console.error('❌ Database test failed:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Database test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}