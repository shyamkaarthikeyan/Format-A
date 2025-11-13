import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DocumentPreview from '../document-preview';
import { documentApi } from '@/lib/api';
import type { Document } from '@shared/schema';

// Mock dependencies
jest.mock('@/lib/api', () => ({
  documentApi: {
    generatePdf: jest.fn(),
    generateDocx: jest.fn()
  }
}));
jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: '1', email: 'test@example.com' }
  })
}));
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

const mockDocumentApi = documentApi as jest.Mocked<typeof documentApi>;

describe('DocumentPreview - PDF Generation', () => {
  let queryClient: QueryClient;

  const mockDocument: Document = {
    id: '1',
    title: 'Test Paper',
    authors: [{ id: '1', name: 'John Doe', email: 'john@example.com', customFields: [] }],
    abstract: 'Test abstract',
    keywords: 'test, paper',
    sections: [
      {
        id: '1',
        title: 'Introduction',
        contentBlocks: [
          { id: '1', type: 'text', content: 'Test content', order: 0 }
        ],
        subsections: [],
        order: 0
      }
    ],
    references: [],
    figures: [],
    tables: [],
    settings: {
      fontSize: '10pt',
      columns: '2',
      exportFormat: 'docx',
      includePageNumbers: true,
      includeCopyright: false
    }
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    jest.clearAllMocks();
    
    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  describe('PDF Download Functionality', () => {
    it('should display download PDF button', () => {
      renderWithProviders(<DocumentPreview document={mockDocument} />);

      const pdfButton = screen.getByText('Download PDF');
      expect(pdfButton).toBeInTheDocument();
      expect(pdfButton).not.toBeDisabled();
    });

    it('should disable download button when document has no title', () => {
      const docWithoutTitle = { ...mockDocument, title: '' };
      renderWithProviders(<DocumentPreview document={docWithoutTitle} />);

      const pdfButton = screen.getByText('Download PDF');
      expect(pdfButton).toBeDisabled();
    });

    it('should successfully download PDF', async () => {
      const mockPdfData = 'base64-pdf-data';
      mockDocumentApi.generatePdf.mockResolvedValue({
        success: true,
        file_data: mockPdfData,
        file_type: 'application/pdf',
        message: 'PDF generated'
      });

      // Mock document.createElement and appendChild for download
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn()
      };
      jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
      jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);

      renderWithProviders(<DocumentPreview document={mockDocument} />);

      const pdfButton = screen.getByText('Download PDF');
      fireEvent.click(pdfButton);

      await waitFor(() => {
        expect(mockDocumentApi.generatePdf).toHaveBeenCalledWith(mockDocument, false);
      });

      await waitFor(() => {
        expect(mockLink.click).toHaveBeenCalled();
      });
    });

    it('should handle PDF download error', async () => {
      mockDocumentApi.generatePdf.mockRejectedValue(new Error('PDF generation failed'));

      renderWithProviders(<DocumentPreview document={mockDocument} />);

      const pdfButton = screen.getByText('Download PDF');
      fireEvent.click(pdfButton);

      await waitFor(() => {
        expect(mockDocumentApi.generatePdf).toHaveBeenCalled();
      });

      // Button should be re-enabled after error
      await waitFor(() => {
        expect(pdfButton).not.toBeDisabled();
      });
    });

    it('should show generating state during PDF download', async () => {
      mockDocumentApi.generatePdf.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          success: true,
          file_data: 'data',
          file_type: 'application/pdf',
          message: 'Success'
        }), 100))
      );

      renderWithProviders(<DocumentPreview document={mockDocument} />);

      const pdfButton = screen.getByText('Download PDF');
      fireEvent.click(pdfButton);

      await waitFor(() => {
        expect(screen.getByText('Generating...')).toBeInTheDocument();
      });
    });
  });

  describe('PDF Preview Functionality', () => {
    it('should generate PDF preview automatically', async () => {
      mockDocumentApi.generatePdf.mockResolvedValue({
        success: true,
        file_data: 'base64-pdf-data',
        file_type: 'application/pdf',
        message: 'Preview generated'
      });

      renderWithProviders(<DocumentPreview document={mockDocument} />);

      await waitFor(() => {
        expect(mockDocumentApi.generatePdf).toHaveBeenCalledWith(mockDocument, true);
      }, { timeout: 2000 });
    });

    it('should display preview loading state', () => {
      mockDocumentApi.generatePdf.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          success: true,
          file_data: 'data',
          file_type: 'application/pdf',
          message: 'Success'
        }), 100))
      );

      renderWithProviders(<DocumentPreview document={mockDocument} />);

      expect(screen.getByText(/Generating PDF preview/)).toBeInTheDocument();
    });

    it('should display preview error message', async () => {
      mockDocumentApi.generatePdf.mockRejectedValue(new Error('Preview generation failed'));

      renderWithProviders(<DocumentPreview document={mockDocument} />);

      await waitFor(() => {
        expect(screen.getByText(/Preview generation failed/)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should show refresh button in preview section', () => {
      renderWithProviders(<DocumentPreview document={mockDocument} />);

      const refreshButton = screen.getByText('Refresh');
      expect(refreshButton).toBeInTheDocument();
    });

    it('should regenerate preview when refresh button is clicked', async () => {
      mockDocumentApi.generatePdf.mockResolvedValue({
        success: true,
        file_data: 'base64-pdf-data',
        file_type: 'application/pdf',
        message: 'Preview generated'
      });

      renderWithProviders(<DocumentPreview document={mockDocument} />);

      await waitFor(() => {
        expect(mockDocumentApi.generatePdf).toHaveBeenCalledTimes(1);
      }, { timeout: 2000 });

      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockDocumentApi.generatePdf).toHaveBeenCalledTimes(2);
      });
    });

    it('should not generate preview when document has no title', () => {
      const docWithoutTitle = { ...mockDocument, title: '' };
      renderWithProviders(<DocumentPreview document={docWithoutTitle} />);

      expect(screen.getByText(/Add a title and author to generate preview/)).toBeInTheDocument();
      expect(mockDocumentApi.generatePdf).not.toHaveBeenCalled();
    });

    it('should not generate preview when document has no authors', () => {
      const docWithoutAuthors = { ...mockDocument, authors: [] };
      renderWithProviders(<DocumentPreview document={docWithoutAuthors} />);

      expect(screen.getByText(/Add a title and author to generate preview/)).toBeInTheDocument();
      expect(mockDocumentApi.generatePdf).not.toHaveBeenCalled();
    });

    it('should display PDF iframe when preview is ready', async () => {
      mockDocumentApi.generatePdf.mockResolvedValue({
        success: true,
        file_data: 'base64-pdf-data',
        file_type: 'application/pdf',
        message: 'Preview generated'
      });

      renderWithProviders(<DocumentPreview document={mockDocument} />);

      await waitFor(() => {
        const iframe = screen.getByTitle('PDF Preview');
        expect(iframe).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Zoom Controls', () => {
    it('should display zoom controls when preview is available', async () => {
      mockDocumentApi.generatePdf.mockResolvedValue({
        success: true,
        file_data: 'base64-pdf-data',
        file_type: 'application/pdf',
        message: 'Preview generated'
      });

      renderWithProviders(<DocumentPreview document={mockDocument} />);

      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should increase zoom when zoom in button is clicked', async () => {
      mockDocumentApi.generatePdf.mockResolvedValue({
        success: true,
        file_data: 'base64-pdf-data',
        file_type: 'application/pdf',
        message: 'Preview generated'
      });

      renderWithProviders(<DocumentPreview document={mockDocument} />);

      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument();
      }, { timeout: 2000 });

      const zoomInButtons = screen.getAllByRole('button');
      const zoomInButton = zoomInButtons.find(btn => 
        btn.querySelector('svg')?.classList.contains('lucide-zoom-in') ||
        btn.textContent?.includes('ZoomIn')
      );

      if (zoomInButton) {
        fireEvent.click(zoomInButton);
        await waitFor(() => {
          expect(screen.getByText('125%')).toBeInTheDocument();
        });
      }
    });

    it('should decrease zoom when zoom out button is clicked', async () => {
      mockDocumentApi.generatePdf.mockResolvedValue({
        success: true,
        file_data: 'base64-pdf-data',
        file_type: 'application/pdf',
        message: 'Preview generated'
      });

      renderWithProviders(<DocumentPreview document={mockDocument} />);

      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument();
      }, { timeout: 2000 });

      const zoomOutButtons = screen.getAllByRole('button');
      const zoomOutButton = zoomOutButtons.find(btn => 
        btn.querySelector('svg')?.classList.contains('lucide-zoom-out') ||
        btn.textContent?.includes('ZoomOut')
      );

      if (zoomOutButton) {
        fireEvent.click(zoomOutButton);
        await waitFor(() => {
          expect(screen.getByText('75%')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Word Document Download', () => {
    it('should display download Word button', () => {
      renderWithProviders(<DocumentPreview document={mockDocument} />);

      const wordButton = screen.getByText('Download Word');
      expect(wordButton).toBeInTheDocument();
      expect(wordButton).not.toBeDisabled();
    });

    it('should successfully download Word document', async () => {
      const mockDocxData = 'base64-docx-data';
      mockDocumentApi.generateDocx.mockResolvedValue({
        success: true,
        file_data: mockDocxData,
        file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        message: 'DOCX generated'
      });

      const mockLink = {
        href: '',
        download: '',
        click: jest.fn()
      };
      jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
      jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);

      renderWithProviders(<DocumentPreview document={mockDocument} />);

      const wordButton = screen.getByText('Download Word');
      fireEvent.click(wordButton);

      await waitFor(() => {
        expect(mockDocumentApi.generateDocx).toHaveBeenCalledWith(mockDocument);
      });

      await waitFor(() => {
        expect(mockLink.click).toHaveBeenCalled();
      });
    });
  });

  describe('Error Messages', () => {
    it('should display user-friendly error for service unavailable', async () => {
      mockDocumentApi.generatePdf.mockRejectedValue(
        new Error('Service temporarily unavailable')
      );

      renderWithProviders(<DocumentPreview document={mockDocument} />);

      await waitFor(() => {
        expect(screen.getByText(/Service temporarily unavailable/)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should display user-friendly error for timeout', async () => {
      mockDocumentApi.generatePdf.mockRejectedValue(
        new Error('Request timed out')
      );

      renderWithProviders(<DocumentPreview document={mockDocument} />);

      await waitFor(() => {
        expect(screen.getByText(/timed out/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should display retry button on error', async () => {
      mockDocumentApi.generatePdf.mockRejectedValue(
        new Error('Preview generation failed')
      );

      renderWithProviders(<DocumentPreview document={mockDocument} />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });
});
