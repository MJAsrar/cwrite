'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProjectFile } from '@/types';
import { FileText, Upload, Sparkles } from 'lucide-react';

interface TextEditorProps {
  file?: ProjectFile;
  onSave?: (content: string, filename?: string) => Promise<void>;
  onNewFile?: () => void;
}

export default function TextEditor({ file, onSave, onNewFile }: TextEditorProps) {
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [filename, setFilename] = useState('Untitled.txt');

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

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setHasChanges(true);
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

  // Auto-save with Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (onSave && hasChanges) {
          handleSave();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasChanges, onSave, handleSave]);

  // Welcome Screen when no file is selected
  if (!file) {
    return (
      <div className="h-full w-full bg-background flex items-center justify-center p-12">
        <div className="max-w-2xl text-center">
          <div className="mb-8 relative">
            <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <FileText className="w-12 h-12 text-primary" />
            </div>
            <div className="absolute -top-2 -right-12">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center animate-pulse">
                <Sparkles className="w-8 h-8 text-blue-500" />
              </div>
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Welcome to Your Writing Workspace
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Create or open a file to start writing your story
          </p>
          
          <div className="grid md:grid-cols-2 gap-4 text-left mb-8">
            <div className="p-6 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Upload className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Upload Files</h3>
              <p className="text-sm text-muted-foreground">
                Drag and drop your manuscript files or click the upload button
              </p>
            </div>
            
            <div className="p-6 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                <Sparkles className="w-5 h-5 text-blue-500" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">AI Assistance</h3>
              <p className="text-sm text-muted-foreground">
                Get help with characters, plot, dialogue, and more
              </p>
            </div>
          </div>
          
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="flex items-center justify-center gap-2">
              <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Ctrl+S</kbd>
              <span>Save file</span>
            </p>
            <p className="flex items-center justify-center gap-2">
              <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Ctrl+K</kbd>
              <span>Search project</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-background flex flex-col">
      {/* Tab Bar */}
      <div className="h-9 bg-card border-b border-border flex items-center px-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-t-md -mb-px border-b-2 border-primary">
          <FileText className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-sm text-foreground">{filename}</span>
          {hasChanges && (
            <div className="w-1.5 h-1.5 rounded-full bg-primary" title="Unsaved changes" />
          )}
        </div>
      </div>
      
      {/* Editor */}
      <div className="flex-1 relative">
        <textarea
          value={content}
          onChange={handleContentChange}
          className="w-full h-full px-12 py-6 bg-background text-foreground resize-none focus:outline-none font-mono text-sm leading-relaxed border-0"
          placeholder="Start writing..."
          spellCheck={false}
          style={{
            fontFamily: '"Cascadia Code", "Fira Code", "Consolas", "Monaco", monospace',
            lineHeight: '1.65',
            tabSize: 2
          }}
        />
        
        {/* Status Bar */}
        <div className="absolute bottom-0 right-0 px-4 py-1.5 text-xs text-muted-foreground bg-card/50 backdrop-blur-sm rounded-tl-lg border-l border-t border-border">
          {content.length} characters · {content.split('\n').length} lines
          {hasChanges && (
            <span className="ml-2 text-yellow-600 font-medium">
              • Unsaved
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

