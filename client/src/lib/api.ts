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
    return 'http://localhost:3001/api'; // Python backend is running on port 3001
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

// Helper function to record download with enhanced error handling and retry logic
async function recordDownload(documentData: any, format: string, fileSize: number = 0, fileData?: string) {
  const maxRetries = 3;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      if (!token) {
        console.warn('No auth token found - skipping download recording');
        return false;
      }

      console.log(`Recording download: ${documentData.title} (${format}) - attempt ${retryCount + 1}`);

      const response = await fetch(getApiUrl('/api/record-download'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          documentTitle: documentData.title || 'Untitled Document',
          fileFormat: format,
          fileSize: fileSize,
          fileData: fileData, // Include file data for email attachment
          documentMetadata: {
            authors: documentData.authors?.map((a: any) => a.name).filter(Boolean) || [],
            authorsCount: documentData.authors?.length || 0,
            sections: documentData.sections?.length || 0,
            references: documentData.references?.length || 0,
            figures: documentData.figures?.length || 0,
            wordCount: estimateWordCount(documentData),
            generatedAt: new Date().toISOString(),
            source: 'frontend_api'
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('✅ Download recorded and email sent with document attached:', result.data?.id);
          return true;
        } else {
          throw new Error(result.error?.message || 'Recording failed');
        }
      } else {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
    } catch (error) {
      retryCount++;
      console.warn(`Failed to record download (attempt ${retryCount}/${maxRetries}):`, error);
      
      if (retryCount >= maxRetries) {
        console.error('❌ Failed to record download after all retries:', error);
        // Don't throw - download tracking shouldn't break document generation
        return false;
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
    }
  }
  
  return false;
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
  // Internal DOCX generation (with preview flag to skip email)
  generateDocxInternal: async (documentData: any, preview: boolean = false) => {
    console.log(`Generating DOCX (${preview ? 'preview' : 'download'})...`);
    
    // In development, try local Node.js backend first, then Python backend
    // In production, use the Python backend
    const endpoints = import.meta.env.DEV ? [
      {
        url: getApiUrl('/api/generate/docx'),
        name: 'Node.js backend',
        payload: documentData
      },
      {
        url: getPythonApiUrl('/document-generator'),
        name: 'Python backend',
        payload: {
          ...documentData,
          format: 'docx',
          action: preview ? 'preview' : 'download'
        }
      }
    ] : [
      {
        url: getPythonApiUrl('/document-generator'),
        name: 'Python backend',
        payload: {
          ...documentData,
          format: 'docx',
          action: preview ? 'preview' : 'download'
        }
      }
    ];
    
    let lastError: any = null;
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying DOCX generation with ${endpoint.name}...`);
        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(endpoint.payload),
        });
        
        if (!response.ok) {
          lastError = new Error(`${endpoint.name} responded with ${response.status}: ${response.statusText}`);
          console.warn(`${endpoint.name} failed:`, lastError.message);
          continue;
        }
        
        const result = await response.json();
        
        if (!result.success || !result.file_data) {
          lastError = new Error(`Invalid response from ${endpoint.name}`);
          console.warn(`Invalid response from ${endpoint.name}:`, result);
          continue;
        }
        
        console.log(`✓ DOCX generated successfully using ${endpoint.name}`);
        
        // Record download ONLY if not a preview
        if (!preview && result.file_data) {
          try {
            await recordDownload(documentData, 'docx', result.file_size || 0, result.file_data);
          } catch (e) {
            console.warn('Failed to record download:', e);
          }
        }
        
        return result;
      } catch (error) {
        lastError = error;
        console.warn(`${endpoint.name} error:`, error);
        continue;
      }
    }
    
    // If all endpoints failed, throw the last error
    throw lastError || new Error('DOCX generation failed: No endpoints available');
  },

  // Generate DOCX document - Public API for downloads (always sends email)
  generateDocx: async (documentData: any) => {
    return documentApi.generateDocxInternal(documentData, false);
  },

  // Generate PDF document - Word→PDF conversion ONLY
  generatePdf: async (documentData: any, preview: boolean = false) => {
    console.log(`Generating PDF (${preview ? 'preview' : 'download'}) via Word→PDF conversion...`);
    
    // Step 1: Generate DOCX first (but don't record download for preview)
    console.log('Step 1: Generating DOCX document...');
    const docxResult = await documentApi.generateDocxInternal(documentData, preview);
    
    if (!docxResult.success || !docxResult.file_data) {
      throw new Error('Failed to generate DOCX for PDF conversion');
    }
    
    // Step 2: Convert DOCX to PDF using Word→PDF conversion
    console.log('Step 2: Converting DOCX to PDF...');
    const response = await fetch(getPythonApiUrl('/document-generator'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        format: 'docx-to-pdf',
        action: preview ? 'preview' : 'download',
        docx_data: docxResult.file_data
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Word→PDF conversion failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success || !result.file_data) {
      throw new Error(result.message || 'Word→PDF conversion failed');
    }
    
    if (result.file_type !== 'application/pdf') {
      throw new Error('Word→PDF conversion returned non-PDF format');
    }
    
    console.log(`✓ PDF generated successfully via Word→PDF conversion`);
    
    // Record download if successful and not a preview
    if (!preview && result.file_data) {
      try {
        await recordDownload(documentData, 'pdf', result.file_size || 0, result.file_data);
      } catch (e) {
        console.warn('Failed to record download:', e);
      }
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