'use client';

import { useState, useRef } from 'react';
import { ProjectFile } from '@/types';
import { FileText, MoreVertical, Loader2, Trash2 } from 'lucide-react';

interface EnhancedFileTreeProps {
  files: ProjectFile[];
  selectedFileId?: string;
  onFileSelect: (fileId: string) => void;
  onFileDelete: (fileId: string) => Promise<void>;
  onFileUpload: (files: File[], folderId?: string) => Promise<void>;
  theme?: 'sepia' | 'dark' | 'light';
}

export default function EnhancedFileTree({
  files, selectedFileId, onFileSelect, onFileDelete, onFileUpload, theme = 'sepia'
}: EnhancedFileTreeProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: ProjectFile } | null>(null);
  const isDark = theme === 'dark';

  return (
    <div className="space-y-1">
      {files.map(file => {
        const isSelected = selectedFileId === file.id;
        const isProcessing = file.processing_status === 'processing';

        return (
          <div
            key={file.id}
            onClick={() => onFileSelect(file.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu({ x: e.clientX, y: e.clientY, file });
            }}
            className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${isSelected
                ? isDark
                  ? 'bg-zinc-800'
                  : 'bg-white shadow-sm ring-1 ring-black/5'
                : 'hover:bg-black/5 opacity-60 hover:opacity-100'
              }`}
          >
            <div className="flex items-center space-x-3 overflow-hidden">
              {isProcessing ? (
                <Loader2 size={16} className="text-indigo-500 animate-spin flex-shrink-0" />
              ) : (
                <FileText size={16} className={`flex-shrink-0 ${isSelected ? 'text-indigo-500' : 'opacity-40'}`} />
              )}
              <span className="text-sm font-medium truncate">{file.filename}</span>
            </div>
            <MoreVertical size={14} className="opacity-0 group-hover:opacity-40 flex-shrink-0" />
          </div>
        );
      })}

      {files.length === 0 && (
        <div className="text-center py-8 opacity-40">
          <FileText className="w-8 h-8 mx-auto mb-2" />
          <p className="text-xs">No documents yet</p>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div
            className={`fixed z-50 w-40 rounded-xl shadow-lg overflow-hidden ${isDark ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-stone-200'}`}
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              className="flex items-center w-full px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
              onClick={async () => {
                if (confirm(`Delete "${contextMenu.file.filename}"?`)) {
                  await onFileDelete(contextMenu.file.id);
                }
                setContextMenu(null);
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
