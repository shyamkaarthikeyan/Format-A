# Quick Reference: Preview Failure Troubleshooting

## 🆘 If Preview Isn't Working on Vercel

### **What's Happening?**
```
❌ User clicks "Preview"
❌ Request sent to /api/generate/pdf-images-preview
❌ Server tries to spawn Python process
❌ Python process fails or times out
❌ File I/O fails (read-only filesystem)
❌ User sees error or no preview
```

---

## 🔧 Quick Diagnostics

### **Check Vercel Logs:**
```
$ vercel logs
# Look for errors like:
# - "spawn ENOENT" (Python not found)
# - "EACCES" (Permission denied)
# - "ENOSPC" (No space left)
# - Timeout errors
```

### **Check Local Environment:**
```bash
# Test preview locally
curl -X POST http://localhost:3000/api/generate/pdf-images-preview \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test",
    "authors": [{"name": "Test Author"}],
    "abstract": "Test abstract",
    "sections": []
  }'
```

---

## 🚀 The Fix (Choose One)

### **Option 1: Client-Side Preview (RECOMMENDED)**

**Status:** ✅ Best solution

**What to do:**
1. Use `jsPDF` to generate PDF (already installed)
2. Use `PDF.js` to display it
3. No server calls needed
4. Works everywhere

**Code location:** `client/src/components/document-preview.tsx`

---

### **Option 2: Disable Broken Feature**

**Status:** ✅ Quick workaround

**What to do:**
1. Find `/api/generate/pdf-images-preview` route in `server/routes.ts`
2. Replace with:
```typescript
app.post('/api/generate/pdf-images-preview', (req, res) => {
  res.status(501).json({
    error: 'Feature unavailable',
    message: 'PDF preview not available in production'
  });
});
```

---

### **Option 3: HTML Preview Instead**

**Status:** ✅ Simple alternative

**What to do:**
Render document as styled HTML instead of PDF
- No PDF generation needed
- Instant display
- Works on Vercel

---

## 📋 Files Involved

| File | Issue | Fix |
|------|-------|-----|
| `server/routes.ts` | Broken route | Disable or fix |
| `server/pdf_to_images.py` | PyMuPDF not available | Delete or disable |
| `server/docx_to_pdf_converter.py` | LibreOffice not available | Delete or disable |
| `server/ieee_generator_fixed.py` | Works locally only | Only use server-side |
| `api/generate/preview-images.py` | Import fails | Delete |
| `client/src/components/document-preview.tsx` | Needs enhancement | Implement client-side |

---

## 🛑 What NOT to Do

❌ Don't try to fix Python environment on Vercel
❌ Don't use file I/O for temp files
❌ Don't expect external processes to work reliably
❌ Don't add more Python dependencies
❌ Don't increase function timeout

---

## ✅ What TO Do

✅ Use client-side JavaScript generation
✅ Eliminate server file I/O
✅ Remove Python process spawning
✅ Use built-in web APIs
✅ Test in preview environment

---

## 🧪 Testing the Fix

### **Local Test:**
```bash
npm run dev
# Navigate to preview section
# Should work immediately
```

### **Preview Deployment:**
```bash
# Push to GitHub
# Vercel auto-deploys
# Check preview environment
# Should work without errors
```

### **Production:**
```bash
# Merge to main
# Should work on production
# Monitor /api/preview endpoint
```

---

## 📞 If Issues Persist

### **Check these:**
1. Are jsPDF and PDF.js installed?
   ```bash
   npm ls pdfjs-dist jspdf
   ```

2. Are CORS headers set?
   ```typescript
   res.setHeader('Access-Control-Allow-Origin', '*');
   ```

3. Is preview route disabled?
   ```grep -n "pdf-images-preview" server/routes.ts
   ```

4. Check browser console for JavaScript errors
   ```
   F12 → Console tab
   Look for red errors
   ```

---

## 💡 Pro Tips

1. **Test Everything Locally First**
   - Works locally? Try preview deployment
   - Works in preview? Deploy to production

2. **Use Fallbacks**
   ```typescript
   try {
     // Try fancy preview
   } catch {
     // Fallback to simple preview
   }
   ```

3. **Monitor Errors**
   - Set up Vercel error monitoring
   - Check logs regularly
   - Address issues early

4. **Document for Users**
   - Explain what works
   - Explain what doesn't
   - Provide workarounds

---

## 📞 Support Decision Tree

```
Does preview work locally?
├─ YES
│  └─ Does preview work in Vercel preview environment?
│     ├─ YES
│     │  └─ Is it working in production?
│     │     ├─ YES → Everything works!
│     │     └─ NO → Check environment variables
│     └─ NO → Problem with Vercel environment
│        └─ Disable server-side Python
│        └─ Use client-side solution
└─ NO
   └─ Problem with local setup
      └─ Check Python/dependencies
      └─ Run local server
```

---

## 🎯 Next Steps

1. **Immediate (Now):**
   - Identify which solution works best for your use case
   - Test the fix locally

2. **Short-term (Today):**
   - Implement the chosen solution
   - Deploy to preview environment
   - Verify it works

3. **Medium-term (This week):**
   - Deploy to production
   - Monitor for errors
   - Gather user feedback

4. **Long-term (Next month):**
   - Consider more robust solutions
   - Add advanced features
   - Improve user experience

