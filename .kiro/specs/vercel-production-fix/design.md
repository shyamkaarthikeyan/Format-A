# Design Document

## Overview

The Format-A application fails in Vercel production because it relies on Python scripts for PDF generation that work locally but are not properly configured for Vercel's serverless environment. The solution involves making Python work in Vercel by using Python serverless functions alongside the existing Node.js API, preserving the excellent Python-based PDF generation while ensuring serverless compatibility.

## Architecture

### Current Architecture (Problematic)
```
Frontend → Node.js API → Python Scripts (local spawn) → PDF Output
```

### Target Architecture (Serverless-Compatible)
```
Frontend → Node.js API → Python Serverless Functions → PDF Output
```

## Components and Interfaces

### 1. Python Serverless Function Setup

**Current Implementation:**
- Uses Python `reportlab` for direct PDF generation (KEEP THIS!)
- Uses Python `docx2pdf` for DOCX to PDF conversion (KEEP THIS!)
- Spawns Python processes via `child_process.spawn()` (REPLACE THIS)

**New Implementation:**
- Create dedicated Python serverless functions in `/api/` directory
- Use Vercel's Python runtime support with `requirements.txt`
- Keep existing Python scripts but expose them as HTTP endpoints
- Node.js API calls Python functions via HTTP instead of process spawning

### 2. Python Serverless Functions (Keep Your Excellent Python Code!)

**Component: Python IEEE PDF Generator**
- **Input:** Document data via HTTP POST
- **Output:** PDF buffer as HTTP response
- **Technology:** Your existing `reportlab` and `python-docx` scripts (KEEP THESE!)
- **Location:** `/api/generate-pdf.py` (new Python serverless function)

**Component: Python DOCX to PDF Converter**
- **Input:** DOCX data via HTTP POST
- **Output:** PDF buffer as HTTP response
- **Technology:** Your existing `docx2pdf` scripts (KEEP THESE!)
- **Location:** `/api/convert-docx-pdf.py` (new Python serverless function)

### 3. Serverless Function Structure

**Python Functions (New):**
- `/api/generate-pdf.py` - Direct PDF generation using your reportlab code
- `/api/convert-docx-pdf.py` - DOCX to PDF using your docx2pdf code
- `/api/health-python.py` - Health check for Python dependencies

**Node.js API (Updated):**
- `/api/documents.ts` - Routes requests to appropriate Python functions
- Handles authentication and request validation
- Calls Python functions via internal HTTP requests

### 4. Environment Configuration

**Vercel Configuration Updates:**
- Create `requirements.txt` in project root for Python dependencies
- Configure Vercel to recognize Python runtime for `.py` files
- Keep your existing Python dependencies (they're perfect!)

**Python Dependencies (Keep These!):**
```txt
reportlab==4.2.5
python-docx==1.1.2
Pillow==10.1.0
docx2pdf==0.1.8
```

## Data Models

### Document Generation Request
```typescript
interface DocumentRequest {
  title: string;
  authors: Author[];
  abstract?: string;
  keywords?: string[];
  sections: Section[];
  isPreview: boolean;
}

interface Author {
  name: string;
  affiliation?: string;
  email?: string;
}

interface Section {
  title: string;
  content: string;
  subsections?: Section[];
}
```

### PDF Generation Response
```typescript
interface PDFResponse {
  success: boolean;
  buffer?: Buffer;
  error?: string;
  metadata: {
    pages: number;
    size: number;
    generatedAt: string;
  };
}
```

## Error Handling

### Serverless-Specific Error Handling

**Memory Limits:**
- Implement streaming for large documents
- Add memory usage monitoring
- Provide fallback for oversized documents

**Timeout Handling:**
- Set reasonable timeouts for PDF generation
- Implement progress tracking for long operations
- Provide partial results when possible

**Dependency Failures:**
- Graceful fallback when PDF libraries fail
- Clear error messages for missing dependencies
- Health check endpoints to verify library availability

### Error Response Format
```typescript
interface ErrorResponse {
  error: string;
  code: 'MEMORY_LIMIT' | 'TIMEOUT' | 'DEPENDENCY_MISSING' | 'INVALID_INPUT';
  details: string;
  suggestion: string;
  timestamp: string;
}
```

## Testing Strategy

### Unit Tests
- Test PDF generation with various document structures
- Test error handling for invalid inputs
- Test memory and performance constraints

### Integration Tests
- Test complete document generation pipeline
- Test API endpoints with real document data
- Test fallback mechanisms

### Production Testing
- Deploy test endpoints to verify serverless compatibility
- Test with actual Vercel environment constraints
- Monitor performance and memory usage

### Test Cases
1. **Basic PDF Generation:** Simple document with title and content
2. **Complex Document:** Multi-section document with authors and references
3. **Large Document:** Test memory limits and streaming
4. **Invalid Input:** Test error handling for malformed data
5. **Preview Mode:** Test inline PDF display functionality

## Implementation Phases

### Phase 1: Convert Python Scripts to Serverless Functions
- Move existing Python scripts to `/api/` directory as serverless functions
- Keep all your excellent reportlab and docx2pdf code
- Add HTTP request/response handling to existing Python logic
- Create unit tests for Python serverless functions

### Phase 2: Update Node.js API Layer
- Modify `/api/documents.ts` to call Python functions via HTTP
- Remove child_process.spawn() calls
- Implement proper error handling for HTTP-based communication
- Add request validation and authentication

### Phase 3: Configure Vercel for Python
- Set up `requirements.txt` for Python dependencies
- Configure Vercel build settings for Python runtime
- Add health check endpoints for Python functions
- Test Python function deployment

### Phase 4: Production Deployment and Testing
- Deploy updated configuration to Vercel
- Test all PDF generation endpoints in production
- Monitor Python function performance and memory usage
- Validate that your existing Python logic works perfectly in serverless

## Performance Considerations

### Memory Optimization
- Use streaming for large PDF generation
- Implement garbage collection for temporary objects
- Monitor memory usage in serverless environment

### Response Time
- Optimize PDF generation algorithms
- Implement caching for repeated requests
- Use async/await properly for non-blocking operations

### Scalability
- Design for concurrent PDF generation requests
- Implement rate limiting if necessary
- Monitor serverless function cold starts

## Security Considerations

### Input Validation
- Sanitize all document content
- Validate file sizes and complexity
- Prevent code injection in document content

### Output Security
- Ensure PDF metadata doesn't leak sensitive information
- Implement proper CORS headers
- Validate file types and content

## Migration Strategy

### Backward Compatibility
- Keep existing API endpoints during transition
- Implement feature flags for new vs old PDF generation
- Provide clear migration path for existing users

### Rollback Plan
- Maintain Python scripts as fallback option
- Implement feature toggles for easy rollback
- Monitor error rates during migration