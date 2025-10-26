import { VercelRequest, VercelResponse } from '@vercel/node';
import AdminMiddleware, { AdminRequest } from '../../_lib/admin-middleware';
import { getStorage } from '../../_lib/storage';

interface UserListQuery {
  page?: string;
  limit?: string;
  search?: string;
  sortBy?: 'name' | 'email' | 'createdAt' | 'lastLoginAt' | 'documentCount' | 'downloadCount';
  sortOrder?: 'asc' | 'desc';
  filter?: 'all' | 'active' | 'inactive' | 'new';
}

interface UserListResponse {
  users: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
    lastLoginAt: string | null;
    documentCount: number;
    downloadCount: number;
    isActive: boolean;
    status: 'active' | 'inactive' | 'suspended';
  }[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  summary: {
    totalUsers: number;
    activeUsers: number;
    newUsersThisMonth: number;
    suspendedUsers: number;
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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
            return await handleGetUsers(req, res);
          case 'POST':
            return await handleCreateUser(req, res);
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

async function handleGetUsers(req: AdminRequest, res: VercelResponse) {
  const {
    page = '1',
    limit = '20',
    search = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
    filter = 'all'
  } = req.query as UserListQuery;

  await AdminMiddleware.logAdminAction(req, 'list_users', {
    page,
    limit,
    search,
    sortBy,
    sortOrder,
    filter
  });

  const storage = getStorage();
  
  // Get all users
  const allUsers = await storage.getAllUsers();
  
  // Apply search filter
  let filteredUsers = allUsers;
  if (search) {
    const searchLower = search.toLowerCase();
    filteredUsers = allUsers.filter((user: any) =>
      user.name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.id?.toLowerCase().includes(searchLower)
    );
  }

  // Apply status filter
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
  
  if (filter !== 'all') {
    filteredUsers = filteredUsers.filter((user: any) => {
      switch (filter) {
        case 'active':
          return user.lastLoginAt && new Date(user.lastLoginAt) > thirtyDaysAgo;
        case 'inactive':
          return !user.lastLoginAt || new Date(user.lastLoginAt) <= thirtyDaysAgo;
        case 'new':
          return user.createdAt && new Date(user.createdAt) > thirtyDaysAgo;
        default:
          return true;
      }
    });
  }

  // Apply sorting
  filteredUsers.sort((a: any, b: any) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];

    // Handle date fields
    if (sortBy === 'createdAt' || sortBy === 'lastLoginAt') {
      aValue = aValue ? new Date(aValue).getTime() : 0;
      bValue = bValue ? new Date(bValue).getTime() : 0;
    }

    // Handle numeric fields
    if (sortBy === 'documentCount' || sortBy === 'downloadCount') {
      aValue = aValue || 0;
      bValue = bValue || 0;
    }

    // Handle string fields
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    } else {
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
    }
  });

  // Apply pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const startIndex = (pageNum - 1) * limitNum;
  const endIndex = startIndex + limitNum;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Format user data
  const users = paginatedUsers.map((user: any) => ({
    id: user.id,
    name: user.name || 'Anonymous',
    email: user.email,
    createdAt: user.createdAt || new Date().toISOString(),
    lastLoginAt: user.lastLoginAt || null,
    documentCount: user.documentCount || 0,
    downloadCount: user.downloadCount || 0,
    isActive: user.lastLoginAt && new Date(user.lastLoginAt) > thirtyDaysAgo,
    status: user.status || (user.lastLoginAt && new Date(user.lastLoginAt) > thirtyDaysAgo ? 'active' : 'inactive')
  }));

  // Calculate summary statistics
  const totalUsers = allUsers.length;
  const activeUsers = allUsers.filter((user: any) => 
    user.lastLoginAt && new Date(user.lastLoginAt) > thirtyDaysAgo
  ).length;
  const newUsersThisMonth = allUsers.filter((user: any) => 
    user.createdAt && new Date(user.createdAt) > thirtyDaysAgo
  ).length;
  const suspendedUsers = allUsers.filter((user: any) => user.status === 'suspended').length;

  const response: UserListResponse = {
    users,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: filteredUsers.length,
      totalPages: Math.ceil(filteredUsers.length / limitNum),
      hasNext: endIndex < filteredUsers.length,
      hasPrev: pageNum > 1
    },
    summary: {
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      suspendedUsers
    }
  };

  res.status(200).json({
    success: true,
    data: response
  });
}

async function handleCreateUser(req: AdminRequest, res: VercelResponse) {
  const { name, email, password, role = 'user' } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'Email and password are required'
    });
  }

  await AdminMiddleware.logAdminAction(req, 'create_user', {
    email,
    name,
    role
  });

  const storage = getStorage();
  
  // Check if user already exists
  const existingUser = await storage.getUserByEmail(email);
  if (existingUser) {
    return res.status(409).json({
      error: 'User already exists',
      message: 'A user with this email already exists'
    });
  }

  // Create new user
  const newUser = {
    id: generateUserId(),
    name: name || 'New User',
    email,
    password: await hashPassword(password), // In real implementation, hash the password
    role,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
    documentCount: 0,
    downloadCount: 0,
    status: 'active'
  };

  await storage.createUser(newUser);

  // Return user data without password
  const { password: _, ...userResponse } = newUser;

  res.status(201).json({
    success: true,
    data: userResponse,
    message: 'User created successfully'
  });
}

// Helper functions
function generateUserId(): string {
  return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

async function hashPassword(password: string): Promise<string> {
  // In a real implementation, use bcrypt or similar
  // For now, just return a placeholder hash
  return 'hashed_' + password;
}