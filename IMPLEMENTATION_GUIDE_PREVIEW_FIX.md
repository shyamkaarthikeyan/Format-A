# Implementation Guide: Fixing Preview in Vercel

## 📌 Overview

This guide provides specific code changes needed to fix preview functionality on Vercel.

---

## 🔴 Problem Summary

**Current Flow (BROKEN on Vercel):**
```
User Request
  ↓
/api/generate/pdf-images-preview
  ↓
Spawn Python → FAILS
  ↓
Generate DOCX → FAILS
  ↓
Convert to PDF → FAILS
  ↓
Convert to Images → FAILS
  ↓
Return Error
```

**New Flow (WORKS Everywhere):**
```
User Request
  ↓
Generate PDF (Client-side, jsPDF)
  ↓
Display (PDF.js)
  ↓
Show Preview
```

---

## ✅ Solution: Use Client-Side PDF Generation

### **Step 1: Verify Dependencies are Installed**

**Status:** ✅ Already installed

**Check:**
```bash
npm ls pdfjs-dist jspdf
```

**Expected Output:**
```
├── jspdf@2.x.x
└── pdfjs-dist@3.x.x
```

**If missing, install:**
```bash
npm install pdfjs-dist jspdf
```

---

### **Step 2: Update `document-preview.tsx`**

**Location:** `client/src/components/document-preview.tsx`

**Current Issues:**
- ❌ Calls `/api/generate/pdf-images-preview`
- ❌ Relies on server-side Python
- ❌ Fails on Vercel

**Fix: Add Client-Side PDF Generation**

**Search for:**
```typescript
// Around line 1428 in server/routes.ts
app.post('/api/generate/pdf-images-preview', async (req, res) => {
```

**Change in Frontend:**
Instead of calling server endpoint, generate locally:

