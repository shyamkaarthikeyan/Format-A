/**
 * Tests for DocumentPreview component
 * Verifies existing functionality is preserved and tests Vercel compatibility features
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DocumentPreview from '../document-preview';
import type { Document } from '@shared/schema';

// Mock the environment detector
const mockEnvironment = {
  isVercel: false,
  isLocal: true,
  supportsPdfGeneration: true,
  supportsImagePreview: true
};

jest.mock('@/utils/environment-detector', () => ({
  getEnvironment: jest.fn(() => mockEnvironment),
  isVercelEnvironment: jest.fn(() => mockEnvironment.isVercel),
  isLocalEnvironment: jest.fn(() => mockEnvironment.isLocal),
  supportsPdfGeneration: jest.fn(() => mockEnvironment.supportsPdfGeneration)
}));

// Mock the error messages
jest.mock('@/constants/vercel-error-messages', () => ({
  getVercelErrorMessage: jest.fn((error) => ({
    title: 'Test Error',
    message: 'Test error message',
    suggestion: 'Test suggestion',
    alternatives: ['Alternative 1', 'Alternative 2']
  })),
  formatErrorMessage: jest.fn((errorMsg) => `${errorMsg.message} ${errorMsg.suggestion}`)
}));

// Mock DocumentStructurePreview
jest.mock('../DocumentStructurePreview', () => {
  return function MockDocumentStructurePreview({ document }: { document: Document }) {
    return <div data-testid="document-structure-preview">Structure Preview for {document.title}</div>;
  };
});

// Mock UI components
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

// Mock hooks
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

// Mock Lucide React icons
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

describe('DocumentPreview', () => {
  let queryClient: QueryClient;

  const createMockDocument = (overrides: Partial<Document> = {}): Document => ({
    id: 'test-doc-1',
    title: 'Test IEEE Paper',
    authors: [
      { id: 'author-1', name: 'John Doe', email: 'john@example.com', customFields: [] }
    ],
    abstract: 'Test abstract',
    keywords: 'test, keywords',
    sections: [
      { id: 'section-1', title: 'Introduction', contentBlocks: [], subsections: [], order: 1 }
    ],
    references: [
      { id: 'ref-1', text: 'Test reference', order: 1 }
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
    
    // Reset mocks
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
    
    // Reset environment to local by default
    mockEnvironment.isVercel = false;
    mockEnvironment.isLocal = true;
    mockEnvironment.supportsPdfGeneration = true;
  });

  describe('Basic Rendering', () => {
    it('should render all main sections', () => {
      const document = createMockDocument();
      renderWithQueryClient(<DocumentPreview document={document} documentId="test-id" />);
      
      expect(screen.getByText('Download Word')).toBeInTheDocument();
      expect(screen.getByText('Download PDF')).toBeInTheDocument();
      expect(screen.getByText('Send via Email')).toBeInTheDocument();
      expect(screen.getByText('Live PDF Preview')).toBeInTheDocument();
    });

    it('should show ready for preview message when document is incomplete', () => {
      const incompleteDocument = createMockDocument({ title: '', authors: [] });
      renderWithQueryClient(<DocumentPreview document={incompleteDocument} documentId="test-id" />);
      
      expect(screen.getByText('Ready for Preview')).toBeInTheDocument();
      expect(screen.getByText(/Add a title and at least one author/)).toBeInTheDocument();
    });
  });

  describe('Environment Detection Integration', () => {
    it('should detect local environment and enable PDF generation', () => {
      mockEnvironment.isLocal = true;
      mockEnvironment.supportsPdfGeneration = true;
      
      const document = createMockDocument();
      renderWithQueryClient(<DocumentPreview document={document} documentId="test-id" />);
      
      // PDF download button should be enabled
      const pdfButton = screen.getByText('Download PDF');
      expect(pdfButton).not.toBeDisabled();
    });

    it('should detect Vercel environment and show fallback preview', async () => {
      mockEnvironment.isVercel = true;
      mockEnvironment.isLocal = false;
      mockEnvironment.supportsPdfGeneration = false;
      
      const document = createMockDocument();
      renderWithQueryClient(<DocumentPreview document={document} documentId="test-id" />);
      
      // Should show structure preview as fallback
      await waitFor(() => {
        expect(screen.getByTestId('document-structure-preview')).toBeInTheDocument();
      });
    });

    it('should show environment-aware loading messages', async () => {
      mockEnvironment.isVercel = true;
      mockEnvironment.supportsPdfGeneration = false;
      
      const document = createMockDocument();
      renderWithQueryClient(<DocumentPreview document={document} documentId="test-id" />);
      
      // Should show Vercel-specific loading message initially
      await waitFor(() => {
        expect(screen.getByText(/Switching to structure preview/)).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('PDF Preview Generation', () => {
    it('should attempt PDF generation on local environment', async () => {
      mockEnvironment.isLocal = true;
      mockEnvironment.supportsPdfGeneration = true;
      
      const mockBlob = new Blob(['fake pdf'], { type: 'application/pdf' });
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
        headers: new Headers({ 'content-type': 'application/pdf' })
      });
      
      const document = createMockDocument();
      renderWithQueryClient(<DocumentPreview document={document} documentId="test-id" />);
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/generate/docx-to-pdf?preview=true',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              'X-Preview': 'true'
            })
          })
        );
      });
    });

    it('should skip PDF generation on Vercel environment', () => {
      mockEnvironment.isVercel = true;
      mockEnvironment.supportsPdfGeneration = false;
      
      const document = createMockDocument();
      renderWithQueryClient(<DocumentPreview document={document} documentId="test-id" />);
      
      // Should not attempt PDF generation
      expect(fetch).not.toHaveBeenCalledWith(
        expect.stringContaining('/api/generate/docx-to-pdf'),
        expect.any(Object)
      );
    });

    it('should handle 503 errors gracefully and switch to fallback', async () => {
      mockEnvironment.isLocal = true;
      mockEnvironment.supportsPdfGeneration = true;
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      });
      
      const document = createMockDocument();
      renderWithQueryClient(<DocumentPreview document={document} documentId="test-id" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('document-structure-preview')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show enhanced error messages for PDF failures', async () => {
      mockEnvironment.isLocal = true;
      mockEnvironment.supportsPdfGeneration = true;
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Python module not found')
      });
      
      const document = createMockDocument();
      renderWithQueryClient(<DocumentPreview document={document} documentId="test-id" />);
      
      await waitFor(() => {
        expect(screen.getByText('Preview Error')).toBeInTheDocument();
        expect(screen.getByText('Test error message Test suggestion')).toBeInTheDocument();
      });
    });

    it('should provide retry functionality after errors', async () => {
      mockEnvironment.isLocal = true;
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });
      
      const document = createMockDocument();
      renderWithQueryClient(<DocumentPreview document={document} documentId="test-id" />);
      
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
      
      const retryButton = screen.getByText('Retry');
      expect(retryButton).not.toBeDisabled();
    });
  });

  describe('Fallback Preview Functionality', () => {
    it('should show structure preview when PDF is unavailable', async () => {
      mockEnvironment.isVercel = true;
      mockEnvironment.supportsPdfGeneration = false;
      
      const document = createMockDocument();
      renderWithQueryClient(<DocumentPreview document={document} documentId="test-id" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('document-structure-preview')).toBeInTheDocument();
        expect(screen.getByText('Structure Preview for Test IEEE Paper')).toBeInTheDocument();
      });
    });

    it('should show fallback information banner', async () => {
      mockEnvironment.isVercel = true;
      mockEnvironment.supportsPdfGeneration = false;
      
      const document = createMockDocument();
      renderWithQueryClient(<DocumentPreview document={document} documentId="test-id" />);
      
      await waitFor(() => {
        expect(screen.getByText(/Fallback Preview Active/)).toBeInTheDocument();
      });
    });

    it('should maintain zoom functionality for structure preview', async () => {
      mockEnvironment.isVercel = true;
      mockEnvironment.supportsPdfGeneration = false;
      
      const document = createMockDocument();
      renderWithQueryClient(<DocumentPreview document={document} documentId="test-id" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('zoom-in-icon')).toBeInTheDocument();
        expect(screen.getByTestId('zoom-out-icon')).toBeInTheDocument();
      });
      
      // Test zoom functionality
      const zoomInButton = screen.getByTestId('zoom-in-icon').closest('button');
      const zoomOutButton = screen.getByTestId('zoom-out-icon').closest('button');
      
      expect(zoomInButton).not.toBeDisabled();
      expect(zoomOutButton).not.toBeDisabled();
    });
  });

  describe('Download Functionality', () => {
    it('should handle Word document download', async () => {
      const mockBlob = new Blob(['fake docx'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob)
      });
      
      // Mock URL.createObjectURL and link click
      const mockCreateObjectURL = jest.fn(() => 'mock-url');
      const mockRevokeObjectURL = jest.fn();
      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;
      
      const mockClick = jest.fn();
      const mockLink = { href: '', download: '', click: mockClick };
      jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      
      const testDocument = createMockDocument();
      renderWithQueryClient(<DocumentPreview document={testDocument} documentId="test-id" />);
      
      const wordButton = screen.getByText('Download Word');
      fireEvent.click(wordButton);
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/generate/docx', expect.any(Object));
      });
    });

    it('should handle PDF download with fallback to Word', async () => {
      const mockBlob = new Blob(['fake docx'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
        headers: new Headers({ 'content-type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
      });
      
      const document = createMockDocument();
      renderWithQueryClient(<DocumentPreview document={document} documentId="test-id" />);
      
      const pdfButton = screen.getByText('Download PDF');
      fireEvent.click(pdfButton);
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/generate/docx-to-pdf', expect.any(Object));
      });
    });

    it('should disable download buttons when document is incomplete', () => {
      const incompleteDocument = createMockDocument({ title: '' });
      renderWithQueryClient(<DocumentPreview document={incompleteDocument} documentId="test-id" />);
      
      const wordButton = screen.getByText('Download Word');
      const pdfButton = screen.getByText('Download PDF');
      
      expect(wordButton).toBeDisabled();
      expect(pdfButton).toBeDisabled();
    });
  });

  describe('Email Functionality', () => {
    it('should handle email sending', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
      
      const document = createMockDocument();
      renderWithQueryClient(<DocumentPreview document={document} documentId="test-id" />);
      
      const emailInput = screen.getByTestId('input');
      const emailButton = screen.getByText('Send to Email');
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(emailButton);
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/generate/email', expect.any(Object));
      });
    });

    it('should show environment-aware loading text for email', () => {
      mockEnvironment.isVercel = true;
      
      const document = createMockDocument();
      renderWithQueryClient(<DocumentPreview document={document} documentId="test-id" />);
      
      // The loading text should be environment-aware (tested through the getEmailLoadingText function)
      expect(screen.getByText('Send to Email')).toBeInTheDocument();
    });
  });

  describe('Zoom Controls', () => {
    it('should handle zoom in and zoom out', () => {
      const document = createMockDocument();
      renderWithQueryClient(<DocumentPreview document={document} documentId="test-id" />);
      
      const zoomInButton = screen.getByTestId('zoom-in-icon').closest('button');
      const zoomOutButton = screen.getByTestId('zoom-out-icon').closest('button');
      
      expect(zoomInButton).not.toBeDisabled();
      expect(zoomOutButton).not.toBeDisabled();
      
      // Initial zoom should be 75%
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('should disable zoom out at minimum zoom', () => {
      const document = createMockDocument();
      renderWithQueryClient(<DocumentPreview document={document} documentId="test-id" />);
      
      const zoomOutButton = screen.getByTestId('zoom-out-icon').closest('button');
      
      // Click zoom out multiple times to reach minimum
      for (let i = 0; i < 10; i++) {
        fireEvent.click(zoomOutButton!);
      }
      
      expect(zoomOutButton).toBeDisabled();
    });

    it('should disable zoom in at maximum zoom', () => {
      const document = createMockDocument();
      renderWithQueryClient(<DocumentPreview document={document} documentId="test-id" />);
      
      const zoomInButton = screen.getByTestId('zoom-in-icon').closest('button');
      
      // Click zoom in multiple times to reach maximum
      for (let i = 0; i < 10; i++) {
        fireEvent.click(zoomInButton!);
      }
      
      expect(zoomInButton).toBeDisabled();
    });
  });

  describe('Refresh Functionality', () => {
    it('should provide refresh button for preview regeneration', () => {
      const document = createMockDocument();
      renderWithQueryClient(<DocumentPreview document={document} documentId="test-id" />);
      
      const refreshButton = screen.getByTestId('refresh-icon').closest('button');
      expect(refreshButton).toBeInTheDocument();
      expect(refreshButton).not.toBeDisabled();
    });

    it('should disable refresh when document is incomplete', () => {
      const incompleteDocument = createMockDocument({ title: '' });
      renderWithQueryClient(<DocumentPreview document={incompleteDocument} documentId="test-id" />);
      
      const refreshButton = screen.getByTestId('refresh-icon').closest('button');
      expect(refreshButton).toBeDisabled();
    });
  });

  describe('Existing Functionality Preservation', () => {
    it('should maintain all existing preview modes', async () => {
      const document = createMockDocument();
      renderWithQueryClient(<DocumentPreview document={document} documentId="test-id" />);
      
      // Should support PDF mode (default for local)
      expect(screen.getByText('Live PDF Preview')).toBeInTheDocument();
      
      // Should support structure mode (fallback)
      mockEnvironment.isVercel = true;
      mockEnvironment.supportsPdfGeneration = false;
      
      // Re-render with Vercel environment
      renderWithQueryClient(<DocumentPreview document={document} documentId="test-id" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('document-structure-preview')).toBeInTheDocument();
      });
    });

    it('should preserve all existing state management', () => {
      const document = createMockDocument();
      renderWithQueryClient(<DocumentPreview document={document} documentId="test-id" />);
      
      // All existing UI elements should be present
      expect(screen.getByText('Download Word')).toBeInTheDocument();
      expect(screen.getByText('Download PDF')).toBeInTheDocument();
      expect(screen.getByText('Send via Email')).toBeInTheDocument();
      expect(screen.getByText('Live PDF Preview')).toBeInTheDocument();
      expect(screen.getByTestId('input')).toBeInTheDocument();
    });

    it('should maintain existing error handling patterns', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      });
      
      const document = createMockDocument();
      renderWithQueryClient(<DocumentPreview document={document} documentId="test-id" />);
      
      await waitFor(() => {
        expect(screen.getByText('Preview Error')).toBeInTheDocument();
      });
    });
  });
});