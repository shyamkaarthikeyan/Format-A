/**
 * Integration tests for Vercel compatibility features
 * Tests the complete workflow of environment detection, error handling, and fallback preview
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DocumentPreview from '../components/document-preview';
import type { Document } from '@shared/schema';

// Import actual modules for integration testing
import * as EnvironmentDetector from '../utils/environment-detector';
import * as ErrorMessages from '../constants/vercel-error-messages';

// Mock only external dependencies
jest.mock('../components/DocumentStructurePreview', () => {
  return function MockDocumentStructurePreview({ document }: { document: Document }) {
    return (
      <div data-testid="document-structure-preview">
        <h2>Structure Preview</h2>
        <p>Document: {document.title}</p>
        <p>Authors: {document.authors?.map(a => a.name).join(', ')}</p>
      </div>
    );
  };
});

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h3 data-testid="card-title">{children}</h3>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={className}
      data-testid={props['data-testid'] || 'button'}
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, ...props }: any) => (
    <input 
      value={value} 
      onChange={onChange}
      data-testid="input"
      {...props}
    />
  ),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    isAuthenticated: true
  })
}));

jest.mock('lucide-react', () => ({
  ZoomIn: () => <div data-testid="zoom-in-icon" />,
  ZoomOut: () => <div data-testid="zoom-out-icon" />,
  Download: () => <div data-testid="download-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  Mail: () => <div data-testid="mail-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  Lock: () => <div data-testid="lock-icon" />,
}));

// Mock fetch
global.fetch = jest.fn();

describe('Vercel Compatibility Integration Tests', () => {
  let queryClient: QueryClient;

  const createMockDocument = (overrides: Partial<Document> = {}): Document => ({
    id: 'test-doc-1',
    title: 'Integration Test Paper',
    authors: [
      { id: 'author-1', name: 'Test Author', email: 'test@example.com', customFields: [] }
    ],
    abstract: 'Test abstract for integration testing',
    keywords: 'integration, testing, vercel',
    sections: [
      { id: 'section-1', title: 'Introduction', contentBlocks: [], subsections: [], order: 1 },
      { id: 'section-2', title: 'Methods', contentBlocks: [], subsections: [], order: 2 }
    ],
    references: [
      { id: 'ref-1', text: 'Test Reference 1', order: 1 },
      { id: 'ref-2', text: 'Test Reference 2', order: 2 }
    ],
    figures: [],
    settings: {
      fontSize: '9.5pt',
      columns: 'double',
      exportFormat: 'docx',
      includePageNumbers: true,
      includeCopyright: true
    },
    ...overrides
  });

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
    
    // Reset environment cache
    EnvironmentDetector.refreshEnvironmentCache();
  });

  describe('Local Environment Workflow', () => {
    beforeEach(() => {
      // Mock local environment
      Object.defineProperty(window, 'location', {
        value: { hostname: 'localhost', port: '3000' },
        writable: true,
      });
      
      // Mock process for server-side detection
      global.process = {
        ...global.process,
        env: {}
      } as NodeJS.Process;
    });

    it('should detect local environment and enable full PDF functionality', async () => {
      const mockBlob = new Blob(['fake pdf'], { type: 'application/pdf' });
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
        headers: new Headers({ 'content-type': 'application/pdf' })
      });

      const document = createMockDocument();
      renderWithQueryClient(<DocumentPreview document={document} documentId="test-id" />);

      // Should detect local environment
      const env = EnvironmentDetector.getEnvironment();
      expect(env.isLocal).toBe(true);
      expect(env.supportsPdfGeneration).toBe(true);

      // Should attempt PDF generation
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/generate/docx-to-pdf?preview=true',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'X-Preview': 'true'
            })
          })
        );
      });

      // Should show PDF preview interface
      expect(screen.getByText('Live PDF Preview')).toBeInTheDocument();
    });

    it('should handle PDF generation failures with enhanced error messages', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Python module docx2pdf not found')
      });

      const document = createMockDocument();
      renderWithQueryClient(<DocumentPreview document={document} documentId="test-id" />);

      await waitFor(() => {
        expect(screen.getByText('Preview Error')).toBeInTheDocument();
      });

      // Should use enhanced error message system
      const errorMessage = ErrorMessages.getVercelErrorMessage('Python module docx2pdf not found');
      expect(errorMessage.title).toBe('System Dependencies Unavailable');
      expect(errorMessage.message).toContain('Python libraries');
    });
  });

  describe('Vercel Environment Workflow', () => {
    beforeEach(() => {
      // Mock Vercel environment
      Object.defineProperty(window, 'location', {
        value: { hostname: 'my-app-abc123.vercel.app', port: '' },
        writable: true,
      });
      
      global.process = {
        ...global.process,
        env: { VERCEL: '1', VERCEL_ENV: 'production' }
      } as NodeJS.Process;
      
      EnvironmentDetector.refreshEnvironmentCache();
    });

    it('should detect Vercel environment and skip PDF generation', async () => {
      const document = createMockDocument();
      renderWithQueryClient(<DocumentPreview document={document} documentId="test-id" />);

      // Should detect Vercel environment
      const env = EnvironmentDetector.getEnvironment();
      expect(env.isVercel).toBe(true);
      expect(env.supportsPdfGeneration).toBe(false);

      // Should NOT attempt PDF generation
      expect(fetch).not.toHaveBeenCalledWith(
        expect.stringContaining('/api/generate/docx-to-pdf'),
        expect.any(Object)
      );

      // Should show structure preview as fallback
      await waitFor(() => {
        expect(screen.getByTestId('document-structure-preview')).toBeInTheDocument();
      });
    });

    it('should show appropriate loading messages for Vercel environment', async () => {
      const document = createMockDocument();
      renderWithQueryClient(<DocumentPreview document={document} documentId="test-id" />);

      // Should show Vercel-specific loading message
      await waitFor(() => {
        expect(screen.getByText(/Switching to structure preview/)).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should display fallback preview information', async () => {
      const document = createMockDocument();
      renderWithQueryClient(<DocumentPreview document={document} documentId="test-id" />);

      await waitFor(() => {
        expect(screen.getByText(/Fallback Preview Active/)).toBeInTheDocument();
        expect(screen.getByText(/PDF preview is not available on Vercel deployments/)).toBeInTheDocument();
      });
    });

    it('should maintain download functionality on Vercel', () => {
      const document = createMockDocument();
      renderWithQueryClient(<DocumentPreview document={document} documentId="test-id" />);

      // Download buttons should still be available
      expect(screen.getByText('Download Word')).toBeInTheDocument();
      expect(screen.getByText('Download PDF')).toBeInTheDocument();
      
      // Buttons should not be disabled due to environment
      const wordButton = screen.getByText('Download Word');
      const pdfButton = screen.getByText('Download PDF');
      expect(wordButton).not.toBeDisabled();
      expect(pdfButton).not.toBeDisabled();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle 503 errors and switch to fallback preview', async () => {
      // Set up local environment that should support PDF
      Object.defineProperty(window, 'location', {
        value: { hostname: 'localhost', port: '3000' },
        writable: true,
      });
      global.process = { ...global.process, env: {} } as NodeJS.Process;
      EnvironmentDetector.refreshEnvironmentCache();

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      });

      const document = createMockDocument();
      renderWithQueryClient(<DocumentPreview document={document} documentId="test-id" />);

      // Should attempt PDF generation first
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/generate/docx-to-pdf'),
          expect.any(Object)
        );
      });

      // Should switch to structure preview after 503 error
      await waitFor(() => {
        expect(screen.getByTestId('document-structure-preview')).toBeInTheDocument();
      });

      // Should not show error message for 503 (graceful fallback)
      expect(screen.queryByText('Preview Error')).not.toBeInTheDocument();
    });

    it('should provide appropriate error messages for different error types', async () => {
      const testCases = [
        {
          error: 'Python module not found',
          expectedType: 'PYTHON_DEPENDENCY_MISSING',
          expectedTitle: 'System Dependencies Unavailable'
        },
        {
          error: 'Serverless function timeout',
          expectedType: 'SERVERLESS_LIMITATION',
          expectedTitle: 'Feature Limited on Serverless'
        },
        {
          error: 'Network timeout occurred',
          expectedType: 'NETWORK_ERROR',
          expectedTitle: 'Connection Issue'
        },
        {
          error: 'Title is required for generation',
          expectedType: 'DOCUMENT_VALIDATION_ERROR',
          expectedTitle: 'Document Incomplete'
        }
      ];

      for (const testCase of testCases) {
        const errorMessage = ErrorMessages.getVercelErrorMessage(testCase.error);
        expect(errorMessage.title).toBe(testCase.expectedTitle);
        expect(errorMessage.alternatives.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Feature Availability Integration', () => {
    it('should maintain consistent feature availability across environments', () => {
      // Test local environment
      Object.defineProperty(window, 'location', {
        value: { hostname: 'localhost', port: '3000' },
        writable: true,
      });
      global.process = { ...global.process, env: {} } as NodeJS.Process;
      EnvironmentDetector.refreshEnvironmentCache();

      let env = EnvironmentDetector.getEnvironment();
      expect(env.supportsPdfGeneration).toBe(true);
      expect(env.supportsImagePreview).toBe(true);

      // Test Vercel environment
      Object.defineProperty(window, 'location', {
        value: { hostname: 'my-app.vercel.app', port: '' },
        writable: true,
      });
      global.process = { ...global.process, env: { VERCEL: '1' } } as NodeJS.Process;
      EnvironmentDetector.refreshEnvironmentCache();

      env = EnvironmentDetector.getEnvironment();
      expect(env.supportsPdfGeneration).toBe(false);
      expect(env.supportsImagePreview).toBe(true); // Always available
    });

    it('should provide consistent user experience across environments', async () => {
      const document = createMockDocument();

      // Test in local environment
      Object.defineProperty(window, 'location', {
        value: { hostname: 'localhost', port: '3000' },
        writable: true,
      });
      global.process = { ...global.process, env: {} } as NodeJS.Process;
      EnvironmentDetector.refreshEnvironmentCache();

      const { unmount } = renderWithQueryClient(<DocumentPreview document={document} documentId="test-id" />);
      
      // Should have all standard features
      expect(screen.getByText('Download Word')).toBeInTheDocument();
      expect(screen.getByText('Download PDF')).toBeInTheDocument();
      expect(screen.getByText('Send via Email')).toBeInTheDocument();
      
      unmount();

      // Test in Vercel environment
      Object.defineProperty(window, 'location', {
        value: { hostname: 'my-app.vercel.app', port: '' },
        writable: true,
      });
      global.process = { ...global.process, env: { VERCEL: '1' } } as NodeJS.Process;
      EnvironmentDetector.refreshEnvironmentCache();

      renderWithQueryClient(<DocumentPreview document={document} documentId="test-id" />);
      
      // Should have same core features
      expect(screen.getByText('Download Word')).toBeInTheDocument();
      expect(screen.getByText('Download PDF')).toBeInTheDocument();
      expect(screen.getByText('Send via Email')).toBeInTheDocument();
      
      // Should have fallback preview
      await waitFor(() => {
        expect(screen.getByTestId('document-structure-preview')).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Reliability', () => {
    it('should cache environment detection for performance', () => {
      // First detection
      const env1 = EnvironmentDetector.getEnvironment();
      const env2 = EnvironmentDetector.getEnvironment();
      
      // Should return same object reference (cached)
      expect(env1).toBe(env2);
    });

    it('should handle environment detection failures gracefully', () => {
      // Simulate missing window object
      const originalWindow = global.window;
      delete (global as any).window;
      
      // Should not throw
      expect(() => {
        EnvironmentDetector.detectEnvironment();
      }).not.toThrow();
      
      // Restore window
      global.window = originalWindow;
    });

    it('should provide fallback behavior when all detection methods fail', () => {
      // Mock environment where detection might be unreliable
      global.process = { ...global.process, env: undefined } as any;
      Object.defineProperty(window, 'location', {
        value: { hostname: undefined, port: undefined },
        writable: true,
      });
      
      const env = EnvironmentDetector.detectEnvironment();
      
      // Should default to safe values
      expect(env.isVercel).toBe(false);
      expect(env.isLocal).toBe(false);
      expect(env.supportsPdfGeneration).toBe(true); // Default to true for non-Vercel
      expect(env.supportsImagePreview).toBe(true);
    });
  });

  describe('User Experience Integration', () => {
    it('should provide clear feedback about environment limitations', async () => {
      // Test Vercel environment with clear messaging
      Object.defineProperty(window, 'location', {
        value: { hostname: 'my-app.vercel.app', port: '' },
        writable: true,
      });
      global.process = { ...global.process, env: { VERCEL: '1' } } as NodeJS.Process;
      EnvironmentDetector.refreshEnvironmentCache();

      const document = createMockDocument();
      renderWithQueryClient(<DocumentPreview document={document} documentId="test-id" />);

      await waitFor(() => {
        // Should explain why PDF preview is not available
        expect(screen.getByText(/PDF preview is not available on Vercel deployments/)).toBeInTheDocument();
        // Should provide alternatives
        expect(screen.getByText('Download Word')).toBeInTheDocument();
        expect(screen.getByText('Download PDF')).toBeInTheDocument();
      });
    });

    it('should maintain zoom and interaction controls in all preview modes', async () => {
      const document = createMockDocument();
      renderWithQueryClient(<DocumentPreview document={document} documentId="test-id" />);

      // Zoom controls should always be available
      expect(screen.getByTestId('zoom-in-icon')).toBeInTheDocument();
      expect(screen.getByTestId('zoom-out-icon')).toBeInTheDocument();
      expect(screen.getByTestId('refresh-icon')).toBeInTheDocument();

      // Should show zoom percentage
      expect(screen.getByText('75%')).toBeInTheDocument();
    });
  });
});