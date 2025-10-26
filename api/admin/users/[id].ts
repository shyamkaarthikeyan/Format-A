import { VercelRequest, VercelResponse } from '@vercel/node';
import AdminMiddleware, { AdminRequest } from '../../_lib/admin-middleware';
import { getStorage } from '../../_lib/storage';

interface UserDetailResponse {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  lastLoginAt: string | null;
  documentCount: number;
  downloadCount: number;
  status: 'active' | 'inactive' | 'suspended';
  role: string;
  profile: {
    lastActiveIP?: string;
    userAgent?: string;
    preferences?: any;
  };
  activity: {
    recentDocuments: {
      id: string;
      title: string;
      createdAt: string;
      downloadCount: number;
    }[];
    recentDownloads: {
      id: string;
      documentTitle: string;
      format: string;
      downloadedAt: string;
    }[];
    loginHistory: {
      timestamp: string;
      ip: string;
      userAgent: string;
    }[];
  };
  statistics: {
    documentsThisMonth: number;
    downloadsThisMonth: number;
    averageDocumentSize: number;
    mostUsedFormat: string;
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      error: 'Invalid user ID',
      message: 'User ID is required and must be a string'
    });
  }

  // Protect with admin middleware
  return AdminMiddleware.protect(
    req as AdminRequest,
    res,
    ['manage_users', 'view_users'],
    async (req: AdminRequest, res: VercelResponse) => {
      try {
        switch (req.method) {
          case 'GET':
            return await handleGetUser(req, res, id);
          case 'PUT':
            return await handleUpdateUser(req, res, id);
          case 'DELETE':
            return await handleDeleteUser(req, res, id);
          default:
            return res.status(405).json({ error: 'Method not allowed' });
        }
      } catch (error) {
        console.error('User management API error:', error);
        res.status(500).json({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );
}

async function handleGetUser(req: AdminRequest, res: VercelResponse, userId: string) {
  await AdminMiddleware.logAdminAction(req, 'view_user_details', { userId });

  const storage = getStorage();
  
  // Get user details
  const user = await storage.getUserById(userId);
  if (!user) {
    return res.status(404).json({
      error: 'User not found',
      message: 'No user found with the specified ID'
    });
  }

  // Get user's documents
  const userDocuments = await storage.getDocumentsByUserId(userId);
  
  // Get user's downloads
  const userDownloads = await storage.getDownloadsByUserId(userId);
  
  // Get user's login history
  const loginHistory = await storage.getLoginHistoryByUserId(userId);

  // Calculate statistics
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const documentsThisMonth = userDocuments.filter((doc: any) => 
    new Date(doc.createdAt) >= thisMonthStart
  ).length;
  
  const downloadsThisMonth = userDownloads.filter((download: any) => 
    new Date(download.downloadedAt || download.createdAt) >= thisMonthStart
  ).length;

  const documentSizes = userDocuments
    .filter((doc: any) => doc.fileSize)
    .map((doc: any) => doc.fileSize);
  const averageDocumentSize = documentSizes.length > 0 
    ? documentSizes.reduce((sum: number, size: number) => sum + size, 0) / documentSizes.length 
    : 0;

  const formatCounts = userDownloads.reduce((acc: any, download: any) => {
    const format = download.format || 'pdf';
    acc[format] = (acc[format] || 0) + 1;
    return acc;
  }, {});
  const mostUsedFormat = Object.keys(formatCounts).reduce((a, b) => 
    formatCounts[a] > formatCounts[b] ? a : b, 'pdf'
  );

  // Format response
  const userDetail: UserDetailResponse = {
    id: user.id,
    name: user.name || 'Anonymous',
    email: user.email,
    createdAt: user.createdAt || new Date().toISOString(),
    lastLoginAt: user.lastLoginAt || null,
    documentCount: userDocuments.length,
    downloadCount: userDownloads.length,
    status: user.status || 'active',
    role: user.role || 'user',
    profile: {
      lastActiveIP: user.lastActiveIP,
      userAgent: user.lastUserAgent,
      preferences: user.preferences || {}
    },
    activity: {
      recentDocuments: userDocuments
        .slice(-10)
        .map((doc: any) => ({
          id: doc.id,
          title: doc.title || 'Untitled Document',
          createdAt: doc.createdAt,
          downloadCount: doc.downloadCount || 0
        })),
      recentDownloads: userDownloads
        .slice(-10)
        .map((download: any) => ({
          id: download.id,
          documentTitle: download.documentTitle || 'Unknown Document',
          format: download.format || 'pdf',
          downloadedAt: download.downloadedAt || download.createdAt
        })),
      loginHistory: loginHistory.slice(-20).map((login: any) => ({
        timestamp: login.timestamp,
        ip: login.ip || 'Unknown',
        userAgent: login.userAgent || 'Unknown'
      }))
    },
    statistics: {
      documentsThisMonth,
      downloadsThisMonth,
      averageDocumentSize: Math.round(averageDocumentSize / 1024), // Convert to KB
      mostUsedFormat
    }
  };

  res.status(200).json({
    success: true,
    data: userDetail
  });
}

async function handleUpdateUser(req: AdminRequest, res: VercelResponse, userId: string) {
  const { name, email, status, role, preferences } = req.body;

  await AdminMiddleware.logAdminAction(req, 'update_user', {
    userId,
    changes: { name, email, status, role }
  });

  const storage = getStorage();
  
  // Get existing user
  const existingUser = await storage.getUserById(userId);
  if (!existingUser) {
    return res.status(404).json({
      error: 'User not found',
      message: 'No user found with the specified ID'
    });
  }

  // Check if email is being changed and if it's already taken
  if (email && email !== existingUser.email) {
    const emailExists = await storage.getUserByEmail(email);
    if (emailExists && emailExists.id !== userId) {
      return res.status(409).json({
        error: 'Email already exists',
        message: 'Another user already has this email address'
      });
    }
  }

  // Update user data
  const updatedUser = {
    ...existingUser,
    ...(name !== undefined && { name }),
    ...(email !== undefined && { email }),
    ...(status !== undefined && { status }),
    ...(role !== undefined && { role }),
    ...(preferences !== undefined && { preferences }),
    updatedAt: new Date().toISOString()
  };

  await storage.updateUser(userId, updatedUser);

  // Return updated user data without sensitive fields
  const { password, ...userResponse } = updatedUser;

  res.status(200).json({
    success: true,
    data: userResponse,
    message: 'User updated successfully'
  });
}

async function handleDeleteUser(req: AdminRequest, res: VercelResponse, userId: string) {
  const { permanent = false } = req.query;

  await AdminMiddleware.logAdminAction(req, 'delete_user', {
    userId,
    permanent: permanent === 'true'
  });

  const storage = getStorage();
  
  // Get existing user
  const existingUser = await storage.getUserById(userId);
  if (!existingUser) {
    return res.status(404).json({
      error: 'User not found',
      message: 'No user found with the specified ID'
    });
  }

  // Prevent deletion of admin users
  if (existingUser.role === 'admin') {
    return res.status(403).json({
      error: 'Cannot delete admin user',
      message: 'Admin users cannot be deleted'
    });
  }

  if (permanent === 'true') {
    // Permanent deletion - remove all user data
    await storage.deleteUser(userId, true);
    
    res.status(200).json({
      success: true,
      message: 'User permanently deleted'
    });
  } else {
    // Soft deletion - mark as suspended
    const updatedUser = {
      ...existingUser,
      status: 'suspended',
      suspendedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await storage.updateUser(userId, updatedUser);

    res.status(200).json({
      success: true,
      message: 'User suspended successfully'
    });
  }
}