// Utility functions for making authenticated API calls

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
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

// Make authenticated API request
export async function authenticatedFetch(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  const sessionId = getSessionId();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add Authorization header if we have a session ID
  if (sessionId) {
    (headers as any)['Authorization'] = `Bearer ${sessionId}`;
  }

  return fetch(url, {
    ...options,
    credentials: 'include', // Still include cookies as fallback
    headers,
  });
}

// Helper for GET requests
export async function apiGet<T>(url: string): Promise<ApiResponse<T>> {
  try {
    const response = await authenticatedFetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: {
          code: `HTTP_${response.status}`,
          message: data.error?.message || `Request failed with status ${response.status}`
        }
      };
    }
    
    return data;
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network request failed'
      }
    };
  }
}

// Helper for POST requests
export async function apiPost<T>(url: string, body?: any): Promise<ApiResponse<T>> {
  try {
    const response = await authenticatedFetch(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: {
          code: `HTTP_${response.status}`,
          message: data.error?.message || `Request failed with status ${response.status}`
        }
      };
    }
    
    return data;
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network request failed'
      }
    };
  }
}