import { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow in development or with special token
  if (process.env.NODE_ENV === 'production' && req.query.token !== 'cleanup-fake-data-2024') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden - cleanup not allowed in production without token'
    });
  }

  try {
    const sql = neon(process.env.DATABASE_URL!, {
      fullResults: true,
      arrayMode: false
    });

    // Identify and list fake users
    const fakeEmails = [
      'john.doe@university.edu',
      'jane.smith@research.org', 
      'mike.wilson@tech.com'
    ];

    // Get fake users before deletion
    const fakeUsersResult = await sql`
      SELECT id, email, name, created_at 
      FROM users 
      WHERE email = ANY(${fakeEmails})
    `;
    const fakeUsers = (fakeUsersResult.rows || fakeUsersResult) as any[];

    // Delete fake users and their related data
    let deletedUsers = 0;
    let deletedDocuments = 0;
    let deletedDownloads = 0;

    if (fakeUsers.length > 0) {
      const fakeUserIds = fakeUsers.map(u => u.id);

      // Delete downloads first (foreign key constraint)
      try {
        const deletedDownloadsResult = await sql`
          DELETE FROM downloads 
          WHERE user_id = ANY(${fakeUserIds})
        `;
        deletedDownloads = (deletedDownloadsResult as any).count || 0;
      } catch (e) {
        console.log('No downloads table or no downloads to delete');
      }

      // Delete documents
      try {
        const deletedDocumentsResult = await sql`
          DELETE FROM documents 
          WHERE user_id = ANY(${fakeUserIds})
        `;
        deletedDocuments = (deletedDocumentsResult as any).count || 0;
      } catch (e) {
        console.log('No documents table or no documents to delete');
      }

      // Delete fake users
      const deletedUsersResult = await sql`
        DELETE FROM users 
        WHERE email = ANY(${fakeEmails})
      `;
      deletedUsers = (deletedUsersResult as any).count || 0;
    }

    // Get remaining users (should be real users only)
    const remainingUsersResult = await sql`
      SELECT id, email, name, created_at, last_login_at
      FROM users 
      ORDER BY created_at DESC
    `;
    const remainingUsers = (remainingUsersResult.rows || remainingUsersResult) as any[];

    return res.status(200).json({
      success: true,
      message: 'Fake data cleanup completed',
      data: {
        fakeUsersFound: fakeUsers,
        deletedCounts: {
          users: deletedUsers,
          documents: deletedDocuments,
          downloads: deletedDownloads
        },
        remainingUsers: remainingUsers,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
