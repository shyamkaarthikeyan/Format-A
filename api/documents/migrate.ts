import { VercelRequest, VercelResponse } from '@vercel/node';
import { getStorage } from '../_lib/storage';

interface MigrationRequest {
  userId: string;
  title: string;
  content: string;
  metadata: {
    migratedFrom: string;
    originalLastModified: string;
    migrationDate: string;
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, title, content, metadata }: MigrationRequest = req.body;

    // Validate required fields
    if (!userId || !title || !content) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, title, content' 
      });
    }

    // Get storage instance
    const storage = getStorage();

    // Create document record for migrated guest document
    const migratedDocument = {
      id: `migrated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      title,
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        ...metadata,
        type: 'migrated_guest_document',
        version: '1.0'
      }
    };

    // Store the migrated document
    await storage.createDocument(migratedDocument);

    // Log the migration for analytics
    console.log(`Document migrated for user ${userId}: ${title}`);

    // Return success response
    res.status(200).json({
      success: true,
      documentId: migratedDocument.id,
      message: 'Document successfully migrated to user account'
    });

  } catch (error) {
    console.error('Error migrating document:', error);
    
    // Return error response
    res.status(500).json({
      error: 'Internal server error during document migration',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}