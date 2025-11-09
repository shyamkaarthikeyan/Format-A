import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: 'Only POST method is allowed'
    });
  }

  try {
    const { action, confirm, keep_structure } = req.body;

    // Validate request
    if (action !== 'clear_all_data') {
      return res.status(400).json({
        success: false,
        error: 'Invalid action',
        message: 'Action must be "clear_all_data"'
      });
    }

    if (confirm !== 'yes_clear_everything') {
      return res.status(400).json({
        success: false,
        error: 'Confirmation required',
        message: 'Must confirm with "yes_clear_everything"'
      });
    }

    // Check database configuration
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured',
        message: 'DATABASE_URL environment variable not found'
      });
    }

    console.log('🧹 Starting database clear operation...');

    // Import database module
    const { NeonDatabase } = await import('./_lib/neon-database.js');
    const db = new NeonDatabase();

    // Test connection first
    const isHealthy = await db.testConnection();
    if (!isHealthy) {
      return res.status(500).json({
        success: false,
        error: 'Database connection failed',
        message: 'Cannot connect to database'
      });
    }

    // Clear all data while preserving structure
    console.log('🗑️  Executing clearAllData operation...');
    const result = await db.clearAllData(keep_structure !== false);

    console.log('✅ Database clear operation completed');

    return res.json({
      success: true,
      message: 'All database data cleared successfully',
      data: result,
      warning: 'All user data, documents, downloads, and sessions have been deleted',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error clearing database data:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to clear database data',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}