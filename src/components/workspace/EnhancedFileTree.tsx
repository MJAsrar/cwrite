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
  MoreVertical,
  Plus,
  Edit2,
  Trash2,
  FolderPlus,
  Upload,
  Download,
  Eye,
  Loader2
} from 'lucide-react';
import Button from '@/components/ui/Button';

interface FolderStructure {
  id: string;
  name: string;
  type: 'folder';
  children: (FolderStructure | FileNode)[];
  isExpanded: boolean;
}

interface FileNode {
  id: string;
  name: string;
  type: 'file';
  file: ProjectFile;
}

type TreeNode = FolderStructure | FileNode;

interface EnhancedFileTreeProps {
  files: ProjectFile[];
  selectedFileId?: string;
  onFileSelect: (fileId: string) => void;
  onFileDelete: (fileId: string) => Promise<void>;
  onFileUpload: (files: File[], folderId?: string) => Promise<void>;
}

// Helper function to rebuild tree with current files (defined outside component)
const rebuildTreeWithFiles = (structure: FolderStructure, currentFiles: ProjectFile[]): FolderStructure => {
  const updateChildren = (children: TreeNode[]): TreeNode[] => {
    return children.map(child => {
      if (child.type === 'folder') {
        return {
          ...child,
          children: updateChildren(child.children)
        };
      } else {
        // Update file data
        const updatedFile = currentFiles.find(f => f.id === child.id);
        if (updatedFile) {
          return {
            ...child,
            file: updatedFile,
            name: updatedFile.filename
          };
        }
        return child;
      }
    });
  };
  
  // Add any new files to root
  const existingFileIds = new Set<string>();
  const collectFileIds = (children: TreeNode[]) => {
    children.forEach(child => {
      if (child.type === 'file') {
        existingFileIds.add(child.id);
      } else {
        collectFileIds(child.children);
      }
    });
  };
  collectFileIds(structure.children);
  
  const newFiles = currentFiles
    .filter(f => !existingFileIds.has(f.id))
    .map(f => ({
      id: f.id,
      name: f.filename,
      type: 'file' as const,
      file: f
    }));
  
  return {
    ...structure,
    children: [...updateChildren(structure.children), ...newFiles]
  };
};

