/**
 * Tests for environment detection utility
 * Verifies accurate detection of Vercel vs local environments
 */

import {
  detectEnvironment,
  getEnvironment,
  isVercelEnvironment,
  isLocalEnvironment,
  supportsPdfGeneration,
  refreshEnvironmentCache,
  getEnvironmentDescription,
  type DeploymentEnvironment
} from '../environment-detector';

// Mock window and process objects for testing
const mockWindow = (hostname: string, port?: string) => {
  Object.defineProperty(window, 'location', {
    value: {
      hostname,
      port: port || '',
    },
    writable: true,
  });
};

const mockProcess = (env: Record<string, string | undefined>) => {
  const originalProcess = global.process;
  global.process = {
    ...originalProcess,
    env: { ...originalProcess?.env, ...env },
  } as NodeJS.Process;
  return originalProcess;
};

describe('Environment Detection', () => {
  let originalWindow: typeof window;
  let originalProcess: typeof process;

  beforeEach(() => {
    // Store original values
    originalWindow = global.window;
    originalProcess = global.process;
    
    // Reset cache before each test
    refreshEnvironmentCache();
  });

  afterEach(() => {
    // Restore original values
    global.window = originalWindow;
    global.process = originalProcess;
    refreshEnvironmentCache();
  });

  describe('Vercel Environment Detection', () => {
    it('should detect Vercel environment from VERCEL env var', () => {
      mockProcess({ VERCEL: '1' });
      
      const env = detectEnvironment();
      
      expect(env.isVercel).toBe(true);
      expect(env.isLocal).toBe(false);
      expect(env.supportsPdfGeneration).toBe(false);
      expect(env.supportsImagePreview).toBe(true);
    });

    it('should detect Vercel environment from VERCEL_URL env var', () => {
      mockProcess({ VERCEL_URL: 'https://my-app-git-main-user.vercel.app' });
      
      const env = detectEnvironment();
      
      expect(env.isVercel).toBe(true);
      expect(env.isLocal).toBe(false);
      expect(env.supportsPdfGeneration).toBe(false);
    });

    it('should detect Vercel environment from VERCEL_ENV env var', () => {
      mockProcess({ VERCEL_ENV: 'production' });
      
      const env = detectEnvironment();
      
      expect(env.isVercel).toBe(true);
      expect(env.supportsPdfGeneration).toBe(false);
    });

    it('should detect Vercel environment from vercel.app hostname', () => {
      mockProcess({});
      mockWindow('my-app-abc123.vercel.app');
      
      const env = detectEnvironment();
      
      expect(env.isVercel).toBe(true);
      expect(env.isLocal).toBe(false);
      expect(env.supportsPdfGeneration).toBe(false);
    });

    it('should detect Vercel environment from vercel.live hostname', () => {
      mockProcess({});
      mockWindow('my-app-def456.vercel.live');
      
      const env = detectEnvironment();
      
      expect(env.isVercel).toBe(true);
      expect(env.supportsPdfGeneration).toBe(false);
    });

    it('should detect Vercel preview deployment pattern', () => {
      mockProcess({});
      mockWindow('my-app-git-feature-abc123.vercel.app');
      
      const env = detectEnvironment();
      
      expect(env.isVercel).toBe(true);
      expect(env.supportsPdfGeneration).toBe(false);
    });
  });

  describe('Local Environment Detection', () => {
    it('should detect localhost environment', () => {
      mockProcess({});
      mockWindow('localhost', '3000');
      
      const env = detectEnvironment();
      
      expect(env.isLocal).toBe(true);
      expect(env.isVercel).toBe(false);
      expect(env.supportsPdfGeneration).toBe(true);
      expect(env.supportsImagePreview).toBe(true);
    });

    it('should detect 127.0.0.1 environment', () => {
      mockProcess({});
      mockWindow('127.0.0.1', '3000');
      
      const env = detectEnvironment();
      
      expect(env.isLocal).toBe(true);
      expect(env.isVercel).toBe(false);
      expect(env.supportsPdfGeneration).toBe(true);
    });

    it('should detect local IP addresses', () => {
      mockProcess({});
      mockWindow('192.168.1.100', '3000');
      
      const env = detectEnvironment();
      
      expect(env.isLocal).toBe(true);
      expect(env.supportsPdfGeneration).toBe(true);
    });

    it('should detect Vite development server port', () => {
      mockProcess({});
      mockWindow('localhost', '5173');
      
      const env = detectEnvironment();
      
      expect(env.isLocal).toBe(true);
      expect(env.supportsPdfGeneration).toBe(true);
    });

    it('should detect React development server port', () => {
      mockProcess({});
      mockWindow('localhost', '3000');
      
      const env = detectEnvironment();
      
      expect(env.isLocal).toBe(true);
      expect(env.supportsPdfGeneration).toBe(true);
    });
  });

  describe('Other Environment Detection', () => {
    it('should handle unknown environments', () => {
      mockProcess({});
      mockWindow('example.com');
      
      const env = detectEnvironment();
      
      expect(env.isLocal).toBe(false);
      expect(env.isVercel).toBe(false);
      expect(env.supportsPdfGeneration).toBe(true); // Default to true for non-Vercel
      expect(env.supportsImagePreview).toBe(true);
    });

    it('should handle missing window object (server-side)', () => {
      mockProcess({});
      // @ts-ignore - Simulate server environment
      delete global.window;
      
      const env = detectEnvironment();
      
      expect(env.isLocal).toBe(false);
      expect(env.isVercel).toBe(false);
      expect(env.supportsPdfGeneration).toBe(true);
    });
  });

  describe('Caching Functionality', () => {
    it('should cache environment detection results', () => {
      mockProcess({ VERCEL: '1' });
      
      const env1 = getEnvironment();
      const env2 = getEnvironment();
      
      expect(env1).toBe(env2); // Should return same object reference
      expect(env1.isVercel).toBe(true);
    });

    it('should refresh cache when requested', () => {
      mockProcess({});
      mockWindow('localhost');
      
      const env1 = getEnvironment();
      expect(env1.isLocal).toBe(true);
      
      // Change environment
      mockProcess({ VERCEL: '1' });
      
      // Should still return cached result
      const env2 = getEnvironment();
      expect(env2.isLocal).toBe(true);
      
      // Refresh cache
      refreshEnvironmentCache();
      
      // Should detect new environment
      const env3 = getEnvironment();
      expect(env3.isVercel).toBe(true);
    });
  });

  describe('Convenience Functions', () => {
    it('should provide isVercelEnvironment helper', () => {
      mockProcess({ VERCEL: '1' });
      refreshEnvironmentCache();
      
      expect(isVercelEnvironment()).toBe(true);
    });

    it('should provide isLocalEnvironment helper', () => {
      mockProcess({});
      mockWindow('localhost');
      refreshEnvironmentCache();
      
      expect(isLocalEnvironment()).toBe(true);
    });

    it('should provide supportsPdfGeneration helper', () => {
      mockProcess({});
      mockWindow('localhost');
      refreshEnvironmentCache();
      
      expect(supportsPdfGeneration()).toBe(true);
      
      mockProcess({ VERCEL: '1' });
      refreshEnvironmentCache();
      
      expect(supportsPdfGeneration()).toBe(false);
    });

    it('should provide environment description', () => {
      mockProcess({ VERCEL: '1' });
      refreshEnvironmentCache();
      
      expect(getEnvironmentDescription()).toBe('Vercel Deployment');
      
      mockProcess({});
      mockWindow('localhost');
      refreshEnvironmentCache();
      
      expect(getEnvironmentDescription()).toBe('Local Development');
      
      mockProcess({});
      mockWindow('example.com');
      refreshEnvironmentCache();
      
      expect(getEnvironmentDescription()).toBe('Other Environment');
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined process.env', () => {
      const originalProcess = global.process;
      global.process = {
        ...originalProcess,
        env: undefined as any,
      } as NodeJS.Process;
      
      mockWindow('localhost');
      
      const env = detectEnvironment();
      
      expect(env.isLocal).toBe(true);
      expect(env.isVercel).toBe(false);
    });

    it('should handle missing hostname', () => {
      mockProcess({});
      Object.defineProperty(window, 'location', {
        value: {
          hostname: undefined,
          port: '',
        },
        writable: true,
      });
      
      const env = detectEnvironment();
      
      expect(env.isLocal).toBe(false);
      expect(env.isVercel).toBe(false);
    });

    it('should prioritize Vercel detection over local detection', () => {
      mockProcess({ VERCEL: '1' });
      mockWindow('localhost', '3000');
      
      const env = detectEnvironment();
      
      expect(env.isVercel).toBe(true);
      expect(env.isLocal).toBe(false);
      expect(env.supportsPdfGeneration).toBe(false);
    });
  });

  describe('Feature Availability', () => {
    it('should disable PDF generation on Vercel', () => {
      mockProcess({ VERCEL: '1' });
      
      const env = detectEnvironment();
      
      expect(env.supportsPdfGeneration).toBe(false);
    });

    it('should enable PDF generation on local', () => {
      mockProcess({});
      mockWindow('localhost');
      
      const env = detectEnvironment();
      
      expect(env.supportsPdfGeneration).toBe(true);
    });

    it('should always support image preview', () => {
      mockProcess({ VERCEL: '1' });
      let env = detectEnvironment();
      expect(env.supportsImagePreview).toBe(true);
      
      mockProcess({});
      mockWindow('localhost');
      refreshEnvironmentCache();
      env = detectEnvironment();
      expect(env.supportsImagePreview).toBe(true);
    });
  });
});