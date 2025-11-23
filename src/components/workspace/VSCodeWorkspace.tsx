'use client';

import { useState, useRef, useEffect } from 'react';
import { Project, ProjectFile, Entity, Relationship } from '@/types';
import { 
  FileText, 
  Upload,
  Network,
  Users,
  PanelRightOpen,
  PanelRightClose,
  Search,
  Settings,
  Loader2
} from 'lucide-react';
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
  const [showMenu, setShowMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal(true);
      }
      if (e.key === 'Escape') {
        setShowSearchModal(false);
        setShowEntitiesModal(false);
        setShowRelationshipsModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const processingFiles = files.filter(f => f.processing_status === 'processing');
    
    if (processingFiles.length > 0) {
      const interval = setInterval(async () => {
        await onRefresh();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [files, onRefresh]);

  const handleFileSelect = (file: ProjectFile) => {
    setSelectedFile(file);
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    try {
      const fileContents = await Promise.all(
        Array.from(selectedFiles).map(async (file) => {
          try {
            const { text } = await readFileContent(file);
            return file;
          } catch (error) {
            console.error(`Failed to read ${file.name}:`, error);
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

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSave = async (content: string, newFilename?: string) => {
    try {
      if (selectedFile) {
        await api.put(`/api/v1/files/${selectedFile.id}`, {
          text_content: content
        });
        alert('File saved successfully!');
        await onRefresh();
      } else if (newFilename) {
        const blob = new Blob([content], { type: 'text/plain' });
        const file = new File([blob], newFilename, { type: 'text/plain' });
        await onFileUpload([file]);
        await onRefresh();
      }
    } catch (error: any) {
      console.error('Save error:', error);
      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to save file';
      alert(errorMessage);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#0A0A0A]">
      {/* Header */}
      <header className="h-14 bg-white border-b-4 border-[#0A0A0A] flex items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-black uppercase text-[#0A0A0A]">{project.name}</h1>
          <div className="flex items-center gap-4 font-mono text-xs text-gray-600 uppercase">
            <span className="font-bold">{files.length} FILES</span>
            {files.filter(f => f.processing_status === 'processing').length > 0 && (
              <span className="flex items-center gap-2 text-[#39FF14]">
                <div className="w-3 h-3 border-2 border-t-[#39FF14] border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                PROCESSING...
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.pdf,.md,.docx"
            onChange={handleFileInputChange}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 border-4 border-[#0A0A0A] bg-transparent text-[#0A0A0A] font-mono text-xs uppercase font-bold hover:bg-[#0A0A0A] hover:text-white transition-all duration-100"
            style={{ boxShadow: '4px 4px 0 0 #0A0A0A' }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 0 0 #0A0A0A'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = '4px 4px 0 0 #0A0A0A'}
          >
            <Upload className="w-4 h-4" />
            UPLOAD
          </button>

          <button
            onClick={() => setShowSearchModal(true)}
            className="flex items-center gap-2 px-4 py-2 border-4 border-[#0A0A0A] bg-transparent text-[#0A0A0A] font-mono text-xs uppercase font-bold hover:bg-[#39FF14] transition-all duration-100"
          >
            <Search className="w-4 h-4" />
            SEARCH
          </button>

          <button
            onClick={() => setShowEntitiesModal(true)}
            className="flex items-center gap-2 px-4 py-2 border-4 border-[#0A0A0A] bg-transparent text-[#0A0A0A] font-mono text-xs uppercase font-bold hover:bg-[#39FF14] transition-all duration-100"
          >
            <Users className="w-4 h-4" />
            ENTITIES ({entities.length})
          </button>

          <button
            onClick={() => setShowRelationshipsModal(true)}
            className="flex items-center gap-2 px-4 py-2 border-4 border-[#0A0A0A] bg-transparent text-[#0A0A0A] font-mono text-xs uppercase font-bold hover:bg-[#39FF14] transition-all duration-100"
          >
            <Network className="w-4 h-4" />
            RELATIONS ({relationships.length})
          </button>

          <div className="w-1 h-8 bg-[#0A0A0A] mx-2" />

          <button
            onClick={() => setShowRightSidebar(!showRightSidebar)}
            className="p-2 text-[#0A0A0A] hover:text-[#39FF14] transition-colors"
            title={showRightSidebar ? 'HIDE AI PANEL' : 'SHOW AI PANEL'}
          >
            {showRightSidebar ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
          </button>

          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-[#0A0A0A] hover:text-[#39FF14] transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - File Explorer */}
        <aside className="w-64 bg-white border-r-4 border-[#0A0A0A]">
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
            projectId={project.id}
            onSave={handleFileSave}
          />
        </main>

        {/* Right Sidebar - AI Chat */}
        {showRightSidebar && (
          <aside className="w-80 bg-white border-l-4 border-[#0A0A0A]">
            <AIChatPanel 
              projectId={project.id} 
              fileId={selectedFile?.id}
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
        }}
      />

      <RelationshipsModal
        relationships={relationships}
        isOpen={showRelationshipsModal}
        onClose={() => setShowRelationshipsModal(false)}
        onRelationshipClick={(relationshipId) => {
          console.log('Relationship clicked:', relationshipId);
        }}
      />
    </div>
  );
}
