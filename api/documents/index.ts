import { VercelRequest, VercelResponse } from '@vercel/node';
import { getStorage } from '../_lib/storage';

interface DocumentData {
  title: string;
  content: any[];
  source?: string;
  originalModified?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Get user from session
    const sessionId = req.cookies?.sessionId;
    if (!sessionId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const storage = getStorage();
    const user = await storage.getUserBySessionId(sessionId);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    switch (req.method) {
      case 'GET':
        return handleGetDocuments(req, res, user.id);
      case 'POST':
        return handleCreateDocument(req, res, user.id);
      case 'PUT':
        return handleUpdateDocument(req, res, user.id);
      case 'DELETE':
        return handleDeleteDocument(req, res, user.id);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Documents API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleGetDocuments(req: VercelRequest, res: VercelResponse, userId: string) {
  try {
    const storage = getStorage();
    const documents = await storage.getUserDocuments(userId);
    
    return res.status(200).json({
      success: true,
      documents: documents.map(doc => ({
        id: doc.id,
        title: doc.title,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        source: doc.source
      }))
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return res.status(500).json({ error: 'Failed to fetch documents' });
  }
}

async function handleCreateDocument(req: VercelRequest, res: VercelResponse, userId: string) {
  try {
    const { title, content, source, originalModified }: DocumentData = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const storage = getStorage();
    
    // Create document record
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const document = {
      id: documentId,
      userId,
      title: title.trim(),
      content: JSON.stringify(content),
      source: source || 'manual',
      createdAt: now,
      updatedAt: now,
      originalModified: originalModified || now
    };

    await storage.createDocument(document);
    
    // Log the migration if it's from guest mode
    if (source === 'guest_migration') {
      console.log(`📄 Guest document migrated for user ${userId}: ${title}`);
    }

    return res.status(201).json({
      success: true,
      documentId,
      message: 'Document created successfully'
    });
  } catch (error) {
    console.error('Error creating document:', error);
    return res.status(500).json({ error: 'Failed to create document' });
  }
}

async function handleUpdateDocument(req: VercelRequest, res: VercelResponse, userId: string) {
  try {
    const { documentId, title, content } = req.body;
    
    if (!documentId) {
      return res.status(400).json({ error: 'Document ID is required' });
    }

    const storage = getStorage();
    
    // Verify document ownership
    const document = await storage.getDocument(documentId);
    if (!document || document.userId !== userId) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Update document
    const updates: any = {
      updatedAt: new Date().toISOString()
    };
    
    if (title) updates.title = title.trim();
    if (content) updates.content = JSON.stringify(content);

    await storage.updateDocument(documentId, updates);

    return res.status(200).json({
      success: true,
      message: 'Document updated successfully'
    });
  } catch (error) {
    console.error('Error updating document:', error);
    return res.status(500).json({ error: 'Failed to update document' });
  }
}

async function handleDeleteDocument(req: VercelRequest, res: VercelResponse, userId: string) {
  try {
    const { documentId } = req.body;
    
    if (!documentId) {
      return res.status(400).json({ error: 'Document ID is required' });
    }

    const storage = getStorage();
    
    // Verify document ownership
    const document = await storage.getDocument(documentId);
    if (!document || document.userId !== userId) {
      return res.status(404).json({ error: 'Document not found' });
    }

    await storage.deleteDocument(documentId);

    return res.status(200).json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    return res.status(500).json({ error: 'Failed to delete document' });
  }
}