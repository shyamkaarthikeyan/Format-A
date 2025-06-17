// API configuration for development and production
const getApiBaseUrl = () => {
  // In development, use relative URLs (Vite proxy handles this)
  if (import.meta.env.DEV) {
    return '';
  }
  
  // In production, use the same origin (since frontend and backend are served together)
  return '';
};

export const API_BASE_URL = getApiBaseUrl();

export function getApiUrl(path: string): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}