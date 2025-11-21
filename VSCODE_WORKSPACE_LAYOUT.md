# VS Code-Style Workspace Layout

## Overview

The project workspace has been redesigned with a **VS Code-inspired 3-panel layout**:

```
┌─────────────────────────────────────────────────────────────────┐
│                     Project Header & Breadcrumbs                │
├──────────┬──────────────────────────────────────┬───────────────┤
│          │                                      │               │
│  FILES   │         TEXT EDITOR                  │  AI ASSISTANT │
│          │                                      │               │
│  Tree    │   ┌──────────────────────────┐      │   Chat UI     │
│  View    │   │ Toolbar with formatting  │      │               │
│          │   ├──────────────────────────┤      │   Powered by  │
│  ├─ Ch1  │   │                          │      │   CoWrite AI  │
│  ├─ Ch2  │   │  Rich text editing area  │      │               │
│  └─ Ch3  │   │                          │      │   (Coming     │
│          │   │  Full-screen writing     │      │    Soon)      │
│  ENTITIES│   │                          │      │               │
│          │   │  Word count, auto-save   │      │               │
│  Browse  │   │                          │      │               │
│          │   └──────────────────────────┘      │               │
│          │                                      │               │
│  RELATIONS│  Status bar with char count        │               │
│          │                                      │               │
│  Graph   │                                      │               │
│          │                                      │               │
└──────────┴──────────────────────────────────────┴───────────────┘
```

## New Components Created

### 1. **TextEditor** (`src/components/workspace/TextEditor.tsx`)

A full-featured text editor for the center panel:

**Features:**
- ✅ Large writing area with serif font
- ✅ Formatting toolbar (placeholder buttons for future features)
- ✅ Auto-save detection with visual indicator
- ✅ Word & character count
- ✅ Download functionality
- ✅ Clean, distraction-free interface
- ✅ Status bar with file info
- 🔜 Rich text formatting (Bold, Italic, Lists, etc.)
- 🔜 Undo/Redo support
- 🔜 Keyboard shortcuts

**Usage:**
```tsx
<TextEditor 
  file={selectedFile}
  onSave={handleFileSave}
/>
```

### 2. **AIChatPanel** (`src/components/workspace/AIChatPanel.tsx`)

AI assistant chat interface for the right sidebar:

**Features:**
- ✅ Clean chat UI with message bubbles
- ✅ User & AI message distinction
- ✅ Typing indicator
- ✅ Copy message functionality
- ✅ Timestamp display
- ✅ Suggested prompts
- ✅ Clear chat option
- 🔜 Real AI integration
- 🔜 Context-aware suggestions
- 🔜 Character development assistance
- 🔜 Plot suggestions

**Usage:**
```tsx
<AIChatPanel projectName={project.name} />
```

## Updated Components

### 3. **WorkspaceLayout** (`src/components/workspace/WorkspaceLayout.tsx`)

Enhanced to support the 3-panel layout:

**Changes:**
- ✅ Added `rightSidebar` prop for AI chat
- ✅ Reorganized to have left-center-right structure
- ✅ Right sidebar fixed at 384px (24rem) width
- ✅ Center editor takes remaining space
- ✅ Right sidebar hidden on screens < 1280px (xl breakpoint)
- ✅ Maintained existing header and navigation

### 4. **ProjectWorkspace** (`src/components/workspace/ProjectWorkspace.tsx`)

Updated to use new editor components:

**Changes:**
- ✅ Uses `TextEditor` when a file is selected
- ✅ Passes `AIChatPanel` to layout as `rightSidebar`
- ✅ Falls back to `MainContentArea` for welcome/entity/relationship views
- ✅ Added file save handler (placeholder)

### 5. **Button** (`src/components/ui/Button.tsx`)

Added new size variant:

**Changes:**
- ✅ Added `icon-sm` size variant (32px/28px)
- ✅ Used in editor toolbar and chat UI

## Layout Breakpoints

