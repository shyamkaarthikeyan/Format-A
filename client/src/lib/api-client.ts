// Utility functions for making authenticated API calls
import { 
  handleApiResponse, 
  handleNetworkError, 
  retryOperation,
  NetworkError,
  AuthenticationError,
  AdminError
} from './error-handling';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

interface RequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

// Get session ID from cookie
function getSessionId(): string | null {
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'sessionId') {
      return value;
    }
  }
  return null;
}

// Make authenticated API request with timeout and error handling
export async function authenticatedFetch(
  url: string, 
  options: RequestInit = {},
  config: RequestConfig = {}
): Promise<Response> {
  const { timeout = 30000 } = config;
  const sessionId = getSessionId();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add Authorization header if we have a session ID
  if (sessionId) {
    (headers as any)['Authorization'] = `Bearer ${sessionId}`;
  }

  // Add admin token for admin requests
  if (url.includes('/admin')) {
    const adminToken = localStorage.getItem('admin-token');
    if (adminToken) {
      (headers as any)['X-Admin-Token'] = adminToken;
    }
  }

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new NetworkError('NETWORK_TIMEOUT', 'Request timed out');
    }
    
    throw handleNetworkError(error);
  }
}

// Helper function for admin API requests with fallback
async function makeAdminRequest<T>(endpoint: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
  const adminToken = localStorage.getItem('admin-token');
  const fallbackParams = adminToken ? '' : '?adminEmail=shyamkaarthikeyan@gmail.com';
  
  // Use admin-simple API with fallback
  const url = `/api/admin-simple${endpoint}${fallbackParams}`;
  
  console.log('Making admin request:', {
    endpoint,
    url,
    hasToken: !!adminToken,
    tokenPrefix: adminToken ? adminToken.substring(0, 15) + '...' : 'none'
  });
  
  try {
    const response = await authenticatedFetch(url, {}, config);
    const result = await handleApiResponse<ApiResponse<T>>(response);
    
    // If token auth failed but we have admin email, try creating a token
    if (!result.success && result.error?.code === 'ADMIN_AUTH_REQUIRED' && !adminToken) {
      console.log('Attempting to create admin token automatically...');
      try {
        const sessionResponse = await authenticatedFetch('/api/admin-simple/auth/session', {
          method: 'POST',
          body: JSON.stringify({
            email: 'shyamkaarthikeyan@gmail.com',
            userId: 'admin_user_auto'
          })
        });
        
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          if (sessionData.adminToken) {
            localStorage.setItem('admin-token', sessionData.adminToken);
            localStorage.setItem('admin-session', JSON.stringify(sessionData.adminSession));
            console.log('Admin token created, retrying request...');
            
            // Retry the original request with the new token
            const retryResponse = await authenticatedFetch(`/api/admin-simple${endpoint}`, {}, config);
            return await handleApiResponse<ApiResponse<T>>(retryResponse);
          }
        }
      } catch (tokenError) {
        console.warn('Failed to auto-create admin token:', tokenError);
      }
    }
    
    return result;
  } catch (error) {
    console.error('Admin request failed:', error);
    if (error instanceof NetworkError || error instanceof AuthenticationError || error instanceof AdminError) {
      throw error;
    }
    
    return {
      success: false,
      error: {
        code: 'ADMIN_REQUEST_FAILED',
        message: error instanceof Error ? error.message : 'Admin request failed'
      }
    };
  }
}

// Enhanced API client with retry logic and better error handling
export const apiClient = {
  // Admin-specific request method
  async adminGet<T>(endpoint: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    return makeAdminRequest<T>(endpoint, config);
  },

  async get<T>(url: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    const { retries = 3, retryDelay = 1000 } = config;
    
    return retryOperation(async () => {
      try {
        const response = await authenticatedFetch(url, {}, config);
        return await handleApiResponse<ApiResponse<T>>(response);
      } catch (error) {
        if (error instanceof NetworkError || error instanceof AuthenticationError || error instanceof AdminError) {
          throw error;
        }
        
        return {
          success: false,
          error: {
            code: 'UNKNOWN_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
          }
        };
      }
    }, retries, retryDelay);
  },

  async post<T>(url: string, body?: any, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    const { retries = 3, retryDelay = 1000 } = config;
    
    return retryOperation(async () => {
      try {
        const response = await authenticatedFetch(url, {
          method: 'POST',
          body: body ? JSON.stringify(body) : undefined,
        }, config);
        
        return await handleApiResponse<ApiResponse<T>>(response);
      } catch (error) {
        if (error instanceof NetworkError || error instanceof AuthenticationError || error instanceof AdminError) {
          throw error;
        }
        
        return {
          success: false,
          error: {
            code: 'UNKNOWN_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
          }
        };
      }
    }, retries, retryDelay);
  },

  async put<T>(url: string, body?: any, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    const { retries = 3, retryDelay = 1000 } = config;
    
    return retryOperation(async () => {
      try {
        const response = await authenticatedFetch(url, {
          method: 'PUT',
          body: body ? JSON.stringify(body) : undefined,
        }, config);
        
        return await handleApiResponse<ApiResponse<T>>(response);
      } catch (error) {
        if (error instanceof NetworkError || error instanceof AuthenticationError || error instanceof AdminError) {
          throw error;
        }
        
        return {
          success: false,
          error: {
            code: 'UNKNOWN_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
          }
        };
      }
    }, retries, retryDelay);
  },

  async delete<T>(url: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    const { retries = 3, retryDelay = 1000 } = config;
    
    return retryOperation(async () => {
      try {
        const response = await authenticatedFetch(url, {
          method: 'DELETE',
        }, config);
        
        return await handleApiResponse<ApiResponse<T>>(response);
      } catch (error) {
        if (error instanceof NetworkError || error instanceof AuthenticationError || error instanceof AdminError) {
          throw error;
        }
        
        return {
          success: false,
          error: {
            code: 'UNKNOWN_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
          }
        };
      }
    }, retries, retryDelay);
  }
};

// Legacy helper functions for backward compatibility
export async function apiGet<T>(url: string): Promise<ApiResponse<T>> {
  return apiClient.get<T>(url);
}

export async function apiPost<T>(url: string, body?: any): Promise<ApiResponse<T>> {
  return apiClient.post<T>(url, body);
}