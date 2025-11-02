const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function testAndInitDatabase() {
  console.log('🔧 Testing database connection...');
  
  try {
    const sql = neon(process.env.DATABASE_URL, {
      fullResults: true,
      arrayMode: false
    });

    // Test connection
    const testResult = await sql`SELECT 1 as test`;
    console.log('✅ Database connection successful');

    // Check if users table exists
    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
    `;
    
    console.log('Tables check result:', tablesResult);

    if (tablesResult.length === 0) {
      console.log('📝 Creating users table...');
      
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
          google_id VARCHAR(255) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          picture TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          last_login_at TIMESTAMP DEFAULT NOW(),
          is_active BOOLEAN DEFAULT true,
          preferences JSONB DEFAULT '{"emailNotifications": true, "defaultExportFormat": "pdf", "theme": "light"}'::jsonb
        )
      `;

      // Create indexes
      await sql`CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
      
      console.log('✅ Users table created successfully');
    } else {
      console.log('✅ Users table already exists');
    }

    // Test user creation
    console.log('🧪 Testing user creation...');
    
    const testUser = {
      google_id: 'test_' + Date.now(),
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://via.placeholder.com/150'
    };

    const createResult = await sql`
      INSERT INTO users (google_id, email, name, picture, created_at, updated_at, last_login_at)
      VALUES (${testUser.google_id}, ${testUser.email}, ${testUser.name}, 
              ${testUser.picture}, NOW(), NOW(), NOW())
      RETURNING *
    `;

    console.log('✅ Test user created:', createResult[0]);

    // Clean up test user
    await sql`DELETE FROM users WHERE google_id = ${testUser.google_id}`;
    console.log('✅ Test user cleaned up');

    console.log('🎉 Database initialization test completed successfully!');

  } catch (error) {
    console.error('❌ Database test failed:', error);
    
    if (error.message?.includes('connect')) {
      console.error('Connection issue - check DATABASE_URL');
    } else if (error.message?.includes('permission')) {
      console.error('Permission issue - check database credentials');
    } else if (error.message?.includes('syntax')) {
      console.error('SQL syntax issue - check query format');
    }
    
    process.exit(1);
  }
}

testAndInitDatabase();