export default function EnhancedFileTree({
  files,
  selectedFileId,
  onFileSelect,
  onFileDelete,
  onFileUpload
}: EnhancedFileTreeProps) {
  // Initialize with a root "Documents" folder structure
  const [treeStructure, setTreeStructure] = useState<FolderStructure>(() => {
    // Try to load saved structure from localStorage
    const saved = localStorage.getItem('fileTreeStructure');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Rebuild tree with current files
      return rebuildTreeWithFiles(parsed, files);
    }
    
    // Default structure
    return {
      id: 'root',
      name: 'Documents',
      type: 'folder',
      isExpanded: true,
      children: files.map(f => ({
        id: f.id,
        name: f.filename,
        type: 'file',
        file: f
      }))
    };
  });
  
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: TreeNode } | null>(null);
  const [renamingNode, setRenamingNode] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetFolder, setUploadTargetFolder] = useState<string | null>(null);

  // Save structure to localStorage
  const saveStructure = (structure: FolderStructure) => {
    const simplified = simplifyStructure(structure);
    localStorage.setItem('fileTreeStructure', JSON.stringify(simplified));
  };

  // Simplify structure for storage (remove file objects)
  const simplifyStructure = (node: TreeNode): any => {
    if (node.type === 'folder') {
      return {
        id: node.id,
        name: node.name,
        type: 'folder',
        isExpanded: node.isExpanded,
        children: node.children.map(simplifyStructure)
      };
    } else {
      return {
        id: node.id,
        name: node.name,
        type: 'file'
      };
    }
  };

  const toggleFolder = (folderId: string) => {
    const updateNode = (node: TreeNode): TreeNode => {
      if (node.type === 'folder') {
        if (node.id === folderId) {
          return { ...node, isExpanded: !node.isExpanded };
        }
        return {
          ...node,
          children: node.children.map(updateNode)
        };
      }
      return node;
    };
    
    const updated = updateNode(treeStructure) as FolderStructure;
    setTreeStructure(updated);
    saveStructure(updated);
  };

  const createFolder = (parentId: string, folderName: string) => {
    const newFolder: FolderStructure = {
      id: `folder-${Date.now()}`,
      name: folderName,
      type: 'folder',
      isExpanded: true,
      children: []
    };
    
    const updateNode = (node: TreeNode): TreeNode => {
      if (node.type === 'folder') {
        if (node.id === parentId) {
          return {
            ...node,
            children: [...node.children, newFolder]
          };
        }
        return {
          ...node,
          children: node.children.map(updateNode)
        };
      }
      return node;
    };
    
    const updated = updateNode(treeStructure) as FolderStructure;
    setTreeStructure(updated);
    saveStructure(updated);
  };

  const renameNode = (nodeId: string, newName: string) => {
    const updateNode = (node: TreeNode): TreeNode => {
      if (node.id === nodeId) {
        return { ...node, name: newName };
      }
      if (node.type === 'folder') {
        return {
          ...node,
          children: node.children.map(updateNode)
        };
      }
      return node;
    };
    
    const updated = updateNode(treeStructure) as FolderStructure;
    setTreeStructure(updated);
    saveStructure(updated);
  };

  const deleteNode = (nodeId: string) => {
    const removeNode = (children: TreeNode[]): TreeNode[] => {
      return children.filter(child => {
        if (child.id === nodeId) return false;
        if (child.type === 'folder') {
          return { ...child, children: removeNode(child.children) };
        }
        return true;
      }).map(child => {
        if (child.type === 'folder') {
          return { ...child, children: removeNode(child.children) };
        }
        return child;
      });
    };
    
    const updated = {
      ...treeStructure,
      children: removeNode(treeStructure.children)
    };
    setTreeStructure(updated);
    saveStructure(updated);
  };

  const getFileIcon = (file: ProjectFile) => {
    const ext = file.filename.split('.').pop()?.toLowerCase();
    if (['txt', 'md'].includes(ext || '')) {
      return <FileText className="w-4 h-4 text-blue-500" />;
    }
    return <File className="w-4 h-4 text-muted-foreground" />;
  };

  const renderTree = (node: TreeNode, depth: number = 0): JSX.Element => {
    if (node.type === 'folder') {
      return (
        <div key={node.id}>
          <div
            className={`flex items-center gap-2 py-1.5 px-2 hover:bg-accent rounded-md cursor-pointer group transition-colors`}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => toggleFolder(node.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu({ x: e.clientX, y: e.clientY, node });
            }}
          >
            {node.isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
            {node.isExpanded ? (
              <FolderOpen className="w-4 h-4 text-yellow-500" />
            ) : (
              <Folder className="w-4 h-4 text-yellow-500" />
            )}
            
            {renamingNode === node.id ? (
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onBlur={() => {
                  if (newName.trim()) {
                    renameNode(node.id, newName.trim());
                  }
                  setRenamingNode(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (newName.trim()) {
                      renameNode(node.id, newName.trim());
                    }
                    setRenamingNode(null);
                  } else if (e.key === 'Escape') {
                    setRenamingNode(null);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                autoFocus
                className="flex-1 px-2 py-0.5 text-sm bg-background border border-border rounded"
              />
            ) : (
              <span className="text-sm font-medium text-foreground flex-1">{node.name}</span>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                const folderName = prompt('New folder name:');
                if (folderName?.trim()) {
                  createFolder(node.id, folderName.trim());
                }
              }}
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </Button>
          </div>
          
          {node.isExpanded && (
            <div>
              {node.children.map(child => renderTree(child, depth + 1))}
            </div>
          )}
        </div>
      );
    } else {
      const isSelected = selectedFileId === node.id;
      const isProcessing = node.file.processing_status === 'processing';
      
      return (
        <div
          key={node.id}
          className={`flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer group transition-colors ${
            isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
          }`}
          style={{ paddingLeft: `${depth * 12 + 28}px` }}
          onClick={() => onFileSelect(node.id)}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY, node });
          }}
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          ) : (
            getFileIcon(node.file)
          )}
          
          <span className={`text-sm flex-1 truncate ${
            isSelected ? 'text-primary-foreground font-medium' : 'text-foreground'
          }`}>
            {node.name}
          </span>
          
          {isProcessing && (
            <span className="text-xs text-blue-500 font-medium">Processing...</span>
          )}
        </div>
      );
    }
  };

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Explorer
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                const folderName = prompt('New folder name:');
                if (folderName?.trim()) {
                  createFolder('root', folderName.trim());
                }
              }}
              title="New Folder"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => fileInputRef.current?.click()}
              title="Upload File"
            >
              <Upload className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".txt,.pdf,.md,.docx"
        onChange={async (e) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            await onFileUpload(Array.from(files), uploadTargetFolder || undefined);
          }
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }}
        className="hidden"
      />

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto py-2 px-1">
        {renderTree(treeStructure)}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-50 w-48 bg-card rounded-lg shadow-lg border border-border py-1"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {contextMenu.node.type === 'folder' ? (
              <>
                <button
                  className="flex items-center w-full px-3 py-1.5 text-sm hover:bg-accent"
                  onClick={() => {
                    const folderName = prompt('New folder name:');
                    if (folderName?.trim()) {
                      createFolder(contextMenu.node.id, folderName.trim());
                    }
                    setContextMenu(null);
                  }}
                >
                  <FolderPlus className="w-4 h-4 mr-2" />
                  New Folder
                </button>
                <button
                  className="flex items-center w-full px-3 py-1.5 text-sm hover:bg-accent"
                  onClick={() => {
                    setUploadTargetFolder(contextMenu.node.id);
                    fileInputRef.current?.click();
                    setContextMenu(null);
                  }}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Here
                </button>
                <div className="h-px bg-border my-1" />
                <button
                  className="flex items-center w-full px-3 py-1.5 text-sm hover:bg-accent"
                  onClick={() => {
                    setNewName(contextMenu.node.name);
                    setRenamingNode(contextMenu.node.id);
                    setContextMenu(null);
                  }}
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Rename
                </button>
                {contextMenu.node.id !== 'root' && (
                  <button
                    className="flex items-center w-full px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (confirm(`Delete folder "${contextMenu.node.name}"?`)) {
                        deleteNode(contextMenu.node.id);
                      }
                      setContextMenu(null);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  className="flex items-center w-full px-3 py-1.5 text-sm hover:bg-accent"
                  onClick={() => {
                    onFileSelect((contextMenu.node as FileNode).id);
                    setContextMenu(null);
                  }}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Open
                </button>
                <button
                  className="flex items-center w-full px-3 py-1.5 text-sm hover:bg-accent"
                  onClick={() => {
                    // Download file logic
                    setContextMenu(null);
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </button>
                <div className="h-px bg-border my-1" />
                <button
                  className="flex items-center w-full px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                  onClick={async () => {
                    if (confirm(`Delete file "${contextMenu.node.name}"?`)) {
                      await onFileDelete((contextMenu.node as FileNode).id);
                      deleteNode(contextMenu.node.id);
                    }
                    setContextMenu(null);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

