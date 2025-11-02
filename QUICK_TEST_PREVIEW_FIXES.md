# 🧪 Quick Test Guide - Preview Fixes

## ⚡ 5-Minute Test

### Step 1: Start Dev Server
```bash
npm run dev
```
Wait for: "Local: http://localhost:5173"

### Step 2: Create Test Document
1. Navigate to generator page
2. **Title:** "My Research Paper"
3. **Author:** "John Doe"
4. **Abstract:** "This is a test abstract"
5. **Keywords:** "test, research"

### Step 3: Test Section Titles (CASE PRESERVATION)
Add a new section:
- **Section Title:** "introduction" (lowercase)
- Click Preview
- ✅ Should appear as "introduction" (NOT "INTRODUCTION")

### Step 4: Test Subsections (VISIBILITY)
Add subsection to same section:
- **Subsection Title:** "Background"
- **Subsection Content:** "This is background information about the research topic"
- Click Preview
- ✅ Should see both title AND content in PDF

### Step 5: Test Multiple Subsections
Add another subsection:
- **Subsection Title:** "Related Work"
- **Subsection Content:** "Previous studies have shown that..."
- Click Preview
- ✅ Both subsections should be visible
- ✅ No text overlap
- ✅ Proper spacing between them

### Step 6: Test References
Add some references:
- **Reference 1:** "Smith, J., 'Research Paper Title', Journal Name, 2023"
- **Reference 2:** "Jones, K., 'Another Title', Conference Proceedings, 2022"
- Click Preview
- ✅ References should display with [1], [2] numbering

---

## 📋 Detailed Test Checklist

### Section Title Case (CRITICAL FIX #1)
- [ ] Add section with lowercase title "methods"
- [ ] Preview should show "methods" (not "METHODS")
- [ ] Add section with mixed case "Related Work"
- [ ] Preview should show "Related Work" (not "RELATED WORK")
- [ ] Add section with UPPERCASE "CONCLUSION"
- [ ] Preview should show "CONCLUSION" (as typed)

### Subsection Content Visibility (CRITICAL FIX #2)
- [ ] Add section "Introduction"
- [ ] Add subsection "Overview" with text "This is an overview"
- [ ] Preview opens
- [ ] Can see both title "Overview" and text "This is an overview"
- [ ] Add another subsection "Details" with text "Here are details"
- [ ] Both subsections visible, no overlap

### Proper Content Rendering
- [ ] Section titles are bold and larger
- [ ] Subsection titles are bold but slightly smaller
- [ ] Content text is normal weight and readable
- [ ] Content is indented slightly from subsection title
- [ ] Line spacing is proper (not too tight, not too loose)

### Page Breaks
- [ ] Add many sections with lots of content
- [ ] PDF should have multiple pages
- [ ] Page breaks happen at proper boundaries
- [ ] No text gets cut off mid-word

### References Display
- [ ] Add 3+ references
- [ ] References appear at end with "REFERENCES" heading
- [ ] Each reference numbered [1], [2], [3], etc.
- [ ] Reference text is complete and readable

---

## 🎯 Success Criteria

✅ All items checked = **Preview fixes working correctly**

### Critical (Must Work)
- [ ] Section titles keep original case
- [ ] Subsection content is visible
- [ ] No text overlap or hidden content

### Important (Should Work)
- [ ] Proper font sizing hierarchy
- [ ] Good spacing between elements
- [ ] References display correctly

### Nice to Have
- [ ] Multiple page document renders well
- [ ] Zoom in/out works smoothly
- [ ] No console errors in browser

---

## 🔍 Troubleshooting

### If subsections still not visible:
1. Check browser console (F12)
2. Look for any errors in red
3. Clear browser cache: Ctrl+Shift+Delete
4. Try hard refresh: Ctrl+Shift+R
5. Restart dev server: npm run dev

### If section titles still uppercase:
1. Clear browser cache
2. Hard refresh page
3. Close browser console if it was open
4. Try in incognito/private window

### If references show incorrectly:
1. Check reference text in input form
2. Make sure references are properly entered
3. Try refreshing preview with button

---

## 📱 Browser Testing

Test in multiple browsers for compatibility:
- [ ] Chrome/Edge (main)
- [ ] Firefox (important)
- [ ] Safari (if available)

---

## 🎊 After Testing

When all tests pass:
1. Note any issues or edge cases
2. Create bug report if needed
3. Proceed with deployment

---

**Test Date:** November 2, 2025  
**Expected Result:** All tests pass ✅  
**Time Required:** ~5-10 minutes