```typescript
// Add this import at the top of document-preview.tsx
import jsPDF from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';

// Set PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Add this new function
const generateClientSidePDF = (doc: Document): Blob => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: 'letter',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 0.75;
  const contentWidth = pageWidth - 2 * margin;
  
  let yPosition = margin;
  const lineHeight = 0.2;
  const fontSize = 9.5;

  // Set font for title
  pdf.setFontSize(24);
  pdf.setFont(undefined, 'bold');
  const titleLines = pdf.splitTextToSize(doc.title || 'Untitled', contentWidth);
  pdf.text(titleLines, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += titleLines.length * lineHeight + 0.3;

  // Authors
  pdf.setFontSize(10);
  pdf.setFont(undefined, 'normal');
  if (doc.authors && doc.authors.length > 0) {
    const authorNames = doc.authors.map(a => a.name).join(', ');
    pdf.text(authorNames, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += lineHeight * 2;
  }

  // Abstract
  if (doc.abstract) {
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'italic');
    const abstractLabel = 'Abstract—';
    pdf.text(abstractLabel, margin, yPosition);
    
    const abstractText = abstractLabel + doc.abstract;
    const abstractLines = pdf.splitTextToSize(abstractText, contentWidth);
    pdf.text(abstractLines, margin, yPosition);
    yPosition += abstractLines.length * lineHeight + 0.3;
  }

  // Keywords
  if (doc.keywords) {
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'italic');
    const keywordsLabel = 'Keywords—';
    const keywordsText = keywordsLabel + doc.keywords;
    const keywordsLines = pdf.splitTextToSize(keywordsText, contentWidth);
    pdf.text(keywordsLines, margin, yPosition);
    yPosition += keywordsLines.length * lineHeight + 0.3;
  }

  // Sections
  if (doc.sections) {
    pdf.setFontSize(fontSize);
    pdf.setFont(undefined, 'normal');
    
    doc.sections.forEach(section => {
      // Check if we need a new page
      if (yPosition > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }

      // Section title
      pdf.setFont(undefined, 'bold');
      pdf.text(section.title || 'Section', margin, yPosition);
      yPosition += lineHeight * 1.5;

      // Section content
      pdf.setFont(undefined, 'normal');
      if (section.content) {
        const contentLines = pdf.splitTextToSize(section.content, contentWidth);
        pdf.text(contentLines, margin, yPosition);
        yPosition += contentLines.length * lineHeight + 0.2;
      }

      // Subsections
      if (section.subsections) {
        section.subsections.forEach(subsection => {
          if (yPosition > pageHeight - margin) {
            pdf.addPage();
            yPosition = margin;
          }

          pdf.setFont(undefined, 'bold');
          pdf.setFontSize(fontSize - 0.5);
          pdf.text(subsection.title || 'Subsection', margin + 0.2, yPosition);
          yPosition += lineHeight * 1.2;

          pdf.setFont(undefined, 'normal');
          pdf.setFontSize(fontSize);
          if (subsection.content) {
            const subContentLines = pdf.splitTextToSize(
              subsection.content, 
              contentWidth - 0.2
            );
            pdf.text(subContentLines, margin + 0.2, yPosition);
            yPosition += subContentLines.length * lineHeight + 0.2;
          }
        });
      }
    });
  }

  // References
  if (doc.references && doc.references.length > 0) {
    if (yPosition > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
    }

    pdf.setFontSize(fontSize);
    pdf.setFont(undefined, 'bold');
    pdf.text('References', margin, yPosition);
    yPosition += lineHeight * 1.5;

    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(fontSize - 0.5);

    doc.references.forEach((ref, index) => {
      if (yPosition > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }

      const refText = `[${index + 1}] ${ref.authors || ''} "${ref.title || ''}" ${ref.publication || ''} ${ref.year || ''}`;
      const refLines = pdf.splitTextToSize(refText, contentWidth - 0.3);
      pdf.text(refLines, margin + 0.2, yPosition);
      yPosition += refLines.length * lineHeight + 0.1;
    });
  }

  // Return as blob
  const pdfBlob = pdf.output('blob');
  return pdfBlob;
};

// Update the preview generation function
const handleGeneratePreview = async () => {
  try {
    setIsGeneratingPreview(true);
    setPreviewError(null);

    // Validate
    if (!document.title) {
      setPreviewError('Please enter a document title');
      return;
    }

    if (!document.authors || document.authors.length === 0) {
      setPreviewError('Please add at least one author');
      return;
    }

    // Generate PDF client-side
    const pdfBlob = generateClientSidePDF(document);
    const url = URL.createObjectURL(pdfBlob);
    
    setPdfUrl(url);
    setPreviewMode('pdf');
    
    toast({
      title: 'Preview Generated',
      description: 'PDF preview created successfully',
    });
  } catch (error) {
    setPreviewError(
      error instanceof Error ? error.message : 'Failed to generate preview'
    );
  } finally {
    setIsGeneratingPreview(false);
  }
};
```

---

### **Step 3: Disable Server-Side Preview Route**

**Location:** `server/routes.ts`

**Find this route (around line 1428):**
```typescript
app.post('/api/generate/pdf-images-preview', async (req, res) => {
  try {
    console.log('=== PDF Images Preview Generation ===');
    // ... rest of broken code
  }
}
```

**Replace with:**
```typescript
app.post('/api/generate/pdf-images-preview', (req, res) => {
  res.status(501).json({
    error: 'Feature not available',
    message: 'PDF preview images are generated client-side in production',
    suggestion: 'This endpoint is disabled. Use client-side PDF generation instead.'
  });
});
```

---

### **Step 4: Add Error Handling**

**Location:** `client/src/components/document-preview.tsx`

**Add fallback for PDF generation:**
```typescript
const handlePreviewError = () => {
  setPreviewError(
    'Preview generation failed. You can still download the document to see the final result.'
  );
  
  // Show download options instead
  setPreviewMode('pdf');
};
```

---

### **Step 5: Update vercel.json**

**Location:** `vercel.json`

**No changes needed** - but make sure headers are correct:

**Current (should be fine):**
```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        }
      ]
    }
  ]
}
```

---

## 🗑️ Files to Delete/Disable

