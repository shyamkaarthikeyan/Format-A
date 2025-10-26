import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('Test auth endpoint called');
    
    // Test basic functionality
    const testData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      headers: Object.keys(req.headers),
      hasBody: !!req.body,
      bodyKeys: req.body ? Object.keys(req.body) : []
    };

    // Test storage import
    let storageTest = 'not tested';
    try {
      const { storage } = await import('./_lib/storage');
      const users = await storage.getAllUsers();
      storageTest = `success - ${users.length} users`;
    } catch (e) {
      storageTest = `failed - ${e instanceof Error ? e.message : 'unknown error'}`;
    }

    return res.json({
      success: true,
      message: 'Test auth endpoint working',
      data: testData,
      storageTest,
      nodeVersion: process.version,
      platform: process.platform
    });

  } catch (error) {
    console.error('Test auth error:', error);
    return res.status(500).json({
      success: false,
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}