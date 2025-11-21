'use client';

import { useState, useRef, useEffect } from 'react';
import { Project, ProjectFile, Entity, Relationship } from '@/types';
import { 
  FileText, 
  Folder,
  Settings,
  Search,
  Upload,
  Network,
  Users,
  PanelRightOpen,
  PanelRightClose,
  Trash2,
  MoreVertical,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import TextEditor from './TextEditor';
import AIChatPanel from './AIChatPanel';
import SearchModal from './SearchModal';
import EntitiesModal from './EntitiesModal';
import RelationshipsModal from './RelationshipsModal';
import EnhancedFileTree from './EnhancedFileTree';
import Button from '@/components/ui/Button';
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
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showEntitiesModal, setShowEntitiesModal] = useState(false);
  const [showRelationshipsModal, setShowRelationshipsModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal(true);
      }
      // Escape to close modals
      if (e.key === 'Escape') {
        setShowSearchModal(false);
        setShowEntitiesModal(false);
        setShowRelationshipsModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-refresh when files are processing
  useEffect(() => {
    const processingFiles = files.filter(f => f.processing_status === 'processing');
    
    if (processingFiles.length > 0) {
      console.log(`🔄 ${processingFiles.length} file(s) processing, will auto-refresh...`);
      
      // Poll every 5 seconds while files are processing
      const interval = setInterval(async () => {
        console.log('🔄 Polling for updates...');
        await onRefresh();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [files, onRefresh]);

  const handleFileSelect = (file: ProjectFile) => {
    console.log('📂 Selected file:', file.filename, 'Content length:', file.text_content?.length || 0);
    setSelectedFile(file);
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    console.log('📤 Files selected:', selectedFiles.length);

    try {
      // Read file contents
      const fileContents = await Promise.all(
        Array.from(selectedFiles).map(async (file) => {
          try {
            const { text } = await readFileContent(file);
            console.log(`✅ Read ${file.name}: ${text.length} characters`);
            return file;
          } catch (error) {
            console.error(`❌ Failed to read ${file.name}:`, error);
            alert(`Failed to read ${file.name}`);
            return null;
          }
        })
      );

      const validFiles = fileContents.filter(f => f !== null) as File[];
      if (validFiles.length > 0) {
        await onFileUpload(validFiles);
        await onRefresh();
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload files');
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSave = async (content: string, newFilename?: string) => {
    try {
      if (selectedFile) {
        // Update existing file
        await api.put(`/api/v1/files/${selectedFile.id}`, {
          text_content: content
        });
        alert('File saved successfully!');
        await onRefresh();
      } else if (newFilename) {
        // Create new file
        const blob = new Blob([content], { type: 'text/plain' });
        const file = new File([blob], newFilename, { type: 'text/plain' });
        await onFileUpload([file]);
        await onRefresh();
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save file');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* VS Code-like Header */}
      <header className="h-11 bg-card border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <h1 className="font-semibold text-foreground">{project.name}</h1>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{files.length} files</span>
            {files.filter(f => f.processing_status === 'processing').length > 0 && (
              <span className="flex items-center gap-1.5 text-blue-500 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" />
                Processing...
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.pdf,.md,.docx"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {/* Header Actions */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSearchModal(true)}
            className="gap-2"
          >
            <Search className="w-4 h-4" />
            Search
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowEntitiesModal(true)}
            className="gap-2"
          >
            <Users className="w-4 h-4" />
            Entities ({entities.length})
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRelationshipsModal(true)}
            className="gap-2"
          >
            <Network className="w-4 h-4" />
            Relationships ({relationships.length})
          </Button>

          <div className="w-px h-6 bg-border mx-2" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRightSidebar(!showRightSidebar)}
            title={showRightSidebar ? 'Hide AI Panel' : 'Show AI Panel'}
          >
            {showRightSidebar ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMenu(!showMenu)}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - File Explorer */}
        <aside className="w-64 bg-card border-r border-border">
          <EnhancedFileTree
            files={files}
            selectedFileId={selectedFile?.id}
            onFileSelect={(fileId) => {
              const file = files.find(f => f.id === fileId);
              if (file) {
                handleFileSelect(file);
              }
            }}
            onFileDelete={async (fileId) => {
              await onFileDelete(fileId);
              if (selectedFile?.id === fileId) {
                setSelectedFile(null);
              }
              await onRefresh();
            }}
            onFileUpload={onFileUpload}
          />
        </aside>

        {/* Center - Text Editor */}
        <main className="flex-1 overflow-hidden">
          <TextEditor
            file={selectedFile || undefined}
            onSave={handleFileSave}
          />
        </main>

        {/* Right Sidebar - AI Chat (Collapsible) */}
        {showRightSidebar && (
          <aside className="w-80 bg-card border-l border-border">
            <AIChatPanel 
              projectId={project.id} 
              fileId={selectedFile?.id || selectedFile?._id}
              projectName={project.name}
            />
          </aside>
        )}
      </div>

      {/* Modals */}
      <SearchModal
        projectId={project.id}
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onResultClick={(fileId, chunkId) => {
          // Find and open the file
          const file = files.find(f => f.id === fileId);
          if (file) {
            handleFileSelect(file);
          }
        }}
      />

      <EntitiesModal
        entities={entities}
        isOpen={showEntitiesModal}
        onClose={() => setShowEntitiesModal(false)}
        onEntityClick={(entityId) => {
          console.log('Entity clicked:', entityId);
          // TODO: Show entity details or mentions
        }}
      />

      <RelationshipsModal
        relationships={relationships}
        isOpen={showRelationshipsModal}
        onClose={() => setShowRelationshipsModal(false)}
        onRelationshipClick={(relationshipId) => {
          console.log('Relationship clicked:', relationshipId);
          // TODO: Show relationship details
        }}
      />
    </div>
  );
}

