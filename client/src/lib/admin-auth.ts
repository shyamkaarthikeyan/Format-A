import { User } from '@shared/schema';
import { authenticatedFetch } from './api-client';

export const ADMIN_EMAIL = 'shyamkaarthikeyan@gmail.com';

export interface AdminUser extends User {
  isAdmin: boolean;
  adminPermissions: AdminPermission[];
  adminSessionId?: string;
}

export type AdminPermission = 
  | 'view_analytics' 
  | 'manage_users' 
  | 'system_monitoring' 
  | 'download_reports'
  | 'admin_panel_access';

export interface AdminSession {
  sessionId: string;
  userId: string;
  adminPermissions: AdminPermission[];
  createdAt: string;
  expiresAt: string;
  lastAccessedAt: string;
}

export class AdminAuthService {
  private static readonly ADMIN_SESSION_KEY = 'admin-session';
  private static readonly ADMIN_TOKEN_KEY = 'admin-token';

  /**
   * Check if a user is an admin based on email
   */
  static isAdminEmail(email: string): boolean {
    return email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  }

  /**
   * Check if current user has admin privileges
   */
  static isCurrentUserAdmin(user: User | null): boolean {
    if (!user) return false;
    return this.isAdminEmail(user.email);
  }

  /**
   * Get admin permissions for a user
   */
  static getAdminPermissions(user: User): AdminPermission[] {
    if (!this.isAdminEmail(user.email)) {
      return [];
    }

    // For the specific admin email, grant all permissions
    return [
      'view_analytics',
      'manage_users', 
      'system_monitoring',
      'download_reports',
      'admin_panel_access'
    ];
  }

  /**
   * Create admin session after successful authentication
   */
  static async createAdminSession(user: User): Promise<AdminSession | null> {
    if (!this.isAdminEmail(user.email)) {
      throw new Error('User is not authorized for admin access');
    }

    try {
      // Create local admin session since backend endpoint doesn't exist yet
      const adminSession: AdminSession = {
        sessionId: `local_admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: user.id,
        adminPermissions: this.getAdminPermissions(user),
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        lastAccessedAt: new Date().toISOString()
      };

      const adminToken = `admin_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store admin session locally
      localStorage.setItem(this.ADMIN_SESSION_KEY, JSON.stringify(adminSession));
      localStorage.setItem(this.ADMIN_TOKEN_KEY, adminToken);

      console.log('Local admin session created:', adminSession);
      return adminSession;
    } catch (error) {
      console.error('Failed to create admin session:', error);
      return null;
    }
  }

  /**
   * Verify admin session is still valid
   */
  static async verifyAdminSession(): Promise<AdminSession | null> {
    try {
      const storedSession = localStorage.getItem(this.ADMIN_SESSION_KEY);
      const adminToken = localStorage.getItem(this.ADMIN_TOKEN_KEY);

      if (!storedSession || !adminToken) {
        return null;
      }

      const session = JSON.parse(storedSession);
      
      // Check if session is expired
      if (new Date(session.expiresAt) < new Date()) {
        this.clearAdminSession();
        return null;
      }

      // For local sessions, just verify expiration (no server verification needed)
      // Update last accessed time
      session.lastAccessedAt = new Date().toISOString();
      localStorage.setItem(this.ADMIN_SESSION_KEY, JSON.stringify(session));
      
      return session;
    } catch (error) {
      console.error('Admin session verification failed:', error);
      this.clearAdminSession();
      return null;
    }
  }

  /**
   * Get current admin session
   */
  static getCurrentAdminSession(): AdminSession | null {
    try {
      const storedSession = localStorage.getItem(this.ADMIN_SESSION_KEY);
      if (!storedSession) return null;

      const session = JSON.parse(storedSession);
      
      // Check if session is expired
      if (new Date(session.expiresAt) < new Date()) {
        this.clearAdminSession();
        return null;
      }

      return session;
    } catch (error) {
      console.error('Error getting admin session:', error);
      return null;
    }
  }

  /**
   * Clear admin session
   */
  static clearAdminSession(): void {
    localStorage.removeItem(this.ADMIN_SESSION_KEY);
    localStorage.removeItem(this.ADMIN_TOKEN_KEY);
  }

  /**
   * Check if user has specific admin permission
   */
  static hasPermission(permission: AdminPermission, session?: AdminSession): boolean {
    const adminSession = session || this.getCurrentAdminSession();
    if (!adminSession) return false;

    return adminSession.adminPermissions.includes(permission);
  }

  /**
   * Get admin token for API requests
   */
  static getAdminToken(): string | null {
    return localStorage.getItem(this.ADMIN_TOKEN_KEY);
  }

  /**
   * Make authenticated admin API request
   */
  static async adminFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const adminToken = this.getAdminToken();
    
    if (!adminToken) {
      throw new Error('No admin token available');
    }

    const headers = {
      ...options.headers,
      'X-Admin-Token': adminToken
    };

    return authenticatedFetch(url, {
      ...options,
      headers
    });
  }

  /**
   * Initialize admin session for authenticated user
   */
  static async initializeAdminAccess(user: User): Promise<boolean> {
    if (!this.isAdminEmail(user.email)) {
      return false;
    }

    try {
      // Check if we already have a valid session
      const existingSession = await this.verifyAdminSession();
      if (existingSession) {
        return true;
      }

      // Create new admin session
      const adminSession = await this.createAdminSession(user);
      return !!adminSession;
    } catch (error) {
      console.error('Failed to initialize admin access:', error);
      return false;
    }
  }

  /**
   * Sign out from admin session
   */
  static async signOutAdmin(): Promise<void> {
    try {
      // For local sessions, just clear the session
      console.log('Signing out from admin session');
      this.clearAdminSession();
    } catch (error) {
      console.error('Error during admin sign out:', error);
      this.clearAdminSession();
    }
  }
}

export default AdminAuthService;