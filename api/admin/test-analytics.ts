import { VercelRequest, VercelResponse } from '@vercel/node';
import { getStorage } from '../_lib/storage';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const storage = getStorage();
    
    // Test basic storage functionality
    const users = await storage.getAllUsers();
    const documents = await storage.getAllDocuments();
    
    // Create simple analytics without admin middleware
    const analytics = {
      totalUsers: users.length,
      totalDocuments: documents.length,
      users: users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      })),
      documents: documents.map(doc => ({
        id: doc.id,
        userId: doc.userId,
        title: doc.title,
        createdAt: doc.createdAt
      }))
    };

    res.status(200).json({
      success: true,
      message: 'Test analytics working without admin middleware',
      data: analytics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Test analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate test analytics',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}