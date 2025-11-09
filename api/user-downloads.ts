import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: 'Only GET requests are supported'
    });
  }

  try {
    const { userId, page = '1', limit = '20' } = req.query;

    // Validate required parameters
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid userId parameter',
        message: 'userId is required and must be a string'
      });
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;

    console.log('🔍 USER DOWNLOADS ENDPOINT - Processing request:', { 
      userId, 
      page: pageNum, 
      limit: limitNum,
      method: req.method,
      url: req.url
    });

    // Check database configuration
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL not configured');
      return res.status(500).json({
        success: false,
        error: 'Database not configured',
        message: 'DATABASE_URL environment variable is missing'
      });
    }

    // Import database utilities
    const { NeonDatabase } = await import('./_lib/neon-database.js');
    const db = new NeonDatabase();

    // Initialize tables if needed
    await db.initializeTables();

    // Get user downloads with pagination
    console.log('📥 Fetching downloads for user:', userId);
    const downloads = await db.getUserDownloads(userId, pageNum, limitNum);

    console.log('✅ Downloads retrieved successfully:', {
      downloadsCount: downloads?.downloads?.length || 0,
      totalItems: downloads?.pagination?.totalItems || 0,
      currentPage: downloads?.pagination?.currentPage || pageNum
    });

    // Ensure we return the correct structure
    const response = {
      success: true,
      data: downloads || {
        downloads: [],
        pagination: {
          currentPage: pageNum,
          totalPages: 0,
          totalItems: 0,
          hasNext: false,
          hasPrev: false,
          limit: limitNum
        }
      },
      message: `Retrieved downloads for user ${userId}`,
      metadata: {
        userId,
        page: pageNum,
        limit: limitNum,
        downloadsFound: downloads?.downloads?.length || 0,
        endpoint: 'dedicated-user-downloads'
      }
    };

    console.log('📤 Returning user downloads response');
    return res.json(response);

  } catch (error) {
    console.error('❌ Error in user downloads endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch user downloads',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      debug: {
        error: error instanceof Error ? error.message : 'Unknown error',
        endpoint: 'dedicated-user-downloads-error'
      }
    });
  }
}