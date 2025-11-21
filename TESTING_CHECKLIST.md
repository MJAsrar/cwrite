# ✅ File Upload & Editor Testing Checklist

## Pre-Test Setup

- [ ] Backend is running (`cd backend && uvicorn app.main:app --reload`)
- [ ] Frontend is running (`npm run dev`)
- [ ] MongoDB is running locally
- [ ] User is logged in
- [ ] At least one project exists

## Test 1: Upload Plain Text File

### Steps:
1. [ ] Navigate to a project
2. [ ] Click "Upload Files" button
3. [ ] Drag or select a `.txt` file
4. [ ] Click "Upload Files" in the upload zone
5. [ ] Wait for upload to complete
6. [ ] File appears in sidebar with ✅ checkmark

### Expected Results:
- [ ] File shows in left sidebar with text file icon (blue)
- [ ] File name is displayed correctly
- [ ] No error messages

## Test 2: View Text File in Editor

### Steps:
1. [ ] Click on the uploaded text file in sidebar
2. [ ] File content loads in center editor

### Expected Results:
- [ ] Text content displays correctly in editor
- [ ] File name shows in toolbar
- [ ] Word count updates
- [ ] Editor is scrollable if content is long
- [ ] Text is editable (try typing)

## Test 3: Edit and Save Text File

### Steps:
1. [ ] With file open, modify the text
2. [ ] Notice orange dot appears (unsaved changes indicator)
3. [ ] Click "Save" button
4. [ ] Wait for "File saved successfully!" alert

### Expected Results:
- [ ] Orange dot disappears after save
- [ ] "Save" button shows "Saved" briefly
- [ ] Alert confirms save success
- [ ] Refreshing page shows updated content

## Test 4: Upload PDF File

### Steps:
1. [ ] Click "Upload Files" button
2. [ ] Select or drag a `.pdf` file
3. [ ] Click "Upload Files"
4. [ ] Wait for processing (PDF conversion)
5. [ ] File appears in sidebar

### Expected Results:
- [ ] PDF file shows with red PDF icon
- [ ] File appears in sidebar after upload
- [ ] No error during upload
- [ ] Processing status shows "completed"

## Test 5: View PDF Content as Text

### Steps:
1. [ ] Click on uploaded PDF file
2. [ ] Wait for content to load

### Expected Results:
- [ ] PDF text is converted and displayed
- [ ] Text is readable and properly formatted
- [ ] All pages' content is included
- [ ] Text is fully editable

## Test 6: Edit PDF-Converted Text

### Steps:
1. [ ] With PDF content open, edit the text
2. [ ] Make changes (add, delete, modify)
3. [ ] Click "Save"

### Expected Results:
- [ ] Changes can be made freely
- [ ] Save completes successfully
- [ ] Reopening file shows edited version
- [ ] PDF content now stored as text

## Test 7: Create New File (No Upload)

### Steps:
1. [ ] Open project with editor showing
2. [ ] If file is selected, deselect or refresh
3. [ ] Editor shows empty state
4. [ ] Start typing in editor
5. [ ] Notice "(New File)" indicator
6. [ ] Click "Save"
7. [ ] File created and appears in sidebar

### Expected Results:
- [ ] Can type immediately without file
- [ ] "Untitled.txt" shows as filename
- [ ] Content is tracked
- [ ] Save creates new file
- [ ] New file appears in sidebar

## Test 8: Download File

### Steps:
1. [ ] Open any file in editor
2. [ ] Click "Download" button
3. [ ] Check downloads folder

### Expected Results:
- [ ] File downloads immediately
- [ ] Downloaded filename matches original
- [ ] Content in downloaded file is correct
- [ ] File opens in text editor

## Test 9: Multiple File Upload

### Steps:
1. [ ] Click "Upload Files"
2. [ ] Select multiple files (2-3 files)
3. [ ] Click "Upload Files"
4. [ ] Wait for all to complete

### Expected Results:
- [ ] All files show progress bars
- [ ] Each file uploads successfully
- [ ] All appear in sidebar
- [ ] Can open each file individually

## Test 10: Large File Handling

### Steps:
1. [ ] Try uploading a large text file (1MB+)
2. [ ] Or large PDF (5MB+)
3. [ ] Watch upload progress

### Expected Results:
- [ ] Progress bar shows upload status
- [ ] Upload completes without timeout
- [ ] File opens in editor
- [ ] Editor handles large content

## Test 11: Invalid File Type

### Steps:
1. [ ] Try uploading `.jpg`, `.mp4`, or other non-text file
2. [ ] Observe validation

