'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Project, ProjectFile, Entity, Relationship } from '@/types';
import {
  BookOpen,
  FileText,
  Users,
  Map,
  Search,
  Settings,
  Moon,
  Sun,
  Plus,
  Upload,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Type,
  Sparkles,
  Loader2,
  MoreVertical
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TextEditor from './TextEditor';
import AIChatPanel from './AIChatPanel';
import SearchModal from './SearchModal';
import EntitiesModal from './EntitiesModal';
import RelationshipsModal from './RelationshipsModal';
import EnhancedFileTree from './EnhancedFileTree';
import { readFileContent } from '@/lib/fileReader';
import { api } from '@/lib/api';

interface VSCodeWorkspaceProps {
  project: Project;
  files: ProjectFile[];
  entities: Entity[];
  relationships: Relationship[];
  onFileUpload: (files: File[]) => Promise<void>;
  onFileDelete: (fileId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

type ThemeKey = 'sepia' | 'dark' | 'light';

const THEME_CLASSES: Record<ThemeKey, { bg: string; text: string; border: string; sidebar: string; rail: string; hover: string; muted: string }> = {
  sepia: {
    bg: 'bg-[#FDF6E3]',
    text: 'text-[#5C4B37]',
    border: 'border-stone-200',
    sidebar: 'bg-stone-50/50',
    rail: 'bg-stone-50/80',
    hover: 'hover:bg-black/5',
    muted: 'text-stone-400'
  },
  dark: {
    bg: 'bg-[#121212]',
    text: 'text-[#E0E0E0]',
    border: 'border-zinc-800',
    sidebar: 'bg-zinc-900/50',
    rail: 'bg-zinc-900/80',
    hover: 'hover:bg-white/5',
    muted: 'text-zinc-500'
  },
  light: {
    bg: 'bg-white',
    text: 'text-gray-900',
    border: 'border-gray-200',
    sidebar: 'bg-gray-50/50',
    rail: 'bg-gray-50/80',
    hover: 'hover:bg-black/5',
    muted: 'text-gray-400'
  }
};

export default function VSCodeWorkspace({
  project,
  files,
  entities,
  relationships,
  onFileUpload,
  onFileDelete,
  onRefresh
}: VSCodeWorkspaceProps) {
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAiOpen, setIsAiOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'files' | 'characters' | 'plot' | 'search'>('files');
  const [theme, setTheme] = useState<ThemeKey>('sepia');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showEntitiesModal, setShowEntitiesModal] = useState(false);
  const [showRelationshipsModal, setShowRelationshipsModal] = useState(false);
  const [chatContext, setChatContext] = useState<any>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [pendingDestination, setPendingDestination] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<string>('');
  const autoSaveEnabled = false;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<any>(null);
  const newFileInputRef = useRef<HTMLInputElement>(null);
  const activeFileIdRef = useRef<string | null>(null);
  const lastOpenFileKey = `cowrite-last-open-file:${project.id}`;
  const router = useRouter();

  const t = THEME_CLASSES[theme];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        setFocusMode(f => !f);
      }
      if (e.key === 'Escape') {
        if (focusMode) setFocusMode(false);
        else {
          setShowSearchModal(false);
          setShowEntitiesModal(false);
          setShowRelationshipsModal(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusMode]);

  useEffect(() => {
    const processingFiles = files.filter(f => f.processing_status === 'processing');
    if (processingFiles.length > 0) {
      const interval = setInterval(async () => { await onRefresh(); }, 5000);
      return () => clearInterval(interval);
    }
  }, [files, onRefresh]);

  const handleLeaveWithSave = async () => {
    const destination = pendingDestination;
    if (!destination) return;

    setIsLeaving(true);
    try {
      const pendingDrafts = editorRef.current?.getPendingDrafts?.() || [];
      for (const draft of pendingDrafts) {
        if (draft.fileId) {
          await api.put(`/api/v1/files/${draft.fileId}`, { text_content: draft.content });
        }
      }

      setShowLeaveModal(false);
      setPendingDestination(null);
      router.push(destination);
    } catch (error: any) {
      setSaveState('error');
      setSaveMessage(error?.message || 'Failed to save one or more files before leaving.');
    } finally {
      setIsLeaving(false);
    }
  };

  const handleLeaveWithoutSave = () => {
    const destination = pendingDestination;
    if (!destination) return;
    setShowLeaveModal(false);
    setPendingDestination(null);
    router.push(destination);
  };


  const handleFileSelect = async (file: ProjectFile) => {
    if (selectedFile?.id === file.id) return;

    const snapshot = editorRef.current?.getEditorState?.();
    if (snapshot?.hasChanges) {
      if (autoSaveEnabled) {
        await editorRef.current?.saveCurrentFile?.();
      } else {
        setNoticeMessage(`Unsaved changes in ${snapshot.filename} were kept locally.`);
      }
    }

    setSelectedFile(file);
    activeFileIdRef.current = file.id;
  };

  // Create a new file with starter content so it passes empty-file validation.
  const handleCreateNewFile = async () => {
    const filename = newFileName.trim();
    if (!filename) return;

    // Ensure it has an extension
    const finalName = filename.includes('.') ? filename : `${filename}.txt`;

    setIsCreatingFile(true);
    try {
      const blob = new Blob(['Start writing here...\n'], { type: 'text/plain' });
      const file = new window.File([blob], finalName, { type: 'text/plain' });
      await onFileUpload([file]);
      await onRefresh();

      // After refresh, find and select the newly created file
      // We need to re-fetch since onRefresh updates parent state
      const updatedFiles = await api.files.list(project.id) as ProjectFile[];
      const newFile = updatedFiles.find(f => f.filename === finalName);
      if (newFile) {
        setSelectedFile(newFile);
        activeFileIdRef.current = newFile.id;
      }

      setNewFileName('');
      setShowNewFileInput(false);
    } catch (err: any) {
      alert(`Failed to create file: ${err.message || 'Unknown error'}`);
    } finally {
      setIsCreatingFile(false);
    }
  };

  // Focus the input when showing new file input
  useEffect(() => {
    if (showNewFileInput && newFileInputRef.current) {
      newFileInputRef.current.focus();
    }
  }, [showNewFileInput]);

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;
    try {
      const fileContents = await Promise.all(
        Array.from(selectedFiles).map(async (file) => {
          try { await readFileContent(file); return file; }
          catch { alert(`Failed to read ${file.name}`); return null; }
        })
      );
      const valid = fileContents.filter(Boolean) as File[];
      if (valid.length > 0) { await onFileUpload(valid); await onRefresh(); }
    } catch { alert('Failed to upload files'); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSave = async (content: string, newFilename?: string) => {
    try {
      if (selectedFile) {
        await api.put(`/api/v1/files/${selectedFile.id}`, { text_content: content });
        alert('File saved successfully!');
        await onRefresh();
      } else if (newFilename) {
        const blob = new Blob([content], { type: 'text/plain' });
        const file = new File([blob], newFilename, { type: 'text/plain' });
        await onFileUpload([file]);
        await onRefresh();
      } else {
        throw new Error('No active file selected to save. Please select a file and try again.');
      }
    } catch (error: any) {
      alert(error?.response?.data?.detail || error?.message || 'Failed to save');
    }
  };

  const handleTabClick = (tab: 'files' | 'characters' | 'plot' | 'search') => {
    if (tab === 'search') {
      setShowSearchModal(true);
      return;
    }
    if (tab === 'characters') {
      setShowEntitiesModal(true);
      return;
    }
    if (tab === 'plot') {
      setShowRelationshipsModal(true);
      return;
    }
    setActiveTab(tab);
    if (!isSidebarOpen) setIsSidebarOpen(true);
  };

  const cycleTheme = () => {
    const order: ThemeKey[] = ['sepia', 'dark', 'light'];
    const idx = order.indexOf(theme);
    setTheme(order[(idx + 1) % order.length]);
  };

  const genreLabel = (project as any)?.settings?.genre || '';

  return (
    <div className={`flex h-screen w-full font-sans transition-colors duration-300 ${t.bg} ${t.text}`}
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* ═══ LEFT NAVIGATION RAIL ═══ */}
      {!focusMode && (
        <aside className={`flex flex-col items-center py-6 space-y-8 border-r ${t.border} ${t.rail} w-16 z-20 flex-shrink-0`}>
          <Link
            href="/dashboard"
            className="p-2 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-colors"
            title="Dashboard"
          >
            <BookOpen size={24} />
          </Link>

          <nav className="flex flex-col space-y-4">
            <NavIcon
              icon={<FileText size={20} />}
              active={activeTab === 'files'}
              onClick={() => handleTabClick('files')}
              title="Documents"
            />
            <NavIcon
              icon={<Users size={20} />}
              active={false}
              onClick={() => handleTabClick('characters')}
              title={`Characters (${entities.length})`}
            />
            <NavIcon
              icon={<Map size={20} />}
              active={false}
              onClick={() => handleTabClick('plot')}
              title={`Plot (${relationships.length})`}
            />
            <NavIcon
              icon={<Search size={20} />}
              active={false}
              onClick={() => handleTabClick('search')}
              title="Search (Ctrl+K)"
            />
          </nav>

          <div className="mt-auto flex flex-col space-y-4 pb-4">
            <NavIcon
              icon={theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              onClick={cycleTheme}
              title={`Theme: ${theme}`}
            />
            <NavIcon
              icon={<Settings size={20} />}
              onClick={() => { }}
              title="Settings"
            />
          </div>
        </aside>
      )}

      {/* ═══ EXPLORER PANEL ═══ */}
      {!focusMode && isSidebarOpen && (
        <div className={`w-64 border-r flex flex-col ${t.border} flex-shrink-0`}>
          <div className="flex items-center justify-between p-4 mb-2">
            <h2 className={`font-semibold text-sm tracking-wider uppercase ${t.muted}`}>
              Documents
            </h2>
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`p-1.5 rounded-lg transition-colors ${t.hover}`}
              title="Upload file"
            >
              <Plus size={16} />
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.pdf,.md,.docx"
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div className="flex-1 overflow-y-auto px-3 custom-scrollbar">
            <EnhancedFileTree
              files={files}
              selectedFileId={selectedFile?.id}
              onFileSelect={(fileId) => {
                const file = files.find(f => f.id === fileId);
                if (file) handleFileSelect(file);
              }}
              onFileDelete={async (fileId) => {
                await onFileDelete(fileId);
                if (selectedFile?.id === fileId) setSelectedFile(null);
                await onRefresh();
              }}
              onFileUpload={onFileUpload}
              theme={theme}
            />
          </div>
        </div>
      )}

      {/* ═══ MAIN EDITOR AREA ═══ */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Editor Toolbar */}
        {!focusMode && (
          <header className={`h-14 flex items-center justify-between px-6 border-b ${t.border}`}>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`p-1.5 rounded-md transition-colors ${t.hover}`}
              >
                <ChevronLeft className={`transition-transform duration-300 ${!isSidebarOpen ? 'rotate-180' : ''}`} size={18} />
              </button>
              <div className="flex flex-col">
                {genreLabel && (
                  <span className={`text-xs font-medium uppercase ${t.muted}`}>
                    {project.name} / {genreLabel}
                  </span>
                )}
                <span className="font-semibold text-sm">
                  {selectedFile?.filename || 'No file selected'}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {files.filter(f => f.processing_status === 'processing').length > 0 && (
                <div className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 text-xs font-bold border border-amber-500/20 flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  PROCESSING
                </div>
              )}
              <div className="px-3 py-1 rounded-full bg-green-500/10 text-green-600 text-xs font-bold border border-green-500/20">
                ONLINE
              </div>
              <button className={`p-2 rounded-md ${t.hover}`} title="Typography">
                <Type size={18} />
              </button>
              <button
                className={`p-2 rounded-md ${t.hover}`}
                onClick={() => setFocusMode(true)}
                title="Focus Mode (Ctrl+\)"
              >
                <Maximize2 size={18} />
              </button>
            </div>
          </header>
        )}

        {/* Editor */}
        <TextEditor
          ref={editorRef}
          file={selectedFile || undefined}
          projectId={project.id}
          onSave={handleFileSave}
          onAddToChat={(context) => {
            setChatContext(context);
            if (!isAiOpen) setIsAiOpen(true);
          }}
          theme={theme}
          focusMode={focusMode}
          onExitFocus={() => setFocusMode(false)}
        />
      </main>

      {/* ═══ THE MUSE — AI SIDEBAR ═══ */}
      {!focusMode && (
        <div className={`h-full transition-all duration-300 ease-in-out border-l flex flex-col ${isAiOpen ? 'w-80' : 'w-0 border-none'
          } ${t.border} ${t.sidebar} overflow-hidden flex-shrink-0`}>
          <AIChatPanel
            projectId={project.id}
            fileId={selectedFile?.id}
            projectName={project.name}
            contextFromEditor={chatContext}
            onContextUsed={() => setChatContext(null)}
            onApplyEdit={async (edit) => {
              if (editorRef.current) await editorRef.current.applyEdit(edit);
            }}
            onClose={() => setIsAiOpen(false)}
            theme={theme}
          />
        </div>
      )}

      {/* Floating AI FAB when sidebar is closed */}
      {!focusMode && !isAiOpen && (
        <button
          onClick={() => setIsAiOpen(true)}
          className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-indigo-600 text-white shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-30"
          title="Open The Muse"
        >
          <Sparkles size={20} />
        </button>
      )}

      {/* Focus Mode exit button */}
      {focusMode && (
        <button
          onClick={() => setFocusMode(false)}
          className="fixed top-4 right-4 z-50 p-2.5 rounded-full bg-white/80 dark:bg-zinc-800/80 shadow-lg backdrop-blur-sm transition-all hover:scale-105"
          style={{ color: theme === 'dark' ? '#E0E0E0' : '#5C4B37' }}
          title="Exit Focus Mode (Esc)"
        >
          <Maximize2 size={16} />
        </button>
      )}

      {/* ═══ MODALS ═══ */}
      <SearchModal
        projectId={project.id}
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onResultClick={(fileId) => {
          const file = files.find(f => f.id === fileId);
          if (file) handleFileSelect(file);
        }}
        theme={theme}
      />
      <EntitiesModal
        entities={entities}
        isOpen={showEntitiesModal}
        onClose={() => setShowEntitiesModal(false)}
        theme={theme}
        projectId={project.id}
        files={files}
        onRefresh={onRefresh}
      />
      <RelationshipsModal
        relationships={relationships}
        isOpen={showRelationshipsModal}
        onClose={() => setShowRelationshipsModal(false)}
        theme={theme}
        projectId={project.id}
        onRefresh={onRefresh}
      />

      {showLeaveModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-5 shadow-2xl">
            <h3 className="text-base font-semibold text-stone-900">Save changes before leaving?</h3>
            <p className="mt-2 text-sm text-stone-600">
              You have unsaved file changes in this project. Save them before leaving this page.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setShowLeaveModal(false);
                  setPendingDestination(null);
                }}
                className="px-3 py-1.5 rounded-md border border-stone-300 text-stone-700 text-sm hover:bg-stone-50"
                disabled={isLeaving}
              >
                Stay
              </button>
              <button
                onClick={handleLeaveWithoutSave}
                className="px-3 py-1.5 rounded-md border border-amber-300 text-amber-700 text-sm hover:bg-amber-50"
                disabled={isLeaving}
              >
                Leave without saving
              </button>
              <button
                onClick={handleLeaveWithSave}
                className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-60"
                disabled={isLeaving}
              >
                {isLeaving ? 'Saving...' : 'Save and leave'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Nav Icon ─── */
function NavIcon({ icon, active, onClick, title }: {
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-2.5 rounded-xl transition-all duration-200 ${active
        ? 'bg-indigo-600/10 text-indigo-600 ring-1 ring-indigo-600/20'
        : 'opacity-40 hover:opacity-100 hover:bg-black/5'
        }`}
    >
      {icon}
    </button>
  );
}
