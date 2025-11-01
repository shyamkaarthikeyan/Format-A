/**
 * Environment Detection Utility for Vercel Preview Compatibility
 * 
 * Provides lightweight, non-intrusive detection of deployment environment
 * to enable appropriate fallbacks and feature availability checks.
 */

export interface DeploymentEnvironment {
  isVercel: boolean;
  isLocal: boolean;
  supportsPdfGeneration: boolean;
  supportsImagePreview: boolean;
}

/**
 * Detects the current deployment environment and available features
 * 
 * This function performs lightweight checks to determine if the application
 * is running on Vercel, localhost, or other environments. It uses multiple
 * detection methods to ensure reliability without interfering with existing
 * functionality.
 * 
 * @returns {DeploymentEnvironment} Environment information and feature availability
 */
export function detectEnvironment(): DeploymentEnvironment {
  // Check for Vercel-specific environment variables and URL patterns
  const isVercel = !!(
    // Server-side Vercel environment variables
    (typeof process !== 'undefined' && process.env && (
      process.env.VERCEL || 
      process.env.VERCEL_URL ||
      process.env.VERCEL_ENV
    )) ||
    // Client-side URL pattern detection
    (typeof window !== 'undefined' && window.location.hostname && (
      window.location.hostname.includes('vercel.app') ||
      window.location.hostname.includes('vercel.live') ||
      // Check for Vercel preview deployments
      window.location.hostname.match(/^[a-z0-9-]+-[a-z0-9-]+-[a-z0-9]+\.vercel\.app$/)
    ))
  );

  // Detect local development environment
  const isLocal = !isVercel && (
    typeof window !== 'undefined' && window.location && (
      (window.location.hostname && (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.startsWith('192.168.') ||
        window.location.hostname.startsWith('10.')
      )) ||
      (window.location.port && window.location.port !== '' && (
        window.location.port === '3000' ||
        window.location.port === '5173' // Vite default port
      ))
    )
  );

  return {
    isVercel,
    isLocal,
    // PDF generation is not available on Vercel due to serverless limitations
    supportsPdfGeneration: !isVercel,
    // Image preview is always available
    supportsImagePreview: true
  };
}

/**
 * Cached environment detection result to avoid repeated checks
 * This ensures the detection is lightweight and non-intrusive
 */
let cachedEnvironment: DeploymentEnvironment | null = null;

/**
 * Gets the current environment with caching for performance
 * 
 * @returns {DeploymentEnvironment} Cached or freshly detected environment
 */
export function getEnvironment(): DeploymentEnvironment {
  if (cachedEnvironment === null) {
    cachedEnvironment = detectEnvironment();
  }
  return cachedEnvironment;
}

/**
 * Checks if the current environment is Vercel
 * 
 * @returns {boolean} True if running on Vercel
 */
export function isVercelEnvironment(): boolean {
  return getEnvironment().isVercel;
}

/**
 * Checks if the current environment is local development
 * 
 * @returns {boolean} True if running locally
 */
export function isLocalEnvironment(): boolean {
  return getEnvironment().isLocal;
}

/**
 * Checks if PDF generation is supported in the current environment
 * 
 * @returns {boolean} True if PDF generation is available
 */
export function supportsPdfGeneration(): boolean {
  return getEnvironment().supportsPdfGeneration;
}

/**
 * Forces a refresh of the cached environment detection
 * Useful for testing or when environment might change
 */
export function refreshEnvironmentCache(): void {
  cachedEnvironment = null;
}

/**
 * Gets a human-readable description of the current environment
 * Useful for debugging and logging
 * 
 * @returns {string} Environment description
 */
export function getEnvironmentDescription(): string {
  const env = getEnvironment();
  
  if (env.isVercel) {
    return 'Vercel Deployment';
  } else if (env.isLocal) {
    return 'Local Development';
  } else {
    return 'Other Environment';
  }
}