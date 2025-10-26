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
  if (url.includes('/admin/')) {
    const adminToken = localStorage.getItem('adminToken');
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

// Enhanced API client with retry logic and better error handling
export const apiClient = {
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