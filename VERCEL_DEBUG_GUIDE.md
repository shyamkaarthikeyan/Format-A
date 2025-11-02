# Vercel 500 Error Debug Guide

## Current Status
- **Local**: ✅ Works perfectly
- **Vercel**: ❌ 500 error on PDF/preview generation

## What We've Done

### 1. Enhanced Error Logging (Latest Commit)
Added comprehensive logging to track:
- Environment details (cwd, __dirname, NODE_ENV, pythonPath)
- Script path search attempts
- Directory contents when script not found
- Python spawn errors with full details
- stdin/stdout/stderr communication

### 2. File Structure Fix
- Copied `ieee_generator_fixed.py` → `api/_lib/ieee_generator.py`
- Updated path search order:
  1. `api/_lib/ieee_generator.py` (Vercel production)
  2. `__dirname/_lib/ieee_generator.py` (Vercel alternative)
  3. `server/ieee_generator_fixed.py` (Local development)

## What to Check in Vercel Logs

After the next deployment completes, check the Vercel function logs for:

### 1. Environment Check Output
```
🔍 Environment check: {
  cwd: '/var/task',
  dirname: '/var/task/api',
  nodeEnv: 'production',
  pythonPath: 'python3'
}
```

### 2. Script Path Search
Look for these log lines:
```
✓ IEEE generator found at: /var/task/api/_lib/ieee_generator.py
```
OR
```
✗ IEEE generator not at: [path]
```

### 3. Directory Contents (if script not found)
```
CWD files: ['api', 'node_modules', ...]
API files: ['generate.ts', '_lib', ...]
_lib files: ['ieee_generator.py', 'admin-middleware.ts', ...]
```

### 4. Python Spawn Errors
If Python isn't available:
```
IEEE DOCX generator spawn error: Error: spawn python3 ENOENT
Error details: {
  code: 'ENOENT',
  errno: -2,
  syscall: 'spawn python3',
  path: 'python3'
}
```

## Possible Issues & Solutions

### Issue 1: Python Not Installed in Vercel
**Symptom**: `spawn python3 ENOENT`
**Solution**: Vercel supports Python via `vercel.json` configuration

Add to `vercel.json`:
```json
{
  "functions": {
    "api/generate.ts": {
      "runtime": "nodejs20.x",
      "includeFiles": "api/_lib/**"
    }
  }
}
```

### Issue 2: Script File Not Deployed
**Symptom**: "IEEE generator not found in any location"
**Solution**: Check `vercel.json` includes Python files

Ensure `vercel.json` has:
```json
{
  "functions": {
    "api/**/*.ts": {
      "includeFiles": "api/_lib/**/*.py"
    }
  }
}
```

### Issue 3: Python Dependencies Missing
**Symptom**: `ModuleNotFoundError: No module named 'docx'`
**Solution**: Vercel needs `requirements.txt` in the right location

Ensure `api/requirements.txt` exists with:
```
python-docx==1.1.2
Pillow==10.4.0
lxml==5.3.0
```

### Issue 4: Temp Directory Permissions
**Symptom**: `EACCES: permission denied, mkdir '/var/task/temp'`
**Solution**: Use `/tmp` in production

Update code to use:
```typescript
const tempDir = process.env.NODE_ENV === 'production' 
  ? '/tmp' 
  : path.join(process.cwd(), 'temp');
```

## Next Steps

1. **Wait for deployment** to complete (1-2 minutes)
2. **Trigger the error** by trying to preview a document
3. **Check Vercel logs** in the Functions tab
4. **Look for the log patterns** listed above
5. **Report findings** so we can apply the correct fix

## Quick Actions

Based on what you see in logs, we can:

### If Script Not Found:
```bash
# Verify file is in repo
git ls-files | grep ieee_generator

# Force include in Vercel
echo "api/_lib/*.py" >> .vercelignore  # then remove the line to NOT ignore
```

### If Python Not Available:
```bash
# Check if Python runtime is configured
cat vercel.json | grep -A 5 "runtime"

# May need to switch to a Python-enabled runtime
```

### If Dependencies Missing:
```bash
# Ensure requirements.txt is correct
ls -la api/requirements.txt
cat api/requirements.txt
```

## Expected Success Logs

When working correctly, you should see:
```
🔍 Environment check: { cwd: '/var/task', ... }
✓ IEEE generator found at: /var/task/api/_lib/ieee_generator.py
Spawning Python process: { pythonPath: 'python3', ... }
✓ Document data sent to Python script
Python stdout chunk: 345 bytes
IEEE DOCX generator exited with code: 0
✓ IEEE DOCX file created successfully, size: 76850
✓ DOCX file read successfully, size: 76850
Returning properly formatted IEEE DOCX for preview, size: 76850
```

## Support Resources

- [Vercel Python Support](https://vercel.com/docs/functions/runtimes/python)
- [Vercel Function Logs](https://vercel.com/docs/observability/runtime-logs)
- [Vercel File System](https://vercel.com/docs/functions/runtimes#file-system)
