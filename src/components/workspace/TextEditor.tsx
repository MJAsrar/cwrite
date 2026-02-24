'use client';

import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { ProjectFile } from '@/types';
import { FileText, Sparkles, Loader2, Feather } from 'lucide-react';
import { useCopilot } from '@/hooks/useCopilot';
import dynamic from 'next/dynamic';
import type { editor } from 'monaco-editor';
import '@/styles/copilot.css';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center">
      <div className="flex items-center gap-2 opacity-50">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading editor…</span>
      </div>
    </div>
  )
});

interface TextEditorProps {
  file?: ProjectFile;
  projectId: string;
  onSave?: (content: string, filename?: string) => Promise<void>;
  onNewFile?: () => void;
  onAddToChat?: (context: {
    text: string;
    fileName: string;
    fileId: string;
    startLine: number;
    endLine: number;
    startColumn: number;
    endColumn: number;
  }) => void;
  theme?: 'sepia' | 'dark' | 'light';
  focusMode?: boolean;
  onExitFocus?: () => void;
}

const MONACO_THEMES = {
  sepia: {
    base: 'vs' as const,
    colors: {
      'editor.background': '#FDF6E3',
      'editor.foreground': '#5C4B37',
      'editor.lineHighlightBackground': '#F5EDDA',
      'editor.selectionBackground': '#EBDDB2',
      'editorLineNumber.foreground': '#C5B899',
      'editorLineNumber.activeForeground': '#8B7355',
      'editorCursor.foreground': '#5C4B37',
      'scrollbar.shadow': '#00000000',
      'scrollbarSlider.background': '#C5B89944',
      'scrollbarSlider.hoverBackground': '#B8A88877',
      'scrollbarSlider.activeBackground': '#A89878AA'
    }
  },
  dark: {
    base: 'vs-dark' as const,
    colors: {
      'editor.background': '#121212',
      'editor.foreground': '#E0E0E0',
      'editor.lineHighlightBackground': '#1A1A1A',
      'editor.selectionBackground': '#333333',
      'editorLineNumber.foreground': '#555555',
      'editorLineNumber.activeForeground': '#888888',
      'editorCursor.foreground': '#E0E0E0',
      'scrollbar.shadow': '#00000000',
      'scrollbarSlider.background': '#55555544',
      'scrollbarSlider.hoverBackground': '#66666677',
      'scrollbarSlider.activeBackground': '#777777AA'
    }
  },
  light: {
    base: 'vs' as const,
    colors: {
      'editor.background': '#FFFFFF',
      'editor.foreground': '#1A1A1A',
      'editor.lineHighlightBackground': '#F5F5F5',
      'editor.selectionBackground': '#D4E4FC',
      'editorLineNumber.foreground': '#C0C0C0',
      'editorLineNumber.activeForeground': '#666666',
      'editorCursor.foreground': '#1A1A1A',
      'scrollbar.shadow': '#00000000',
      'scrollbarSlider.background': '#C0C0C044',
      'scrollbarSlider.hoverBackground': '#AAAAAA77',
      'scrollbarSlider.activeBackground': '#999999AA'
    }
  }
};

