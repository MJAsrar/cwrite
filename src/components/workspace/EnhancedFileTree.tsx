'use client';

import { useState, useRef } from 'react';
import { ProjectFile } from '@/types';
import { 
  Folder,
  FolderOpen,
  FileText,
  File,
  ChevronRight,
  ChevronDown,
  Upload,
  FolderPlus,
  Trash2
} from 'lucide-react';

interface EnhancedFileTreeProps {
  files: ProjectFile[];
  selectedFileId?: string;
  onFileSelect: (fileId: string) => void;
  onFileDelete: (fileId: string) => Promise<void>;
  onFileUpload: (files: File[], folderId?: string) => Promise<void>;
}

export default function EnhancedFileTree({
  files,
  selectedFileId,
  onFileSelect,
  onFileDelete,
  onFileUpload
}: EnhancedFileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: ProjectFile } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const getFileIcon = (file: ProjectFile) => {
    const ext = file.filename.split('.').pop()?.toLowerCase();
    if (['txt', 'md'].includes(ext || '')) {
      return <FileText className="w-4 h-4 text-[#39FF14]" />;
    }
    return <File className="w-4 h-4 text-gray-600" />;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b-4 border-[#0A0A0A]">
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-xs font-bold text-[#0A0A0A] uppercase">
            EXPLORER
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1 text-[#0A0A0A] hover:text-[#39FF14] transition-colors"
              title="UPLOAD FILE"
            >
              <Upload className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".txt,.pdf,.md,.docx"
        onChange={async (e) => {
          const selectedFiles = e.target.files;
          if (selectedFiles && selectedFiles.length > 0) {
            await onFileUpload(Array.from(selectedFiles));
          }
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }}
        className="hidden"
      />

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* Root Folder */}
        <div>
          <div
            className="flex items-center gap-2 py-2 px-2 hover:bg-gray-100 cursor-pointer transition-colors"
            onClick={() => toggleFolder('root')}
          >
            {expandedFolders.has('root') ? (
              <ChevronDown className="w-4 h-4 text-[#0A0A0A]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[#0A0A0A]" />
            )}
            {expandedFolders.has('root') ? (
              <FolderOpen className="w-4 h-4 text-[#39FF14]" />
            ) : (
              <Folder className="w-4 h-4 text-[#39FF14]" />
            )}
            <span className="font-mono text-xs font-bold text-[#0A0A0A] uppercase">DOCUMENTS</span>
          </div>
          
          {expandedFolders.has('root') && (
            <div className="ml-4">
              {files.map(file => {
                const isSelected = selectedFileId === file.id;
                const isProcessing = file.processing_status === 'processing';
                
                return (
                  <div
                    key={file.id}
                    className={`flex items-center gap-2 py-2 px-2 cursor-pointer transition-all ${
                      isSelected ? 'bg-[#39FF14] border-l-4 border-[#0A0A0A]' : 'hover:bg-gray-100'
                    }`}
                    onClick={() => onFileSelect(file.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY, file });
                    }}
                  >
                    {isProcessing ? (
                      <div className="w-4 h-4 border-2 border-t-[#39FF14] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                    ) : (
                      getFileIcon(file)
                    )}
                    
                    <span className={`font-mono text-xs truncate ${
                      isSelected ? 'text-[#0A0A0A] font-bold' : 'text-gray-700'
                    }`}>
                      {file.filename}
                    </span>
                    
                    {isProcessing && (
                      <span className="font-mono text-xs text-[#39FF14] uppercase">PROC...</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-50 w-48 border-4 border-[#0A0A0A] bg-white shadow-lg"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              className="flex items-center w-full px-4 py-3 font-mono text-xs uppercase font-bold text-[#FF073A] hover:bg-[#FF073A]/10 transition-colors"
              onClick={async () => {
                if (confirm(`DELETE "${contextMenu.file.filename}"?`)) {
                  await onFileDelete(contextMenu.file.id);
                }
                setContextMenu(null);
              }}
            >
              <Trash2 className="w-4 h-4 mr-3" />
              DELETE
            </button>
          </div>
        </>
      )}
    </div>
  );
}
