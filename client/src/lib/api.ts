// API configuration for development and production
const getApiBaseUrl = () => {
  // In development, use relative URLs (Vite proxy handles this)
  if (import.meta.env.DEV) {
    return '';
  }
  
  // In production, use the same origin (since frontend and backend are served together)
  return '';
};

const getPythonBackendUrl = () => {
  // Use environment variable if available, otherwise use default
  const envUrl = import.meta.env.VITE_PYTHON_BACKEND_URL;
  if (envUrl) {
    return envUrl;
  }
  
  // In development, try local Python backend first, then production
  if (import.meta.env.DEV) {
    return 'http://localhost:3002/api'; // Python backend is running on port 3002
  }
  
  // In production, use the deployed Python backend
  return 'https://format-a-python-backend.vercel.app/api';
};

export const API_BASE_URL = getApiBaseUrl();
export const PYTHON_BACKEND_URL = getPythonBackendUrl();

export function getApiUrl(path: string): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export function getPythonApiUrl(path: string): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${PYTHON_BACKEND_URL}${normalizedPath}`;
}

// Enhanced fetch function with comprehensive retry logic and error handling
export async function fetchWithFallback(url: string, options: RequestInit = {}, fallbackUrl?: string): Promise<Response> {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const requestOptions: RequestInit = {
    ...options,
    headers: defaultHeaders,
  };

  // Retry configuration
  const retryConfig = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    backoffMultiplier: 2,
    retryableStatuses: [408, 429, 500, 502, 503, 504],
    retryableErrors: ['NetworkError', 'TimeoutError', 'AbortError']
  };

  // Function to determine if an error/status is retryable
  const isRetryable = (error: any, status?: number): boolean => {
    if (status && retryConfig.retryableStatuses.includes(status)) {
      return true;
    }
    
    if (error && typeof error === 'object') {
      const errorName = error.name || error.constructor?.name || '';
      const errorMessage = error.message || '';
      
      return retryConfig.retryableErrors.some(retryableError => 
        errorName.includes(retryableError) || errorMessage.includes(retryableError)
      ) || errorMessage.includes('fetch') || errorMessage.includes('network');
    }
    
    return false;
  };

  // Function to calculate delay with exponential backoff
  const calculateDelay = (attempt: number): number => {
    const delay = retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt - 1);
    return Math.min(delay, retryConfig.maxDelay);
  };

  // Function to sleep for a given duration
  const sleep = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  // Main retry logic
  const attemptRequest = async (targetUrl: string, attempt: number = 1): Promise<Response> => {
    try {
      console.log(`Attempting request to ${targetUrl} (attempt ${attempt}/${retryConfig.maxRetries + 1})`);
      
      // Add timeout to the request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const requestWithTimeout: RequestInit = {
        ...requestOptions,
        signal: controller.signal
      };

      const response = await fetch(targetUrl, requestWithTimeout);
      clearTimeout(timeoutId);
      
      // If response is successful, return it
      if (response.ok) {
        console.log(`Request successful to ${targetUrl} on attempt ${attempt}`);
        return response;
      }
      
      // Check if we should retry based on status code
      if (attempt <= retryConfig.maxRetries && isRetryable(null, response.status)) {
        console.warn(`Request to ${targetUrl} failed with status ${response.status}, retrying in ${calculateDelay(attempt)}ms`);
        await sleep(calculateDelay(attempt));
        return attemptRequest(targetUrl, attempt + 1);
      }
      
      // If not retryable or max retries reached, return the response
      console.warn(`Request to ${targetUrl} failed with status ${response.status} (not retryable or max retries reached)`);
      return response;
      
    } catch (error) {
      console.error(`Request attempt ${attempt} to ${targetUrl} failed:`, error);
      
      // Check if we should retry based on error type
      if (attempt <= retryConfig.maxRetries && isRetryable(error)) {
        console.warn(`Retrying request to ${targetUrl} in ${calculateDelay(attempt)}ms due to error: ${error.message}`);
        await sleep(calculateDelay(attempt));
        return attemptRequest(targetUrl, attempt + 1);
      }
      
      // If not retryable or max retries reached, throw the error
      throw error;
    }
  };

  try {
    // Try primary URL with retry logic
    const response = await attemptRequest(url);
    
    // If primary succeeded or failed with non-server error, return it
    if (response.ok || !fallbackUrl || response.status < 500) {
      return response;
    }
    
    // If primary failed with server error and we have fallback, try fallback
    console.warn(`Primary URL ${url} failed with server error ${response.status}, trying fallback: ${fallbackUrl}`);
    
  } catch (primaryError) {
    console.error(`Primary URL ${url} failed completely:`, primaryError);
    
    // If we have a fallback URL, try it
    if (!fallbackUrl) {
      throw primaryError;
    }
    
    console.warn(`Trying fallback URL: ${fallbackUrl}`);
    
    // Try fallback URL with retry logic
    try {
      return await attemptRequest(fallbackUrl!);
    } catch (fallbackError) {
      console.error(`Fallback URL ${fallbackUrl} also failed:`, fallbackError);
      
      // Create a comprehensive error with both failures
      const comprehensiveError = new Error(
        `Both primary (${url}) and fallback (${fallbackUrl}) requests failed. ` +
        `Primary error: ${primaryError?.message || 'Unknown'}. ` +
        `Fallback error: ${fallbackError.message || 'Unknown'}`
      );
      
      throw comprehensiveError;
    }
  }
}

// Helper function to record download
async function recordDownload(documentData: any, format: string, fileSize: number = 0) {
  try {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (!token) return; // Skip if not authenticated

    await fetch(getApiUrl('/api/record-download'), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        documentTitle: documentData.title || 'Untitled Document',
        fileFormat: format,
        fileSize: fileSize,
        documentMetadata: {
          authors: documentData.authors?.length || 0,
          sections: documentData.sections?.length || 0,
          references: documentData.references?.length || 0,
          figures: documentData.figures?.length || 0,
          wordCount: estimateWordCount(documentData)
        }
      })
    });
  } catch (error) {
    console.warn('Failed to record download:', error);
    // Don't throw - download tracking shouldn't break document generation
  }
}

// Helper function to estimate word count
function estimateWordCount(documentData: any): number {
  let wordCount = 0;
  
  if (documentData.abstract) {
    wordCount += documentData.abstract.split(' ').length;
  }
  
  if (documentData.sections) {
    documentData.sections.forEach((section: any) => {
      if (section.contentBlocks) {
        section.contentBlocks.forEach((block: any) => {
          if (block.type === 'text' && block.content) {
            wordCount += block.content.split(' ').length;
          }
        });
      }
    });
  }
  
  return wordCount;
}

// Document generation API functions
export const documentApi = {
  // Generate DOCX document - Use Python backend main endpoint
  generateDocx: async (documentData: any) => {
    const pythonUrl = getPythonApiUrl('/document-generator');
    
    const response = await fetchWithFallback(pythonUrl, {
      method: 'POST',
      body: JSON.stringify({
        ...documentData,
        format: 'docx',
        action: 'download'
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Document generation failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Record download if successful
    if (result.success) {
      await recordDownload(documentData, 'docx', result.fileSize || 0);
    }
    
    return result;
  },

  // Generate PDF document - Use Python backend main endpoint  
  generatePdf: async (documentData: any, preview: boolean = false) => {
    const pythonUrl = getPythonApiUrl('/document-generator');
    
    const response = await fetchWithFallback(pythonUrl, {
      method: 'POST',
      body: JSON.stringify({
        ...documentData,
        format: 'pdf',
        action: preview ? 'preview' : 'download'
      }),
    });
    
    if (!response.ok) {
      throw new Error(`PDF generation failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Record download if successful and not a preview
    if (result.success && !preview) {
      await recordDownload(documentData, 'pdf', result.fileSize || 0);
    }
    
    return result;
  },

  // Generate email - Use Python backend main endpoint
  generateEmail: async (emailData: any) => {
    const pythonUrl = getPythonApiUrl('/document-generator');
    
    const response = await fetchWithFallback(pythonUrl, {
      method: 'POST',
      body: JSON.stringify({
        ...emailData.documentData,
        format: 'email',
        action: 'send',
        email: emailData.email
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Email generation failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Record email generation as download
    if (result.success) {
      await recordDownload(emailData.documentData, 'email', 0);
    }
    
    return result;
  },

  // Generate preview (HTML/images) - Use Python backend main endpoint
  generatePreview: async (documentData: any) => {
    const pythonUrl = getPythonApiUrl('/document-generator');
    
    const response = await fetchWithFallback(pythonUrl, {
      method: 'POST',
      body: JSON.stringify({
        ...documentData,
        format: 'html',
        action: 'preview'
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Preview generation failed: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }
};

// Download history API functions
export const downloadApi = {
  // Get user's download history
  getDownloadHistory: async (page: number = 1, limit: number = 10) => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (!token) {
      throw new Error('Authentication required');
    }

    const params = new URLSearchParams({
      action: 'history',
      page: page.toString(),
      limit: limit.toString()
    });

    const response = await fetch(getApiUrl(`/api/downloads?${params}`), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch downloads: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message || 'Failed to fetch download history');
    }

    return data.data;
  },

  // Get specific download by ID
  getDownloadById: async (downloadId: string) => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(getApiUrl(`/api/downloads?id=${downloadId}`), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch download: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message || 'Failed to fetch download');
    }

    return data.data;
  }
};