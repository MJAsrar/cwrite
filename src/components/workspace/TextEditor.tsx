'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ProjectFile } from '@/types';
import { FileText, Upload, Sparkles, Loader2 } from 'lucide-react';
import { useCopilot } from '@/hooks/useCopilot';
import dynamic from 'next/dynamic';
import type { editor } from 'monaco-editor';
import '@/styles/copilot.css';

// Dynamically import Monaco Editor (client-side only)
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-[#0A0A0A] flex items-center justify-center">
      <div className="flex items-center gap-2 text-[#39FF14]">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="font-mono text-sm uppercase">Loading Editor...</span>
      </div>
    </div>
  )
});

interface TextEditorProps {
  file?: ProjectFile;
  projectId: string;
  onSave?: (content: string, filename?: string) => Promise<void>;
  onNewFile?: () => void;
}

export default function TextEditor({ file, projectId, onSave, onNewFile }: TextEditorProps) {
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [filename, setFilename] = useState('Untitled.txt');
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [suggestionText, setSuggestionText] = useState('');
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<string[]>([]);

  const {
    getSuggestion,
    acceptSuggestion,
    rejectSuggestion,
    clearSuggestion,
    currentSuggestion,
    isLoading: isCopilotLoading
  } = useCopilot({
    projectId,
    fileId: file?.id,
    onSuggestionAccepted: (suggestion) => {
      console.log('Suggestion accepted:', suggestion);
    },
    onSuggestionRejected: (suggestion) => {
      console.log('Suggestion rejected:', suggestion);
    }
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

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: any) => {
    editorRef.current = editor;

    // Configure editor
    editor.updateOptions({
      fontSize: 14,
      lineHeight: 24,
      fontFamily: '"Cascadia Code", "Fira Code", "Consolas", "Monaco", monospace',
      minimap: { enabled: false },
      lineNumbers: 'on',
      glyphMargin: false,
      folding: false,
      lineDecorationsWidth: 0,
      lineNumbersMinChars: 4,
      renderLineHighlight: 'line',
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      wrappingIndent: 'indent',
      padding: { top: 16, bottom: 16 }
    });

    // Add Ctrl+Space command for copilot
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => {
      handleCopilotTrigger();
    });

    // Add Tab command for accepting suggestion
    editor.addCommand(monaco.KeyCode.Tab, () => {
      if (showSuggestion && suggestionText) {
        handleAcceptSuggestion();
        return true;
      }
      return false;
    });

    // Add Escape command for rejecting suggestion
    editor.addCommand(monaco.KeyCode.Escape, () => {
      if (showSuggestion) {
        handleRejectSuggestion();
        return true;
      }
      return false;
    });

    // Listen for content changes
    editor.onDidChangeModelContent(() => {
      const value = editor.getValue();
      setContent(value);
      setHasChanges(true);
      
      // Hide suggestion when user types
      if (showSuggestion) {
        clearInlineSuggestion();
      }
    });
  };

  const handleContentChange = (value: string | undefined) => {
    if (value !== undefined) {
      setContent(value);
      setHasChanges(true);
    }
  };

  const handleSave = useCallback(async () => {
    if (!onSave) return;
    
    setIsSaving(true);
    try {
      await onSave(content, file ? undefined : filename);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save file. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [onSave, content, file, filename]);

  const clearInlineSuggestion = useCallback(() => {
    if (editorRef.current && decorationsRef.current.length > 0) {
      editorRef.current.deltaDecorations(decorationsRef.current, []);
      decorationsRef.current = [];
    }
    setShowSuggestion(false);
    setSuggestionText('');
    clearSuggestion();
  }, [clearSuggestion]);

  // Handle copilot trigger and accept/reject
  const handleCopilotTrigger = useCallback(async () => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const position = editor.getPosition();
    if (!position) return;

    const model = editor.getModel();
    if (!model) return;

    const offset = model.getOffsetAt(position);
    const textBefore = model.getValueInRange({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: position.lineNumber,
      endColumn: position.column
    });
    const textAfter = model.getValueInRange({
      startLineNumber: position.lineNumber,
      startColumn: position.column,
      endLineNumber: model.getLineCount(),
      endColumn: model.getLineMaxColumn(model.getLineCount())
    });

    console.log('Triggering copilot at line', position.lineNumber, 'column', position.column);

    const suggestion = await getSuggestion(textBefore, textAfter, offset);
    
    if (suggestion) {
      console.log('Got suggestion:', suggestion);
      setSuggestionText(suggestion);
      setShowSuggestion(true);
      
      // Show inline suggestion as ghost text
      const decorations = editor.deltaDecorations(decorationsRef.current, [
        {
          range: {
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column
          },
          options: {
            after: {
              content: suggestion,
              inlineClassName: 'copilot-suggestion'
            },
            showIfCollapsed: true
          }
        }
      ]);
      decorationsRef.current = decorations;
    } else {
      console.log('No suggestion received');
    }
  }, [getSuggestion]);

  const handleAcceptSuggestion = useCallback(() => {
    if (!suggestionText || !editorRef.current) return;

    const editor = editorRef.current;
    const position = editor.getPosition();
    if (!position) return;

    // Insert suggestion at cursor position
    editor.executeEdits('copilot', [
      {
        range: {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        },
        text: suggestionText
      }
    ]);

    // Clear decorations
    clearInlineSuggestion();
    acceptSuggestion();

    // Focus editor
    editor.focus();
  }, [suggestionText, acceptSuggestion, clearInlineSuggestion]);

  const handleRejectSuggestion = useCallback(() => {
    clearInlineSuggestion();
    rejectSuggestion();
    editorRef.current?.focus();
  }, [rejectSuggestion, clearInlineSuggestion]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (onSave && hasChanges) {
          handleSave();
        }
      }
      
      // Ctrl+Space to trigger copilot
      if ((e.ctrlKey || e.metaKey) && e.key === ' ') {
        e.preventDefault();
        handleCopilotTrigger();
      }
      
      // Tab to accept suggestion
      if (e.key === 'Tab' && showSuggestion) {
        e.preventDefault();
        handleAcceptSuggestion();
      }
      
      // Escape to reject suggestion
      if (e.key === 'Escape' && showSuggestion) {
        e.preventDefault();
        handleRejectSuggestion();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasChanges, onSave, handleSave, showSuggestion, handleCopilotTrigger, handleAcceptSuggestion, handleRejectSuggestion]);

  if (!file) {
    return (
      <div className="h-full w-full bg-[#0A0A0A] flex items-center justify-center p-12">
        <div className="max-w-2xl text-center">
          <div className="w-24 h-24 mx-auto border-4 border-[#39FF14] bg-[#39FF14]/10 flex items-center justify-center mb-8">
            <FileText className="w-12 h-12 text-[#39FF14]" />
          </div>
          
          <h2 className="text-4xl font-black uppercase text-white mb-4">
            WRITING WORKSPACE
          </h2>
          <p className="font-mono text-sm text-gray-400 mb-8 uppercase">
            CREATE OR OPEN A FILE TO START WRITING
          </p>
          
          <div className="grid md:grid-cols-2 gap-4 text-left mb-8">
            <div className="border-4 border-white bg-white p-6">
              <div className="w-12 h-12 bg-[#39FF14] border-4 border-[#0A0A0A] flex items-center justify-center mb-4">
                <Upload className="w-6 h-6 text-[#0A0A0A]" />
              </div>
              <h3 className="font-black text-lg uppercase text-[#0A0A0A] mb-2">UPLOAD FILES</h3>
              <p className="font-mono text-xs text-gray-600 uppercase">
                DRAG AND DROP YOUR MANUSCRIPT FILES
              </p>
            </div>
            
            <div className="border-4 border-white bg-white p-6">
              <div className="w-12 h-12 bg-[#FF073A] border-4 border-[#0A0A0A] flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-black text-lg uppercase text-[#0A0A0A] mb-2">AI ASSISTANCE</h3>
              <p className="font-mono text-xs text-gray-600 uppercase">
                GET HELP WITH CHARACTERS AND PLOT
              </p>
            </div>
          </div>
          
          <div className="space-y-2 font-mono text-xs text-gray-500 uppercase">
            <p>CTRL+S TO SAVE · CTRL+SPACE FOR AI SUGGESTIONS</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-[#0A0A0A] flex flex-col">
      {/* Tab Bar */}
      <div className="h-12 bg-white border-b-4 border-[#0A0A0A] flex items-center px-4">
        <div className="flex items-center gap-2 px-4 py-2 bg-[#39FF14] border-4 border-[#0A0A0A]">
          <FileText className="w-4 h-4 text-[#0A0A0A]" />
          <span className="font-mono text-xs font-bold text-[#0A0A0A] uppercase">{filename}</span>
          {hasChanges && (
            <div className="w-2 h-2 bg-[#FF073A]" title="UNSAVED" />
          )}
        </div>
      </div>
      
      {/* Monaco Editor */}
      <div className="flex-1 relative">
        <MonacoEditor
          height="100%"
          defaultLanguage="markdown"
          value={content}
          onChange={handleContentChange}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            fontSize: 14,
            lineHeight: 24,
            fontFamily: '"Cascadia Code", "Fira Code", "Consolas", "Monaco", monospace',
            minimap: { enabled: false },
            lineNumbers: 'on',
            glyphMargin: false,
            folding: false,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 4,
            renderLineHighlight: 'line',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            wrappingIndent: 'indent',
            padding: { top: 16, bottom: 16 },
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            quickSuggestions: false,
            suggestOnTriggerCharacters: false,
            acceptSuggestionOnEnter: 'off',
            tabCompletion: 'off',
            wordBasedSuggestions: false,
            parameterHints: { enabled: false },
            suggest: { showWords: false }
          }}
        />
        
        {/* Copilot Loading Indicator */}
        {isCopilotLoading && (
          <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-2 bg-[#39FF14] border-4 border-[#0A0A0A] z-10">
            <Loader2 className="w-4 h-4 text-[#0A0A0A] animate-spin" />
            <span className="font-mono text-xs font-bold text-[#0A0A0A] uppercase">AI THINKING...</span>
          </div>
        )}
        
        {/* Copilot Hint */}
        {showSuggestion && suggestionText && (
          <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-2 bg-[#39FF14] border-4 border-[#0A0A0A] z-10">
            <Sparkles className="w-4 h-4 text-[#0A0A0A]" />
            <span className="font-mono text-xs font-bold text-[#0A0A0A] uppercase">
              TAB TO ACCEPT · ESC TO REJECT
            </span>
          </div>
        )}
        
        {/* Status Bar */}
        <div className="absolute bottom-0 right-0 px-4 py-2 font-mono text-xs text-gray-400 bg-white border-l-4 border-t-4 border-[#0A0A0A] uppercase flex items-center gap-4">
          <span>{content.length} CHARS · {content.split('\n').length} LINES</span>
          <span className="text-gray-500">CTRL+SPACE: AI</span>
          {hasChanges && (
            <span className="text-[#FF073A] font-bold">
              • UNSAVED
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
