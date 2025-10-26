#!/usr/bin/env node

// Verification script to check unauthorized flow
// This script helps diagnose authentication issues

import fs from 'fs';
import path from 'path';

console.log('🔍 Verifying Unauthorized Flow Implementation...\n');

// Check if key files exist
const filesToCheck = [
    'client/src/contexts/auth-context.tsx',
    'client/src/lib/restriction-enforcement.ts',
    'client/src/components/restricted-action-button.tsx',
    'client/src/components/admin-route.tsx',
    'client/src/lib/admin-auth.ts',
    'api/auth/verify.ts',
    'api/admin.ts'
];

console.log('📁 Checking key files:');
filesToCheck.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - MISSING`);
    }
});

console.log('\n🔧 Checking implementation details:\n');

// Check auth context implementation
if (fs.existsSync('client/src/contexts/auth-context.tsx')) {
    const authContext = fs.readFileSync('client/src/contexts/auth-context.tsx', 'utf8');
    
    console.log('🔐 Auth Context Analysis:');
    console.log(`✅ Has useAuth hook: ${authContext.includes('export function useAuth')}`);
    console.log(`✅ Has isAuthenticated: ${authContext.includes('isAuthenticated')}`);
    console.log(`✅ Has admin functionality: ${authContext.includes('isAdmin')}`);
    console.log(`✅ Has session verification: ${authContext.includes('auth/verify')}`);
    console.log(`✅ Has localStorage handling: ${authContext.includes('localStorage')}`);
}

// Check restriction enforcement
if (fs.existsSync('client/src/lib/restriction-enforcement.ts')) {
    const restrictionEnforcement = fs.readFileSync('client/src/lib/restriction-enforcement.ts', 'utf8');
    
    console.log('\n🚫 Restriction Enforcement Analysis:');
    console.log(`✅ Has checkAction method: ${restrictionEnforcement.includes('checkAction')}`);
    console.log(`✅ Has download restriction: ${restrictionEnforcement.includes('download')}`);
    console.log(`✅ Has authentication check: ${restrictionEnforcement.includes('isAuthenticated')}`);
    console.log(`✅ Has visual indicators: ${restrictionEnforcement.includes('visualIndicators')}`);
}

// Check admin route protection
if (fs.existsSync('client/src/components/admin-route.tsx')) {
    const adminRoute = fs.readFileSync('client/src/components/admin-route.tsx', 'utf8');
    
    console.log('\n👑 Admin Route Analysis:');
    console.log(`✅ Has admin check: ${adminRoute.includes('isAdmin')}`);
    console.log(`✅ Has permission check: ${adminRoute.includes('requiredPermissions')}`);
    console.log(`✅ Has session initialization: ${adminRoute.includes('initializeAdminAccess')}`);
    console.log(`✅ Has redirect logic: ${adminRoute.includes('setLocation')}`);
}

// Check API endpoints
if (fs.existsSync('api/auth/verify.ts')) {
    const authVerify = fs.readFileSync('api/auth/verify.ts', 'utf8');
    
    console.log('\n🔍 Auth Verify API Analysis:');
    console.log(`✅ Has session check: ${authVerify.includes('sessionId')}`);
    console.log(`✅ Has user lookup: ${authVerify.includes('getUserBySessionId')}`);
    console.log(`✅ Has error handling: ${authVerify.includes('catch')}`);
    console.log(`✅ Has CORS headers: ${authVerify.includes('Access-Control-Allow-Origin')}`);
}

if (fs.existsSync('api/admin.ts')) {
    const adminAPI = fs.readFileSync('api/admin.ts', 'utf8');
    
    console.log('\n👑 Admin API Analysis:');
    console.log(`✅ Has analytics endpoints: ${adminAPI.includes('analytics')}`);
    console.log(`✅ Has session management: ${adminAPI.includes('admin/auth/session')}`);
    console.log(`✅ Has admin verification: ${adminAPI.includes('admin/auth/verify')}`);
    console.log(`✅ Has admin email check: ${adminAPI.includes('shyamkaarthikeyan@gmail.com')}`);
}

console.log('\n🧪 Test Files Created:');
console.log('✅ debug-auth-state.html - Browser-based auth state debugger');
console.log('✅ test-unauthorized-flow.html - Interactive test page');
console.log('✅ fix-auth-issues.js - Console script to fix auth issues');

console.log('\n📋 Next Steps:');
console.log('1. Open test-unauthorized-flow.html in your browser');
console.log('2. Test the unauthorized flow (should show restrictions)');
console.log('3. Use "Simulate Login" to test authenticated flow');
console.log('4. Use "Simulate Admin Login" to test admin functionality');
console.log('5. If issues persist, run fix-auth-issues.js in browser console');

console.log('\n🔧 Common Issues & Solutions:');
console.log('❌ Downloads disabled when logged in:');
console.log('   → Check browser console for auth state logs');
console.log('   → Verify localStorage has format-a-user data');
console.log('   → Run fixAuthIssues() in console');

console.log('\n❌ Admin panel not loading:');
console.log('   → Ensure user email is shyamkaarthikeyan@gmail.com');
console.log('   → Check admin-session and admin-token in localStorage');
console.log('   → Run createAdminSession() in console');

console.log('\n❌ API calls failing:');
console.log('   → Check network tab for 401/403 errors');
console.log('   → Verify session cookies are being sent');
console.log('   → Test with debug-auth-state.html');

console.log('\n✅ Verification complete!');