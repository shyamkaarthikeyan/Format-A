# Vercel Production Fix - Complete Solution

## Problems Identified

### 1. **Temp Directory Issue** ❌
- **Local**: Uses `./temp/` directory (works)
- **Vercel**: Serverless functions can only write to `/tmp/`
- **Error**: `EACCES: permission denied` or file not found

### 2. **Python File Inclusion** ❌
- Python script not explicitly included in Vercel deployment
- Missing `functions` configuration in `vercel.json`

### 3. **Missing Runtime Configuration** ❌
- No memory/duration limits specified
- Default limits too low for document generation

## Solutions Applied ✅

### 1. Fixed Temp Directory Path
**Changed**: `api/generate.ts` line ~318
```typescript
// Before
const tempDir = path.join(process.cwd(), 'temp');

// After
const tempDir = process.env.NODE_ENV === 'production' 
  ? '/tmp'  // Vercel serverless: use /tmp
  : path.join(process.cwd(), 'temp');  // Local: use ./temp
```

### 2. Updated vercel.json Configuration
**Added**: Function-specific configuration
```json
"functions": {
  "api/generate.ts": {
    "memory": 1024,           // Increased memory for PDF generation
    "maxDuration": 30,        // 30 seconds timeout
    "includeFiles": "api/_lib/**"  // Include Python scripts
  }
}
```

### 3. Enhanced Error Logging
Already added in previous commit:
- Environment details (cwd, dirname, NODE_ENV)
- Script path search logging
- Python process spawn details
- Directory listing if script not found

## Expected Behavior After Deployment

### Working Flow
1. ✅ Client requests PDF preview: `GET /api/generate?type=pdf&preview=true`
2. ✅ Server finds Python script at: `/var/task/api/_lib/ieee_generator.py`
3. ✅ Creates temp file at: `/tmp/ieee_1234567890_abc123.docx`
4. ✅ Spawns Python: `python3 /var/task/api/_lib/ieee_generator.py`
5. ✅ Python generates DOCX to `/tmp/ieee_1234567890_abc123.docx`
6. ✅ Server reads file and returns as response
7. ✅ Client receives DOCX with proper IEEE formatting
8. ✅ Cleanup happens after 30 seconds

### Success Logs to Expect
```
=== IEEE DOCX to PDF Generation ===
Preview mode: true
User: user@example.com
Document title: My Research Paper
🔍 Environment check: { cwd: '/var/task', dirname: '/var/task/api', nodeEnv: 'production', pythonPath: 'python3' }
✓ IEEE generator found at: /var/task/api/_lib/ieee_generator.py
Using temp directory: /tmp
Generating IEEE DOCX with proper formatting: { title: 'My Research Paper', authorsCount: 2, sectionsCount: 5, outputPath: '/tmp/ieee_1234567890_abc123.docx' }
Using IEEE generator script at: /var/task/api/_lib/ieee_generator.py
Spawning Python process: { pythonPath: 'python3', ieeeScriptPath: '/var/task/api/_lib/ieee_generator.py' }
✓ Document data sent to Python script
Python stdout chunk: 0 bytes
IEEE DOCX generator exited with code: 0
Stdout size: 0 bytes
Stderr: (empty)
IEEE DOCX generation completed
✓ IEEE DOCX file created successfully, size: 76850
Returning IEEE DOCX file (PDF conversion not available in Vercel)
✓ DOCX file read successfully, size: 76850
✓ DOCX preview recorded in database
Returning properly formatted IEEE DOCX for preview, size: 76850
✓ Temp DOCX file cleaned up
```

## File Changes Summary

### Modified Files
1. `api/generate.ts`
   - Changed `tempDir` to use `/tmp` in production
   - Added temp directory logging
   - Conditional directory creation (skip in production)

2. `vercel.json`
   - Added `functions` configuration
   - Specified memory: 1024 MB
   - Specified maxDuration: 30 seconds
   - Included `api/_lib/**` files in deployment

### Files Already in Place
- ✅ `api/_lib/ieee_generator.py` - Python script for IEEE DOCX generation
- ✅ `api/requirements.txt` - Python dependencies (python-docx, Pillow)
- ✅ Enhanced error logging from previous commit

## Testing After Deployment

### 1. Check Vercel Function Logs
```bash
vercel logs --follow
```

### 2. Test Preview
```bash
curl -X POST https://your-app.vercel.app/api/generate?type=pdf&preview=true \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Paper",
    "authors": [{"name": "Test Author", "affiliation": "Test University"}],
    "abstract": "Test abstract",
    "sections": [{"title": "Introduction", "content": "Test content"}]
  }'
```

### 3. Expected Response
- Status: 200 OK
- Content-Type: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Content-Disposition: `inline; filename="ieee_[timestamp]_[random].docx"`
- Body: Binary DOCX file data

## Troubleshooting

### If Still Getting 500 Errors

1. **Check Vercel Logs** for:
   - "IEEE generator not found" → Script deployment issue
   - "spawn python3 ENOENT" → Python not available (should have python3 by default)
   - "EACCES: permission denied" → Using wrong temp directory (should be fixed now)

2. **Verify Deployment**:
   ```bash
   # Check if Python file is deployed
   vercel logs | grep "ieee_generator"
   
   # Check function configuration
   vercel inspect [deployment-url]
   ```

3. **Manual Verification**:
   - Go to Vercel Dashboard → Your Project → Functions
   - Click on `api/generate.ts` function
   - Check "Source" tab to verify `_lib/ieee_generator.py` is included

## Rollback Plan

If issues persist, you can:
1. Check out previous commit: `git checkout [commit-hash]`
2. Or temporarily disable PDF preview in client (download DOCX only)

## Next Steps

1. ✅ Commit these changes
2. ✅ Push to trigger Vercel deployment
3. ⏳ Wait for deployment (1-2 minutes)
4. 🧪 Test PDF preview in production
5. 📊 Review Vercel function logs
6. 🎉 Confirm 200 OK responses

---

**Last Updated**: 2025-10-30
**Status**: Ready to deploy
**Expected Result**: PDF/Word preview and download working in Vercel production
