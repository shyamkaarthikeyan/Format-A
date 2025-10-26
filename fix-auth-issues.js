// Quick fix script for authentication issues
// Run this in the browser console to debug and fix auth state

console.log('🔧 Auth Fix Script Starting...');

// 1. Check current authentication state
function checkAuthState() {
    console.log('📊 Current Authentication State:');
    
    const user = localStorage.getItem('format-a-user');
    const adminSession = localStorage.getItem('admin-session');
    const adminToken = localStorage.getItem('admin-token');
    const cookies = document.cookie;
    
    console.log('User data:', user ? JSON.parse(user) : 'None');
    console.log('Admin session:', adminSession ? JSON.parse(adminSession) : 'None');
    console.log('Admin token:', adminToken || 'None');
    console.log('Cookies:', cookies || 'None');
    
    return {
        hasUser: !!user,
        hasAdminSession: !!adminSession,
        hasAdminToken: !!adminToken,
        hasCookies: !!cookies
    };
}

// 2. Test API endpoints
async function testAPIs() {
    console.log('🧪 Testing API Endpoints:');
    
    try {
        // Test auth verify
        const authResponse = await fetch('/api/auth/verify', {
            credentials: 'include'
        });
        console.log('Auth verify:', authResponse.status, await authResponse.json());
    } catch (e) {
        console.error('Auth verify failed:', e);
    }
    
    try {
        // Test admin API
        const adminResponse = await fetch('/api/admin/analytics/users', {
            credentials: 'include',
            headers: {
                'X-Admin-Token': localStorage.getItem('admin-token') || ''
            }
        });
        console.log('Admin API:', adminResponse.status, await adminResponse.json());
    } catch (e) {
        console.error('Admin API failed:', e);
    }
}

// 3. Create a test user session
function createTestSession() {
    console.log('🔨 Creating test user session...');
    
    const testUser = {
        id: 'test-user-' + Date.now(),
        email: 'shyamkaarthikeyan@gmail.com', // Admin email
        name: 'Test Admin User',
        picture: null,
        isActive: true,
        preferences: {}
    };
    
    // Store user
    localStorage.setItem('format-a-user', JSON.stringify(testUser));
    
    // Create session cookie
    document.cookie = `sessionId=test-session-${Date.now()}; path=/; max-age=86400`;
    
    console.log('✅ Test session created:', testUser);
    return testUser;
}

// 4. Create admin session
function createAdminSession() {
    console.log('🔨 Creating admin session...');
    
    const adminSession = {
        sessionId: 'admin_session_' + Date.now(),
        userId: 'test-user-' + Date.now(),
        adminPermissions: [
            'view_analytics',
            'manage_users', 
            'system_monitoring',
            'download_reports',
            'admin_panel_access'
        ],
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        lastAccessedAt: new Date().toISOString()
    };
    
    const adminToken = 'admin_token_' + Date.now();
    
    localStorage.setItem('admin-session', JSON.stringify(adminSession));
    localStorage.setItem('admin-token', adminToken);
    
    console.log('✅ Admin session created:', adminSession);
    return { adminSession, adminToken };
}

// 5. Fix authentication issues
function fixAuthIssues() {
    console.log('🔧 Fixing authentication issues...');
    
    const state = checkAuthState();
    
    // If no user, create one
    if (!state.hasUser) {
        createTestSession();
    }
    
    // If user is admin but no admin session, create one
    const user = JSON.parse(localStorage.getItem('format-a-user') || '{}');
    if (user.email === 'shyamkaarthikeyan@gmail.com' && (!state.hasAdminSession || !state.hasAdminToken)) {
        createAdminSession();
    }
    
    console.log('✅ Authentication issues fixed!');
    console.log('🔄 Please refresh the page to see changes.');
}

// 6. Clear all auth data
function clearAllAuth() {
    console.log('🧹 Clearing all authentication data...');
    
    localStorage.removeItem('format-a-user');
    localStorage.removeItem('admin-session');
    localStorage.removeItem('admin-token');
    document.cookie = 'sessionId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
    console.log('✅ All auth data cleared!');
}

// 7. Main execution
async function main() {
    console.log('🚀 Running auth diagnostics...');
    
    const state = checkAuthState();
    await testAPIs();
    
    if (!state.hasUser) {
        console.log('❌ No user found - this explains why downloads are disabled');
        console.log('💡 Run fixAuthIssues() to create a test session');
    } else {
        console.log('✅ User found');
        const user = JSON.parse(localStorage.getItem('format-a-user'));
        if (user.email === 'shyamkaarthikeyan@gmail.com') {
            if (!state.hasAdminSession || !state.hasAdminToken) {
                console.log('❌ Admin user but no admin session - this explains admin panel issues');
                console.log('💡 Run fixAuthIssues() to create admin session');
            } else {
                console.log('✅ Admin session found');
            }
        }
    }
    
    console.log('\n🛠️  Available commands:');
    console.log('- checkAuthState() - Check current auth state');
    console.log('- testAPIs() - Test API endpoints');
    console.log('- fixAuthIssues() - Fix authentication issues');
    console.log('- createTestSession() - Create test user session');
    console.log('- createAdminSession() - Create admin session');
    console.log('- clearAllAuth() - Clear all auth data');
}

// Make functions available globally
window.checkAuthState = checkAuthState;
window.testAPIs = testAPIs;
window.fixAuthIssues = fixAuthIssues;
window.createTestSession = createTestSession;
window.createAdminSession = createAdminSession;
window.clearAllAuth = clearAllAuth;

// Run main function
main();