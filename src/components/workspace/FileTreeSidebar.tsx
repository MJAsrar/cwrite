'use client';

import { useState, useRef } from 'react';
import { Project, ProjectFile } from '@/types';
import { 
  FileText, 
  Upload, 
  MoreVertical, 
  Trash2, 
  Download,
  Eye,
  AlertCircle,
  CheckCircle,
  Loader2,
  Plus,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  SortAsc,
  File,
  FileImage,
  FileVideo,
  FileAudio,
  Archive
} from 'lucide-react';
import Button from '@/components/ui/Button';
import FileUploadZone from './FileUploadZone';

interface FileTreeSidebarProps {
  project: Project;
  files: ProjectFile[];
  onFileSelect: (fileId: string) => void;
  onFileUpload: (files: File[]) => Promise<void>;
  onFileDelete: (fileId: string) => Promise<void>;
  selectedFileId?: string;
}

interface FileItemProps {
  file: ProjectFile;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => Promise<void>;
}

function FileItem({ file, isSelected, onSelect, onDelete }: FileItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const getFileIcon = () => {
    const extension = file.filename.split('.').pop()?.toLowerCase();
    const mimeType = file.content_type.toLowerCase();
    
    // Enhanced icon mapping based on file type
    if (mimeType.includes('image')) {
      return <FileImage className="w-4 h-4 text-green-500" />;
    } else if (mimeType.includes('video')) {
      return <FileVideo className="w-4 h-4 text-purple-500" />;
    } else if (mimeType.includes('audio')) {
      return <FileAudio className="w-4 h-4 text-orange-500" />;
    } else if (extension === 'pdf') {
      return <File className="w-4 h-4 text-red-500" />;
    } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension || '')) {
      return <Archive className="w-4 h-4 text-yellow-500" />;
    } else if (['txt', 'md', 'markdown'].includes(extension || '')) {
      return <FileText className="w-4 h-4 text-blue-500" />;
    } else if (['doc', 'docx'].includes(extension || '')) {
      return <FileText className="w-4 h-4 text-blue-600" />;
    }
    return <File className="w-4 h-4 text-muted-foreground" />;
  };

  const getStatusConfig = () => {
    switch (file.processing_status) {
      case 'completed':
        return {
          icon: CheckCircle,
          color: 'text-green-500',
          bgColor: 'bg-green-50',
          text: 'Processed'
        };
      case 'processing':
        return {
          icon: Loader2,
          color: 'text-blue-500',
          bgColor: 'bg-blue-50',
          text: 'Processing',
          animate: 'animate-spin'
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-500',
          bgColor: 'bg-red-50',
          text: 'Error'
        };
      default:
        return null;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${file.filename}"?`)) {
      setDeleting(true);
      try {
        await onDelete();
      } finally {
        setDeleting(false);
        setShowMenu(false);
      }
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig?.icon;

  return (
    <div
      className={`
        group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all
        ${isSelected 
          ? 'bg-primary text-primary-foreground shadow-sm' 
          : 'hover:bg-accent text-foreground'
        }
      `}
      onClick={onSelect}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex-shrink-0">
          {getFileIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className={`text-sm font-medium truncate ${
              isSelected ? 'text-primary-foreground' : 'text-foreground'
            }`}>
              {file.filename}
            </p>
            {statusConfig && StatusIcon && (
              <div className={`
                flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                ${isSelected ? 'bg-primary-foreground/20 text-primary-foreground' : statusConfig.bgColor}
              `}>
                <StatusIcon className={`w-3 h-3 ${
                  isSelected ? 'text-primary-foreground' : statusConfig.color
                } ${statusConfig.animate || ''}`} />
                <span className={isSelected ? 'text-primary-foreground' : statusConfig.color}>
                  {statusConfig.text}
                </span>
              </div>
            )}
          </div>
          
          <div className={`flex items-center gap-2 text-xs ${
            isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'
          }`}>
            <span>{formatFileSize(file.size)}</span>
            <span>•</span>
            <span>{new Date(file.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="relative flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className={`
            h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity
            ${isSelected 
              ? 'hover:bg-primary-foreground/20 text-primary-foreground' 
              : 'hover:bg-accent text-muted-foreground hover:text-foreground'
            }
          `}
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
        >
          <MoreVertical className="w-4 h-4" />
        </Button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 mt-1 w-48 bg-card rounded-xl shadow-lg border border-border py-1 z-20">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect();
                  setShowMenu(false);
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-accent rounded-lg mx-1"
              >
                <Eye className="w-4 h-4 mr-3" />
                View File
              </button>
              <button className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-accent rounded-lg mx-1">
                <Download className="w-4 h-4 mr-3" />
                Download
              </button>
              <div className="h-px bg-border my-1" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                disabled={deleting}
                className="flex items-center w-full px-4 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg mx-1 disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 mr-3 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-3" />
                )}
                Delete File
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function FileTreeSidebar({
  project,
  files,
  onFileSelect,
  onFileUpload,
  onFileDelete,
  selectedFileId
}: FileTreeSidebarProps) {
  const [showUploadZone, setShowUploadZone] = useState(true); // Start visible
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'status'>('date');
  const [groupByType, setGroupByType] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter and sort files
  const filteredFiles = files.filter(file =>
    file.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedFiles = [...filteredFiles].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.filename.localeCompare(b.filename);
      case 'size':
        return b.size - a.size;
      case 'status':
        return a.processing_status.localeCompare(b.processing_status);
      case 'date':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  // Group files by type if enabled
  const groupedFiles = groupByType 
    ? sortedFiles.reduce((groups, file) => {
        const extension = file.filename.split('.').pop()?.toLowerCase() || 'other';
        const groupName = getFileTypeGroup(extension);
        if (!groups[groupName]) {
          groups[groupName] = [];
        }
        groups[groupName].push(file);
        return groups;
      }, {} as Record<string, ProjectFile[]>)
    : { 'All Files': sortedFiles };

  function getFileTypeGroup(extension: string): string {
    if (['txt', 'md', 'markdown'].includes(extension)) return 'Text Files';
    if (['doc', 'docx', 'pdf'].includes(extension)) return 'Documents';
    if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(extension)) return 'Images';
    if (['mp4', 'avi', 'mov', 'wmv'].includes(extension)) return 'Videos';
    if (['mp3', 'wav', 'flac', 'aac'].includes(extension)) return 'Audio';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) return 'Archives';
    return 'Other Files';
  }

  const toggleGroup = (groupName: string) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(groupName)) {
      newCollapsed.delete(groupName);
    } else {
      newCollapsed.add(groupName);
    }
    setCollapsedGroups(newCollapsed);
  };

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Enhanced Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Project Files</h3>
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full font-medium">
            {files.length}
          </span>
        </div>
        
        {/* Search and Controls */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="flex-1 px-3 py-2 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="date">Sort by Date</option>
              <option value="name">Sort by Name</option>
              <option value="size">Sort by Size</option>
              <option value="status">Sort by Status</option>
            </select>
            
            <Button
              variant={groupByType ? "default" : "outline"}
              size="sm"
              onClick={() => setGroupByType(!groupByType)}
              className="px-3"
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>
          
          <Button
            size="sm"
            className="w-full"
            onClick={() => setShowUploadZone(!showUploadZone)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Upload Files
          </Button>
        </div>
      </div>

      {/* Enhanced Upload Zone */}
      {showUploadZone && (
        <div className="p-4 border-b border-border bg-muted/30">
          <FileUploadZone
            onFileUpload={onFileUpload}
            maxFiles={10}
            acceptedTypes={['.txt', '.md', '.docx', '.pdf', '.jpg', '.png']}
          />
        </div>
      )}

      {/* Enhanced File List */}
      <div className="flex-1 overflow-y-auto">
        {filteredFiles.length === 0 ? (
          <div className="text-center py-12 px-4">
            {searchQuery ? (
              <>
                <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="font-medium text-foreground mb-2">No files found</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Try adjusting your search terms or clear the search to see all files.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSearchQuery('')}
                >
                  Clear Search
                </Button>
              </>
            ) : (
              <>
                <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="font-medium text-foreground mb-2">No files yet</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload your manuscript files to get started with AI-powered analysis.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowUploadZone(true)}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload First File
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {Object.entries(groupedFiles).map(([groupName, groupFiles]) => (
              <div key={groupName}>
                {groupByType && (
                  <button
                    onClick={() => toggleGroup(groupName)}
                    className="flex items-center gap-2 w-full p-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent"
                  >
                    {collapsedGroups.has(groupName) ? (
                      <ChevronRight className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                    <span>{groupName}</span>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                      {groupFiles.length}
                    </span>
                  </button>
                )}
                
                {(!groupByType || !collapsedGroups.has(groupName)) && (
                  <div className={`space-y-1 ${groupByType ? 'ml-6' : ''}`}>
                    {groupFiles.map((file) => (
                      <FileItem
                        key={file.id}
                        file={file}
                        isSelected={selectedFileId === file.id}
                        onSelect={() => onFileSelect(file.id)}
                        onDelete={() => onFileDelete(file.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}