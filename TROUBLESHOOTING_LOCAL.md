# Quick Troubleshooting Guide

## Issue: Still Getting 404 Errors

### Step 1: Check Dev Server is Running
```powershell
# Test if backend is responding
Invoke-WebRequest -Uri "http://localhost:5000/health" -Method Get
# Expected: Status 200 OK with JSON response
```

### Step 2: Clear Browser Cache
```
Ctrl+Shift+Delete (Windows/Linux)
Cmd+Shift+Delete (Mac)
```
- Select "All time"
- Check "Cached images and files"
- Click "Clear data"

### Step 3: Hard Refresh Frontend
```
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)
```
This will reload the entire page without cache

### Step 4: Check Vite Config
Verify `vite.config.ts` has proxy section:
```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true,
    }
  }
}
```

If missing, add it and restart dev server.

---

## Issue: PDF Not Showing Justified Text

### Step 1: Verify JavaScript is Updated
- Check browser console (F12)
- Look for messages like: "✓ DOCX generated successfully using Node.js backend"
- If you see old messages, do a hard refresh (Ctrl+Shift+R)

### Step 2: Check PDF Generation Method
- If using Python backend, justification might not be applied
- Try generating DOCX instead - should have justified text
- DOCX export to PDF preserves formatting better

### Step 3: View PDF in Different Reader
- Try: Adobe Reader, Chrome's built-in viewer, or Firefox
- Some PDF readers don't show justification well

---

## Issue: Document Generation Takes Too Long

### Cause: Python backend timeout

### Solution:
```typescript
// The API will automatically try Node.js backend first
// Node.js generation is usually 3-5x faster
// If it times out, check:
```

1. Is Python installed? (`python --version`)
2. Are dependencies installed? (`pip list | grep docx`)
3. Try restarting dev server

---

## Issue: Network Errors / Connection Refused

### Check 1: Backend Running?
```powershell
netstat -ano | findstr :5000
# Should show Node process listening on 5000
```

### Check 2: Restart Everything
```powershell
# Stop dev server (Ctrl+C in terminal)
# Wait 3 seconds
# Run: npm run dev
```

### Check 3: Check Ports
```powershell
# Frontend should be on 5173
# Backend should be on 5000
netstat -ano | findstr :5173
netstat -ano | findstr :5000
```

---

## Issue: Figures Not Uploading

### Step 1: Check Console Errors
- F12 → Console tab
- Look for error messages when clicking "Add Figure"

### Step 2: Verify Endpoint Exists
```bash
# Test the endpoint
curl -X POST http://localhost:5000/api/documents/test-123/figures \
  -H "Content-Type: application/json" \
  -d '{"caption":"Test","size":"medium"}'

# Expected: 200 OK with {"success":true}
```

### Step 3: Check Request Format
- Ensure figure data includes `caption` and `size` fields
- Size options: "very-small", "small", "medium", "large"

---

## Issue: DOCX Download Starts But Never Completes

### Cause: Large file or slow backend

### Solution:
1. Check browser console for errors
2. Open Network tab (F12) and look for failed requests
3. If request completes but download doesn't start:
   - Check firewall settings
   - Try in private/incognito mode

### If Generator Fails:
Check server logs (terminal running `npm run dev`):
```
✓ Python script finished with code: 0
✓ Document generated successfully
```

If you see error codes, note them and check Python output.

---

## Quick Health Check

Run all these commands to verify everything:

```powershell
# 1. Backend health
Write-Host "Checking backend..."
try { 
  $resp = Invoke-WebRequest -Uri "http://localhost:5000/health" -TimeoutSec 5
  Write-Host "✅ Backend: OK ($($resp.StatusCode))"
} catch { 
  Write-Host "❌ Backend: FAILED" 
}

# 2. API test endpoint
Write-Host "Checking API..."
try {
  $resp = Invoke-WebRequest -Uri "http://localhost:5000/api/test" -TimeoutSec 5
  Write-Host "✅ API: OK ($($resp.StatusCode))"
} catch {
  Write-Host "❌ API: FAILED"
}

# 3. Frontend
Write-Host "Checking frontend..."
try {
  $resp = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 5
  Write-Host "✅ Frontend: OK ($($resp.StatusCode))"
} catch {
  Write-Host "❌ Frontend: FAILED"
}

Write-Host ""
Write-Host "✅ All systems ready!" -ForegroundColor Green
```

---

## Still Having Issues?

### Check These Files for Errors:

1. **Browser Console** (F12)
   - Look for red error messages
   - Note the exact error text

2. **Terminal Output** (where you ran `npm run dev`)
   - Look for 404, 500, or error messages
   - Python script errors shown here

3. **Network Tab** (F12 → Network)
   - Click on failed request
   - Check "Response" tab for error details

### Common Error Messages:

| Error | Cause | Fix |
|-------|-------|-----|
| `ENOENT: no such file` | File not found | Restart dev server |
| `CORS error` | Proxy not working | Check vite.config.ts |
| `Python not found` | Python not installed | Install Python 3.9+ |
| `Address already in use` | Port 5000 taken | Kill process: `Get-Process node \| Stop-Process` |
| `Connection refused` | Backend not running | Start with `npm run dev` |

---

## Getting Help

When reporting issues, include:
1. Exact error message (from console or terminal)
2. Browser used (Chrome, Firefox, etc.)
3. Operating system (Windows, Mac, Linux)
4. Steps to reproduce the issue
5. Screenshot of console errors if possible

---

**Last Updated**: November 10, 2025