| Screen Size | Left Sidebar | Center Editor | Right Sidebar |
|-------------|--------------|---------------|---------------|
| Mobile (<1024px) | Toggle | Full width | Hidden |
| Tablet (1024-1279px) | 320px | Remaining | Hidden |
| Desktop (≥1280px) | 320px | Remaining | 384px |

## File Structure

```
src/components/workspace/
├── ProjectWorkspace.tsx       # Main workspace orchestrator
├── WorkspaceLayout.tsx        # 3-panel layout structure
├── TextEditor.tsx             # ✨ NEW - Center editor
├── AIChatPanel.tsx            # ✨ NEW - Right AI chat
├── FileTreeSidebar.tsx        # Left - file browser
├── EntityBrowser.tsx          # Left - entity view
├── RelationshipVisualization.tsx # Left - relationships
└── MainContentArea.tsx        # Fallback for non-file views
```

## User Experience

### Workflow

1. **Open Project** → Shows welcome screen in center
2. **Select File** → Opens in full-screen editor
3. **Left Sidebar** → Browse files, entities, relationships
4. **Right Sidebar** → Chat with AI for writing assistance
5. **Auto-save** → Changes tracked with visual indicator
6. **Download** → Export your work anytime

### Keyboard Shortcuts (Planned)

- `Ctrl/Cmd + S` - Save file
- `Ctrl/Cmd + B` - Bold
- `Ctrl/Cmd + I` - Italic
- `Ctrl/Cmd + Z` - Undo
- `Ctrl/Cmd + Shift + Z` - Redo
- `Ctrl/Cmd + /` - Toggle AI chat focus

## Responsive Design

- **Desktop (≥1280px)**: Full 3-panel experience
- **Tablet (1024-1279px)**: Left sidebar + Editor (AI chat hidden, accessible via modal later)
- **Mobile (<1024px)**: Single panel with toggleable left sidebar

## Next Steps

### Editor Enhancements
- [ ] Implement rich text formatting
- [ ] Add Markdown support
- [ ] Syntax highlighting for code blocks
- [ ] Auto-save implementation
- [ ] Version history
- [ ] Collaborative editing

### AI Chat Features
- [ ] Connect to backend AI service
- [ ] Context-aware suggestions based on current text
- [ ] Character development assistant
- [ ] Plot structure recommendations
- [ ] Grammar and style checking
- [ ] Writing prompts and exercises

### File Management
- [ ] Drag-and-drop file reordering
- [ ] File search within project
- [ ] Recent files quick access
- [ ] File versioning
- [ ] Export to various formats (PDF, DOCX, etc.)

## Technical Details

### State Management

```typescript
interface ViewState {
  sidebar: 'files' | 'entities' | 'relationships';
  main: 'welcome' | 'file' | 'entity' | 'relationships';
  selectedFileId?: string;
  selectedEntityId?: string;
}
```

### File Save Flow

```
User types → setHasChanges(true) → Visual indicator
User clicks Save → handleSave() → API call (TODO)
Success → setHasChanges(false) → Indicator cleared
```

### Component Communication

```
ProjectWorkspace (orchestrator)
    ↓
    ├─→ WorkspaceLayout (layout)
    │       ├─→ FileTreeSidebar (left)
    │       ├─→ TextEditor (center)
    │       └─→ AIChatPanel (right)
    └─→ Manages state & data flow
```

## Styling

- Uses Tailwind CSS with custom theme variables
- Serif font for editor (Georgia fallback)
- Clean, minimal UI
- Smooth transitions and animations
- Dark mode support throughout

## Accessibility

- Semantic HTML structure
- ARIA labels on buttons
- Keyboard navigation support (coming)
- Screen reader friendly
- Focus indicators
- Color contrast compliance

---

**Status**: ✅ Layout Complete | 🔜 AI Integration Pending | 🎨 Styling Polished

This creates a professional, distraction-free writing environment similar to VS Code but optimized for creative writing!