### Expected Results:
- [ ] Error message shows
- [ ] File is rejected
- [ ] Upload does not proceed
- [ ] Message explains allowed types

## Test 12: File Size Limit

### Steps:
1. [ ] Try uploading file > 50MB
2. [ ] Observe validation

### Expected Results:
- [ ] Error message about size limit
- [ ] File is rejected
- [ ] Clear error explanation

## Test 13: Word/Character Count

### Steps:
1. [ ] Open any file with text
2. [ ] Check word count in toolbar
3. [ ] Type more text
4. [ ] Watch count update

### Expected Results:
- [ ] Initial count is accurate
- [ ] Count updates in real-time
- [ ] Character count also shown
- [ ] Counts match actual content

## Test 14: Unsaved Changes Indicator

### Steps:
1. [ ] Open file
2. [ ] Make any change
3. [ ] Notice orange pulsing dot
4. [ ] Save file
5. [ ] Dot disappears

### Expected Results:
- [ ] Dot appears immediately on change
- [ ] Dot pulses/animates
- [ ] Dot has tooltip "Unsaved changes"
- [ ] Disappears after successful save

## Test 15: AI Chat Panel (UI Only)

### Steps:
1. [ ] Check right sidebar on desktop (>1280px)
2. [ ] AI chat panel is visible
3. [ ] Try typing a message
4. [ ] Click send

### Expected Results:
- [ ] Panel visible on large screens
- [ ] Hidden on tablets/mobile
- [ ] Can type in input
- [ ] Placeholder response shows
- [ ] "Coming Soon" badge visible

## Test 16: File Tree Sidebar

### Steps:
1. [ ] Open project with multiple files
2. [ ] Check file organization
3. [ ] Try searching files
4. [ ] Try sorting files

### Expected Results:
- [ ] All files listed
- [ ] Search filters correctly
- [ ] Sorting options work
- [ ] Selected file is highlighted

## Test 17: Responsive Design

### Steps:
1. [ ] Resize browser window
2. [ ] Test at mobile width (<1024px)
3. [ ] Test at tablet width (1024-1279px)
4. [ ] Test at desktop (>1280px)

### Expected Results:
- [ ] Mobile: sidebar toggles, no AI chat
- [ ] Tablet: sidebar visible, no AI chat
- [ ] Desktop: all 3 panels visible
- [ ] Layout adapts smoothly

## Test 18: Dark Mode

### Steps:
1. [ ] Toggle dark mode
2. [ ] Check editor appearance
3. [ ] Upload and view files

### Expected Results:
- [ ] Editor background is dark
- [ ] Text is light/readable
- [ ] Toolbar adapts to dark theme
- [ ] All elements properly styled

## Test 19: Error Recovery

### Steps:
1. [ ] Disconnect network
2. [ ] Try saving file
3. [ ] Reconnect network
4. [ ] Try again

### Expected Results:
- [ ] Error message shown
- [ ] No data loss
- [ ] Retry works after reconnect
- [ ] User informed of issue

## Test 20: File Deletion

### Steps:
1. [ ] Right-click file or use menu
2. [ ] Select "Delete"
3. [ ] Confirm deletion
4. [ ] Check editor state

### Expected Results:
- [ ] Confirmation dialog appears
- [ ] File removed from sidebar
- [ ] Editor shows welcome screen
- [ ] File removed from backend

---

## Summary Report Template

```
Date: ___________
Tester: ___________

Total Tests: 20
Passed: _____ / 20
Failed: _____ / 20

Critical Issues Found:
- 
- 

Minor Issues Found:
- 
- 

Notes:
- 
```

---

## Quick Test (5 minutes)

For quick validation, run these essential tests:

1. [ ] Upload a .txt file → Opens in editor
2. [ ] Edit text → Save → Reopen to verify
3. [ ] Upload a .pdf file → Converts to editable text
4. [ ] Create new file → Type → Save as new
5. [ ] Download works for any file

**If all 5 pass, core functionality is working! ✅**

---

## Troubleshooting

### Issue: File won't upload
- Check file type (.txt, .pdf, .md only)
- Check file size (< 50MB)
- Check network connection
- Check backend is running

### Issue: PDF shows garbled text
- Ensure PDF has selectable text (not scanned image)
- Try re-uploading
- Check console for errors

### Issue: Save doesn't work
- Check if logged in
- Check backend connection
- Look for error in browser console
- Verify file ID exists

### Issue: Editor is blank
- Check if file has content
- Try refreshing page
- Check if file loaded successfully
- Verify backend returned content

---

**Happy Testing! 🎉**

Report any issues with:
- Browser console errors
- Network tab screenshots
- Steps to reproduce




