import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@shared/schema';
import { AuthenticationError, getUserFriendlyErrorMessage, handleApiResponse } from '@/lib/error-handling';
import { authenticatedFetch } from '@/lib/api-client';
import DocumentMigrationService from '@/lib/document-migration';
import AdminAuthService, { AdminUser, AdminSession } from '@/lib/admin-auth';

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  signOut: () => void;
  isAuthenticated: boolean;
  loading: boolean;
  isGuestMode: boolean;
  hasGuestDocument: boolean;
  preserveGuestDocument: () => string | null;
  migrateGuestDocument: (userId: string) => Promise<boolean>;
  clearGuestDocument: () => void;
  getGuestDocumentPreview: () => { title: string; lastModified: string } | null;
  // Admin functionality
  isAdmin: boolean;
  adminSession: AdminSession | null;
  initializeAdminAccess: () => Promise<boolean>;
  signOutAdmin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasGuestDocument, setHasGuestDocument] = useState(false);
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null);

  // Check for guest document on mount and when localStorage changes
  useEffect(() => {
    const checkGuestDocument = () => {
      const guestDoc = localStorage.getItem('guest-document');
      setHasGuestDocument(!!guestDoc);
    };

    checkGuestDocument();
    
    // Listen for localStorage changes
    window.addEventListener('storage', checkGuestDocument);
    return () => window.removeEventListener('storage', checkGuestDocument);
  }, []);

  // Load user from localStorage on mount and verify with server
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUser = localStorage.getItem('format-a-user');
        
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          console.log('Found stored user:', userData);
          
          // Set user immediately for better UX, then verify
          setUserState(userData);
          
          // Verify the session is still valid with the server
          try {
            const response = await authenticatedFetch('/api/auth/verify');
            console.log('Auth verify response:', response.status);
            
            if (response.ok) {
              const result = await response.json();
              console.log('Server verified user:', result);
              if (result.success && result.user) {
                setUserState(result.user);
              } else {
                console.log('Server response invalid, keeping local user');
                // Keep local user if server response is invalid
              }
            } else {
              console.log('Session verification failed, but keeping user logged in locally');
              // Keep the user logged in locally - don't clear on verification failure
              // This allows the app to work even if the server is having issues
            }
          } catch (verifyError) {
            console.error('Error verifying session:', verifyError);
            // Keep the user logged in locally if verification fails (offline mode)
            console.log('Keeping user logged in locally due to verification error');
          }
        } else {
          console.log('No stored user found');
        }
      } catch (error) {
        console.error('Error loading user from localStorage:', error);
        // Clear corrupted data
        localStorage.removeItem('format-a-user');
        setUserState(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const setUser = (newUser: User | null) => {
    setUserState(newUser);
    
    if (newUser) {
      // Store user in localStorage for quick access
      localStorage.setItem('format-a-user', JSON.stringify(newUser));
      
      // Auto-migrate guest document if it exists
      if (DocumentMigrationService.hasGuestDocument()) {
        DocumentMigrationService.autoMigrateOnSignIn(newUser.id)
          .then(() => {
            // Update hasGuestDocument state after migration
            setHasGuestDocument(DocumentMigrationService.hasGuestDocument());
          })
          .catch(error => {
            console.error('Failed to auto-migrate guest document:', error);
          });
      }
    } else {
      // Clear user from localStorage
      localStorage.removeItem('format-a-user');
    }
  };

  const signOut = () => {
    setUser(null);
    
    // Clear any cookies
    document.cookie = 'sessionId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
    // Optionally revoke Google tokens (if we stored them)
    // This would require additional Google API calls
  };

  const isAuthenticated = user !== null;
  const isGuestMode = !isAuthenticated;
  const isAdmin = user ? AdminAuthService.isCurrentUserAdmin(user) : false;

  // Guest document management functions
  const preserveGuestDocument = () => {
    return DocumentMigrationService.preserveGuestDocument();
  };

  const migrateGuestDocument = async (userId: string) => {
    const success = await DocumentMigrationService.migrateGuestDocument(userId);
    if (success) {
      setHasGuestDocument(false);
    }
    return success;
  };

  const clearGuestDocument = () => {
    DocumentMigrationService.clearGuestDocument();
    setHasGuestDocument(false);
  };

  const getGuestDocumentPreview = () => {
    return DocumentMigrationService.getGuestDocumentPreview();
  };

  // Admin functions
  const initializeAdminAccess = async (): Promise<boolean> => {
    if (!user || !isAdmin) {
      return false;
    }

    try {
      const success = await AdminAuthService.initializeAdminAccess(user);
      if (success) {
        const session = AdminAuthService.getCurrentAdminSession();
        setAdminSession(session);
      }
      return success;
    } catch (error) {
      console.error('Failed to initialize admin access:', error);
      return false;
    }
  };

  const signOutAdmin = async (): Promise<void> => {
    try {
      await AdminAuthService.signOutAdmin();
    } catch (error) {
      console.error('Error during admin sign out:', error);
    } finally {
      setAdminSession(null);
    }
  };

  // Initialize admin session from localStorage when user changes
  useEffect(() => {
    if (!user || !isAdmin) {
      setAdminSession(null);
      return;
    }

    // Check for existing admin session in localStorage
    try {
      const storedSession = localStorage.getItem('admin-session');
      if (storedSession) {
        const session = JSON.parse(storedSession);
        
        // Check if session is not expired
        if (new Date(session.expiresAt) > new Date()) {
          console.log('Found valid admin session in localStorage');
          setAdminSession(session);
        } else {
          console.log('Admin session expired, clearing');
          localStorage.removeItem('admin-session');
          localStorage.removeItem('admin-token');
          setAdminSession(null);
        }
      }
    } catch (error) {
      console.error('Error loading admin session from localStorage:', error);
      localStorage.removeItem('admin-session');
      localStorage.removeItem('admin-token');
      setAdminSession(null);
    }
  }, [user, isAdmin]);

  const value: AuthContextType = {
    user,
    setUser,
    signOut,
    isAuthenticated,
    loading,
    isGuestMode,
    hasGuestDocument,
    preserveGuestDocument,
    migrateGuestDocument,
    clearGuestDocument,
    getGuestDocumentPreview,
    // Admin functionality
    isAdmin,
    adminSession,
    initializeAdminAccess,
    signOutAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}