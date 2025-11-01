# API Consolidation Design Document

## Overview

This design consolidates 14+ individual API endpoints into a maximum of 12 serverless functions to comply with Vercel's deployment limits. The solution uses a router-based approach that maintains all existing functionality while requiring zero changes to existing API handler code or client applications.

The current API structure shows that we already have some consolidation in place (admin.ts and auth.ts use path-based routing), which validates this approach. We'll extend this pattern to group related endpoints logically.

## Architecture

### Current State Analysis
- **Individual APIs**: 14+ separate serverless functions
- **Existing Patterns**: admin.ts and auth.ts already use internal routing via query parameters
- **Vercel Configuration**: Already configured with rewrites for path-based routing
- **Client Impact**: Zero - all URLs remain the same due to Vercel rewrites

### Proposed Consolidation Strategy

Group APIs into logical consolidated handlers:

1. **api/core.ts** - Core application APIs (index, health, diagnostics)
2. **api/auth.ts** - Authentication (existing, already consolidated)
3. **api/admin.ts** - Admin functions (existing, already consolidated)  
4. **api/documents.ts** - Document generation and processing
5. **api/downloads.ts** - Download management (existing)
6. **api/testing.ts** - Test and utility endpoints
7. **api/utils.ts** - Utility functions (existing)

This reduces from 14+ to 7 consolidated handlers, well within the 12-function limit.

## Components and Interfaces

### Router Pattern Implementation

Each consolidated handler will use the established pattern:

```typescript
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers (existing pattern)
  
  // Extract path from query parameters
  const { path } = req.query;
  const pathArray = Array.isArray(path) ? path : [path].filter(Boolean);
  const endpoint = pathArray.join('/');
  
  // Route to appropriate handler
  switch (endpoint) {
    case 'endpoint1':
      return handleEndpoint1(req, res);
    case 'endpoint2':
      return handleEndpoint2(req, res);
    default:
      return res.status(404).json({ error: 'Endpoint not found' });
  }
}
```

### Handler Extraction Pattern

Existing API handlers will be extracted into separate functions without modification:

```typescript
// Original: api/health.ts
export default async function handler(req, res) { /* existing code */ }

// Becomes: api/core.ts
async function handleHealth(req, res) { /* exact same code */ }
```

## Data Models

No changes to existing data models. All database interactions, request/response formats, and data structures remain identical.

## Error Handling

### Consolidated Error Handling
- Each consolidated handler maintains the same error responses as individual handlers
- Router-level errors (404 for unknown endpoints) are handled consistently
- Existing error handling within individual handler functions remains unchanged

### Backward Compatibility
- All existing error codes and messages preserved
- Client applications continue to receive identical error responses
- Logging and debugging information maintained at the same level

## Testing Strategy

### Validation Approach
1. **Endpoint Parity Testing**: Verify each consolidated endpoint returns identical responses to original endpoints
2. **Integration Testing**: Test all existing client interactions work without modification
3. **Performance Testing**: Ensure consolidated handlers don't introduce latency
4. **Deployment Testing**: Verify Vercel deployment succeeds with ≤12 functions

### Test Implementation
- Create automated tests that compare responses before/after consolidation
- Use existing test files as baseline for expected behavior
- Implement health checks to verify all endpoints are accessible post-consolidation

## Implementation Phases

### Phase 1: Core Consolidation
- Consolidate simple endpoints (health, diagnostics, index) into api/core.ts
- Test and validate functionality

### Phase 2: Document Processing
- Consolidate generate.ts and related document endpoints into api/documents.ts
- Handle both main generate endpoint and nested generate/* endpoints

### Phase 3: Testing Endpoints
- Consolidate all test-* endpoints into api/testing.ts
- Maintain development/debugging functionality

### Phase 4: Cleanup and Validation
- Remove original individual API files
- Update any internal references if needed
- Comprehensive testing and deployment validation

## Vercel Configuration Updates

The existing vercel.json already supports this pattern with rewrites. Minor updates needed:

```json
{
  "rewrites": [
    {
      "source": "/api/core/(.*)",
      "destination": "/api/core?path=$1"
    },
    {
      "source": "/api/documents/(.*)", 
      "destination": "/api/documents?path=$1"
    },
    {
      "source": "/api/testing/(.*)",
      "destination": "/api/testing?path=$1"
    }
    // Existing rewrites remain unchanged
  ]
}
```

## Benefits

1. **Zero Breaking Changes**: All existing URLs and functionality preserved
2. **Maintainable**: Individual handler logic remains in separate functions
3. **Scalable**: Easy to add new endpoints to existing consolidated handlers
4. **Vercel Compliant**: Reduces function count from 14+ to 7
5. **Performance**: No additional latency introduced by routing logic