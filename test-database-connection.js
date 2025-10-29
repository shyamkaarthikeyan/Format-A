// Test database connection after Neon setup
// Run this with: node test-database-connection.js

import dotenv from 'dotenv';
import { sql } from '@vercel/postgres';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test basic connection
    const result = await sql`SELECT NOW() as current_time`;
    console.log('✅ Database connected successfully!');
    console.log('Current time:', result.rows[0].current_time);
    
    // Test if tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    console.log('\n📋 Existing tables:');
    if (tables.rows.length === 0) {
      console.log('No tables found - database needs initialization');
    } else {
      tables.rows.forEach(row => console.log(`- ${row.table_name}`));
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('\n🔧 Make sure you have:');
    console.log('1. Created Vercel Postgres database');
    console.log('2. Connected it to your project');
    console.log('3. Environment variables are set');
  }
}

testConnection();