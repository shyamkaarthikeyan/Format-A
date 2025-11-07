# Design Document

## Overview

This design provides two architectural approaches for integrating Python backend functionality with the existing format-a.vercel.app deployment:

**Approach A: Single Repository Integration** - Add Python functions to the existing repo
**Approach B: Separate Repository** - Create dedicated Python backend repository

Given that format-a.vercel.app is already successfully deployed with Vite framework preset and Python functions show 404 errors in mixed projects, this design recommends **Approach B (Separate Repository)** for reliable Python deployment.

## Architecture

### Current Architecture (format-a.vercel.app)
```
Frontend (React/Vite) → Vercel Edge → Node.js Serverless Functions → Database
```

### Approach A: Single Repository Integration (Not Recommended - 404 Issues)
```
Frontend (React/Vite) → Vercel Edge → {
  Node.js Functions (auth, core, admin)
  Python Functions (documents, analytics) ❌ 404 Errors
} → Shared Database & Environment
```

**Issues with this approach:**
- Vite framework preset conflicts with Python runtime
- Python functions return 404 in production
- Local development (`vercel dev`) doesn't work with mixed languages
- Framework detection issues in Vercel

### Approach B: Separate Repository (Recommended)
```
Frontend (React/Vite) → {
  format-a.vercel.app/api/* (Node.js)
  python-backend.vercel.app/api/* (Python)
} → Shared Database
```

**Benefits:**
- Independent deployments
- Separate scaling and monitoring
- Language-specific optimization
- Team separation possible

**Drawbacks:**
- CORS configuration needed
- Environment variable duplication
- More complex deployment process

### Function Distribution Strategy

**Node.js Functions (Keep existing):**
- Authentication and session management (`auth.ts`)
- Real-time features and WebSocket handling
- Admin operations (`admin.ts`)
- Core API routing (`core.ts`)
- Testing utilities (`testing.ts`)

**Python Functions (New):**
- Document generation and processing
- PDF/DOCX creation and manipulation
- Data analytics and reporting
- File format conversions
- Image processing tasks

## Components and Interfaces

### 1. Python Serverless Function Structure

Each Python function follows Vercel's serverless function pattern:

```python
from http.server import BaseHTTPRequestHandler
import json
import os

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # Handle POST requests
        pass
    
    def do_GET(self):
        # Handle GET requests
        pass
    
    def do_OPTIONS(self):
        # Handle CORS preflight
        pass
```

### 2. Shared Environment Configuration

Both Node.js and Python functions access the same environment variables:
- `DATABASE_URL` - Neon PostgreSQL connection
- `VITE_GOOGLE_CLIENT_ID` - Authentication configuration
- `JWT_SECRET` - Token validation
- Custom environment variables for Python-specific services

### 3. Database Integration Pattern

Python functions will use `psycopg2` or `asyncpg` to connect to the same Neon PostgreSQL database:

```python
import psycopg2
import os

def get_db_connection():
    return psycopg2.connect(os.environ['DATABASE_URL'])
```

### 4. Response Format Standardization

All functions (Node.js and Python) return consistent JSON responses:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "timestamp": "2024-11-06T..."
}
```

### 5. Authentication Integration

Python functions validate JWT tokens using the same secret as Node.js functions:

```python
import jwt
import os

def validate_token(token):
    return jwt.decode(token, os.environ['JWT_SECRET'], algorithms=['HS256'])
```

## Data Models

### Document Processing Models

```python
from dataclasses import dataclass
from typing import Optional, Dict, Any

@dataclass
class DocumentRequest:
    template_type: str
    data: Dict[str, Any]
    format: str  # 'pdf' or 'docx'
    user_id: str
    
@dataclass
class DocumentResponse:
    document_id: str
    download_url: str
    file_size: int
    created_at: str
```

### Analytics Models

```python
@dataclass
class AnalyticsQuery:
    metric: str
    date_range: tuple
    filters: Dict[str, Any]
    user_id: str

@dataclass
class AnalyticsResult:
    data: List[Dict[str, Any]]
    summary: Dict[str, Any]
    generated_at: str