### **Option A: Complete Cleanup**

Delete these files:
```bash
# Optional - can delete since not used in main flow
rm server/pdf_to_images.py
rm server/docx_to_pdf_converter.py  # If only for preview
rm api/generate/preview-images.py
```

### **Option B: Keep for Reference**

Keep files but disable routes:
- Keep `pdf_to_images.py` - reference only
- Keep `docx_to_pdf_converter.py` - might use later
- Keep `api/generate/preview-images.py` - example

---

## 📋 Testing Checklist

### **Local Testing:**
- [ ] `npm run dev` starts without errors
- [ ] Browser console has no JavaScript errors
- [ ] Enter document title
- [ ] Add at least one author
- [ ] Preview generates immediately
- [ ] PDF displays in viewer
- [ ] Zoom controls work
- [ ] Page navigation works (if multi-page)
- [ ] Download Word works
- [ ] Download PDF works

### **Vercel Preview Deployment:**
- [ ] Push changes to GitHub
- [ ] Vercel deploys preview automatically
- [ ] Visit preview URL
- [ ] Test preview generation
- [ ] Check network tab - no Python calls
- [ ] Check browser console - no errors
- [ ] Test all preview features

### **Production Deployment:**
- [ ] Merge to main
- [ ] Vercel deploys to production
- [ ] Test all features
- [ ] Monitor error logs
- [ ] Gather user feedback

---

## 🔍 Debugging Commands

### **Check if jsPDF is loaded:**
```javascript
// In browser console
console.log(jsPDF);
```

### **Check if PDF.js is loaded:**
```javascript
// In browser console
console.log(pdfjsLib);
```

### **Test PDF generation:**
```javascript
// In browser console
const pdf = new jsPDF();
pdf.text('Hello World', 10, 10);
const blob = pdf.output('blob');
console.log(blob.size); // Should be > 0
```

### **Check Vercel logs:**
```bash
vercel logs --follow
```

---

## 🚨 If Issues Occur

### **Issue: "jsPDF is not defined"**
**Solution:**
- Check if jsPDF is installed: `npm ls jspdf`
- Check import: `import jsPDF from 'jspdf'`
- Restart dev server: `npm run dev`

### **Issue: "PDF.js worker failed to load"**
**Solution:**
- Worker URL may be wrong
- Use local worker instead:
```typescript
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;
// Copy pdf.worker.min.js to public folder from node_modules
```

### **Issue: "Preview button does nothing"**
**Solution:**
- Check browser console for errors
- Check network tab for failed requests
- Verify document has title and author
- Check if `generateClientSidePDF()` is being called

---

## 📊 Before & After

### **Before (Broken):**
```
User → Click Preview
  → POST /api/generate/pdf-images-preview
  → Server spawn Python
  → ERROR: Python not available
  → User sees error
```

### **After (Fixed):**
```
User → Click Preview
  → Generate PDF (jsPDF, client-side)
  → Display PDF (PDF.js)
  → User sees preview instantly
  → No server calls needed
  → Works on Vercel ✅
```

---

## 🎯 Summary of Changes

| File | Change | Type |
|------|--------|------|
| `client/src/components/document-preview.tsx` | Add client-side PDF generation | **Add** |
| `server/routes.ts` | Disable `/pdf-images-preview` route | **Modify** |
| `vercel.json` | No changes needed | None |
| `server/pdf_to_images.py` | Optional delete | **Delete** |
| `server/docx_to_pdf_converter.py` | Optional delete | **Delete** |

---

## 📞 Verification Steps

**After making changes:**

1. Local test: `npm run dev`
2. Preview test: Push to GitHub, check Vercel preview URL
3. Production: Merge and verify on production domain
4. Monitor: Check Vercel logs for any errors

---

## ✅ Done!

Once these changes are made and tested:
- ✅ Preview works everywhere
- ✅ No Python dependencies needed
- ✅ Works on Vercel
- ✅ Instant generation
- ✅ Professional quality
- ✅ No server resources used