const TextEditor = forwardRef(function TextEditor(
  { file, projectId, onSave, onNewFile, onAddToChat, theme = 'sepia', focusMode = false, onExitFocus }: TextEditorProps,
  ref
) {
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [filename, setFilename] = useState('Untitled.txt');
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [suggestionText, setSuggestionText] = useState('');
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);
  const suggestionTextRef = useRef<string>('');
  const suggestionPositionRef = useRef<any>(null);

  const {
    getSuggestion, acceptSuggestion, rejectSuggestion, clearSuggestion,
    isLoading: isCopilotLoading
  } = useCopilot({
    projectId,
    fileId: file?.id,
    onSuggestionAccepted: () => { },
    onSuggestionRejected: () => { }
  });

  useEffect(() => {
    if (file) {
      setContent(file.text_content || '');
      setFilename(file.filename);
      setHasChanges(false);
    } else {
      setContent('');
      setFilename('Untitled.txt');
      setHasChanges(false);
    }
  }, [file]);

  // Apply theme changes to Monaco
  useEffect(() => {
    if (monacoRef.current && editorRef.current) {
      const themeConfig = MONACO_THEMES[theme];
      const themeName = `cowrite-${theme}`;
      monacoRef.current.editor.defineTheme(themeName, {
        base: themeConfig.base,
        inherit: true,
        rules: [],
        colors: themeConfig.colors
      });
      monacoRef.current.editor.setTheme(themeName);
    }
  }, [theme]);

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    monaco.languages.typescript?.javascriptDefaults?.setDiagnosticsOptions({ noSemanticValidation: true, noSyntaxValidation: true });
    monaco.languages.typescript?.typescriptDefaults?.setDiagnosticsOptions({ noSemanticValidation: true, noSyntaxValidation: true });

    // Define theme
    const themeConfig = MONACO_THEMES[theme];
    const themeName = `cowrite-${theme}`;
    monaco.editor.defineTheme(themeName, {
      base: themeConfig.base,
      inherit: true,
      rules: [],
      colors: themeConfig.colors
    });
    monaco.editor.setTheme(themeName);

    editor.updateOptions({
      fontSize: 18,
      lineHeight: 32,
      fontFamily: "'Crimson Pro', 'Georgia', 'Cambria', serif",
      minimap: { enabled: false },
      lineNumbers: 'off',
      glyphMargin: false,
      folding: false,
      lineDecorationsWidth: 0,
      lineNumbersMinChars: 0,
      renderLineHighlight: 'none',
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      wrappingIndent: 'indent',
      padding: { top: 48, bottom: 48 },
      contextmenu: true,
      quickSuggestions: false,
      quickSuggestionsDelay: 10000,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      smoothScrolling: true,
      renderWhitespace: 'none',
      overviewRulerLanes: 0,
      hideCursorInOverviewRuler: true,
      overviewRulerBorder: false,
      scrollbar: {
        vertical: 'auto',
        horizontal: 'hidden',
        verticalScrollbarSize: 4,
        useShadows: false
      }
    });

    editor.addCommand(monaco.KeyCode.F1, () => { });

    if (onAddToChat) {
      editor.addAction({
        id: 'add-to-chat',
        label: '💬 Send to The Muse',
        contextMenuGroupId: '9_cutcopypaste',
        contextMenuOrder: 1.5,
        run: (ed) => {
          const selection = ed.getSelection();
          const model = ed.getModel();
          if (selection && model && !selection.isEmpty()) {
            onAddToChat({
              text: model.getValueInRange(selection),
              fileName: file?.filename || 'Untitled',
              fileId: file?.id || '',
              startLine: selection.startLineNumber,
              endLine: selection.endLineNumber,
              startColumn: selection.startColumn,
              endColumn: selection.endColumn
            });
          }
        }
      });
    }

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => handleCopilotTrigger());

    editor.onKeyDown((e: any) => {
      if (e.keyCode === monaco.KeyCode.Tab && decorationsRef.current.length > 0) {
        e.preventDefault(); e.stopPropagation(); handleAcceptSuggestion();
      }
      if (e.keyCode === monaco.KeyCode.Escape && decorationsRef.current.length > 0) {
        e.preventDefault(); e.stopPropagation(); handleRejectSuggestion();
      }
    });

    editor.onDidChangeModelContent(() => {
      setContent(editor.getValue());
      setHasChanges(true);
      if (showSuggestion) clearInlineSuggestion();
    });
  };

  const handleContentChange = (value: string | undefined) => {
    if (value !== undefined) { setContent(value); setHasChanges(true); }
  };

  const handleSave = useCallback(async () => {
    if (!onSave) return;
    setIsSaving(true);
    try { await onSave(content, file ? undefined : filename); setHasChanges(false); }
    catch { alert('Failed to save file.'); }
    finally { setIsSaving(false); }
  }, [onSave, content, file, filename]);

  const clearInlineSuggestion = useCallback(() => {
    if (editorRef.current && decorationsRef.current.length > 0) {
      editorRef.current.deltaDecorations(decorationsRef.current, []);
      decorationsRef.current = [];
    }
    setShowSuggestion(false); setSuggestionText('');
    suggestionTextRef.current = ''; suggestionPositionRef.current = null;
    clearSuggestion();
  }, [clearSuggestion]);

  useImperativeHandle(ref, () => ({
    applyEdit: async (edit: any) => {
      if (!editorRef.current) return;
      const model = editorRef.current.getModel();
      if (!model) return;
      editorRef.current.executeEdits('ai-edit', [{
        range: { startLineNumber: edit.start_line, startColumn: 1, endLineNumber: edit.end_line, endColumn: model.getLineMaxColumn(edit.end_line) },
        text: edit.proposed_text
      }]);
      setHasChanges(true);
      editorRef.current.focus();
    }
  }), []);

  const handleCopilotTrigger = useCallback(async () => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    const position = editor.getPosition();
    const model = editor.getModel();
    if (!position || !model) return;

    const offset = model.getOffsetAt(position);
    const textBefore = model.getValueInRange({ startLineNumber: 1, startColumn: 1, endLineNumber: position.lineNumber, endColumn: position.column });
    const textAfter = model.getValueInRange({ startLineNumber: position.lineNumber, startColumn: position.column, endLineNumber: model.getLineCount(), endColumn: model.getLineMaxColumn(model.getLineCount()) });

    const suggestion = await getSuggestion(textBefore, textAfter, offset);
    if (suggestion) {
      setSuggestionText(suggestion);
      suggestionTextRef.current = suggestion;
      suggestionPositionRef.current = position;
      setShowSuggestion(true);
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [{
        range: { startLineNumber: position.lineNumber, startColumn: position.column, endLineNumber: position.lineNumber, endColumn: position.column },
        options: { after: { content: suggestion, inlineClassName: 'copilot-suggestion' }, showIfCollapsed: true }
      }]);
    }
  }, [getSuggestion]);

  const handleAcceptSuggestion = useCallback(() => {
    const s = suggestionTextRef.current;
    const p = suggestionPositionRef.current;
    if (!s || !editorRef.current || !p) return;
    editorRef.current.executeEdits('copilot', [{ range: { startLineNumber: p.lineNumber, startColumn: p.column, endLineNumber: p.lineNumber, endColumn: p.column }, text: s }]);
    clearInlineSuggestion();
    suggestionTextRef.current = ''; suggestionPositionRef.current = null;
    acceptSuggestion();
    editorRef.current.focus();
  }, [acceptSuggestion, clearInlineSuggestion]);

  const handleRejectSuggestion = useCallback(() => {
    clearInlineSuggestion();
    rejectSuggestion();
    editorRef.current?.focus();
  }, [rejectSuggestion, clearInlineSuggestion]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); if (onSave && hasChanges) handleSave(); }
      if ((e.ctrlKey || e.metaKey) && e.key === ' ') { e.preventDefault(); handleCopilotTrigger(); }
      if (e.key === 'Tab' && showSuggestion) { e.preventDefault(); handleAcceptSuggestion(); }
      if (e.key === 'Escape' && showSuggestion) { e.preventDefault(); handleRejectSuggestion(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasChanges, onSave, handleSave, showSuggestion, handleCopilotTrigger, handleAcceptSuggestion, handleRejectSuggestion]);

  // Word count and reading time
  const wordCount = content.split(/\s+/).filter(x => x.length > 0).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  // Empty state
  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md px-8">
          <Feather className="w-16 h-16 mx-auto mb-6 opacity-20" />
          <h2 className="text-2xl mb-3 font-serif italic opacity-70">
            What are we writing today?
          </h2>
          <p className="text-sm opacity-40 mb-8">
            Open a file from the sidebar or upload a new manuscript
          </p>
          <div className="flex items-center justify-center gap-6 text-xs opacity-30">
            <span>Ctrl+S save</span>
            <span>·</span>
            <span>Ctrl+Space AI</span>
            <span>·</span>
            <span>Ctrl+\ focus</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Editor — centered like the reference */}
      <div className="flex-1 overflow-hidden flex justify-center">
        <div className="w-full max-w-3xl">
          <MonacoEditor
            height="100%"
            defaultLanguage="markdown"
            value={content}
            onChange={handleContentChange}
            onMount={handleEditorDidMount}
            theme={`cowrite-${theme}`}
            options={{
              fontSize: 18,
              lineHeight: 32,
              fontFamily: "'Crimson Pro', 'Georgia', 'Cambria', serif",
              minimap: { enabled: false },
              lineNumbers: 'off',
              glyphMargin: false,
              folding: false,
              lineDecorationsWidth: 0,
              lineNumbersMinChars: 0,
              renderLineHighlight: 'none',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              wrappingIndent: 'indent',
              padding: { top: 48, bottom: 48 },
              automaticLayout: true,
              tabSize: 2,
              insertSpaces: true,
              quickSuggestions: false,
              suggestOnTriggerCharacters: false,
              acceptSuggestionOnEnter: 'off',
              tabCompletion: 'off',
              wordBasedSuggestions: 'off',
              parameterHints: { enabled: false },
              suggest: { showWords: false },
              unicodeHighlight: { ambiguousCharacters: false, invisibleCharacters: false },
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              smoothScrolling: true,
              renderWhitespace: 'none',
              overviewRulerLanes: 0,
              hideCursorInOverviewRuler: true,
              overviewRulerBorder: false,
              scrollbar: { vertical: 'auto', horizontal: 'hidden', verticalScrollbarSize: 4, useShadows: false }
            }}
          />
        </div>
      </div>

      {/* Copilot indicators */}
      {isCopilotLoading && (
        <div className="absolute top-3 right-3 flex items-center gap-2 px-3 py-1.5 rounded-full z-10 bg-indigo-600/10 text-indigo-600 border border-indigo-500/20">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span className="text-xs font-medium">AI thinking…</span>
        </div>
      )}
      {showSuggestion && suggestionText && (
        <div className="absolute top-3 right-3 flex items-center gap-2 px-3 py-1.5 rounded-full z-10 bg-indigo-600/10 text-indigo-600 border border-indigo-500/20">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">Tab to accept · Esc to reject</span>
        </div>
      )}

      {/* Stats footer */}
      <footer className={`h-10 px-6 flex items-center justify-between text-[11px] font-medium opacity-50 border-t ${theme === 'dark' ? 'border-zinc-800' : theme === 'sepia' ? 'border-stone-200' : 'border-gray-200'
        }`}>
        <div className="flex items-center space-x-4">
          <span>{content.length} characters</span>
          <span>{wordCount} words</span>
          <span>~{readingTime} min read</span>
        </div>
        <div className="flex items-center space-x-4">
          {hasChanges && <span className="text-amber-500 font-semibold">• Unsaved</span>}
          <span>Ctrl+Space: AI</span>
        </div>
      </footer>
    </div>
  );
});

export default TextEditor;