```

## Error Handling

### 1. Standardized Error Responses

All Python functions return errors in the same format as Node.js functions:

```python
def send_error(self, status_code: int, message: str, details: str = None):
    self.send_response(status_code)
    self.send_header('Content-Type', 'application/json')
    self.send_header('Access-Control-Allow-Origin', '*')
    self.end_headers()
    
    error_response = {
        'success': False,
        'error': {
            'message': message,
            'details': details,
            'code': status_code
        },
        'timestamp': datetime.utcnow().isoformat()
    }
    self.wfile.write(json.dumps(error_response).encode())
```

### 2. Database Connection Error Handling

```python
def safe_db_operation(operation):
    try:
        conn = get_db_connection()
        result = operation(conn)
        conn.close()
        return result
    except psycopg2.Error as e:
        raise DatabaseError(f"Database operation failed: {str(e)}")
    except Exception as e:
        raise ProcessingError(f"Operation failed: {str(e)}")
```

### 3. File Processing Error Handling

```python
def safe_file_processing(file_operation):
    try:
        return file_operation()
    except MemoryError:
        raise ProcessingError("File too large for processing")
    except IOError as e:
        raise ProcessingError(f"File processing error: {str(e)}")
```

## Testing Strategy

### 1. Local Development Testing

Use Vercel CLI for local testing:
```bash
vercel dev
# Test endpoints:
# http://localhost:3000/api/test-python
# http://localhost:3000/api/document-generator
```

### 2. Unit Testing for Python Functions

Create test files alongside Python functions:
```python
# test_document_generator.py
import unittest
from unittest.mock import patch, MagicMock
import sys
import os

# Add the api directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from document_generator import handler

class TestDocumentGenerator(unittest.TestCase):
    def test_pdf_generation(self):
        # Test PDF generation logic
        pass
```

### 3. Integration Testing

Test the interaction between Node.js and Python functions:
```javascript
// Integration test in Jest
describe('Python Integration', () => {
  test('document generation flow', async () => {
    // 1. Authenticate via Node.js auth endpoint
    // 2. Call Python document generator
    // 3. Verify response format consistency
  });
});
```

### 4. Deployment Testing

Automated testing in Vercel preview deployments:
- Test all Python endpoints return 200 status
- Verify environment variables are accessible
- Test database connectivity from Python functions
- Validate CORS headers are properly set

## Separate Repository Setup (Recommended Approach)

### Repository Structure
```
format-a-python-backend/
├── api/
│   ├── document-generator.py
│   ├── analytics.py
│   ├── file-converter.py
│   └── health.py
├── requirements.txt
├── vercel.json
├── .env.example
└── README.md
```

### Vercel Configuration for Python Repository
```json
{
  "functions": {
    "api/*.py": {
      "runtime": "python3.9"
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "https://format-a.vercel.app"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization"
        }
      ]
    }
  ]
}
```

### Frontend Integration Pattern
```javascript
// In format-a.vercel.app frontend
const PYTHON_API_BASE = 'https://format-a-python.vercel.app/api';

const generateDocument = async (data) => {
  const response = await fetch(`${PYTHON_API_BASE}/document-generator`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
};
```

## Implementation Phases

### Phase 1: Create Separate Python Repository
- Create new repository for Python backend
- Set up basic Vercel configuration with Python runtime
- Deploy initial health check endpoint
- Test deployment and verify Python functions work

### Phase 2: CORS and Authentication Setup
- Configure CORS headers for format-a.vercel.app domain
- Implement JWT token validation in Python functions
- Test cross-origin requests from main frontend

### Phase 3: Document Processing Implementation
- Implement PDF generation using ReportLab
- Implement DOCX generation using python-docx
- Add file upload handling for document processing
- Test document generation endpoints

### Phase 4: Database Integration
- Add PostgreSQL connectivity to Python functions
- Share environment variables between repositories
- Test data consistency between Node.js and Python services

### Phase 5: Frontend Integration
- Update frontend to call Python endpoints
- Implement error handling for cross-service calls
- Add loading states for Python function calls
- Test end-to-end document generation flow

This separate repository approach ensures reliable Python deployment while maintaining clean separation of concerns between the Node.js and Python services.