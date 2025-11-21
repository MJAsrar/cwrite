'use client';

import { useState } from 'react';
import { Project, ProjectFile, Entity, Relationship } from '@/types';
import WorkspaceLayout from './WorkspaceLayout';
import FileTreeSidebar from './FileTreeSidebar';
import EntityBrowser from './EntityBrowser';
import MainContentArea from './MainContentArea';
import RelationshipVisualization from './RelationshipVisualization';
import TextEditor from './TextEditor';
import AIChatPanel from './AIChatPanel';
import { readFileContent } from '@/lib/fileReader';
import { api } from '@/lib/api';

interface ProjectWorkspaceProps {
  project: Project;
  files: ProjectFile[];
  entities: Entity[];
  relationships: Relationship[];
  onFileUpload: (files: File[]) => Promise<void>;
  onFileDelete: (fileId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

interface LocalFile {
  id: string;
  filename: string;
  content: string;
  isLocal: boolean; // Not yet uploaded
}

type SidebarView = 'files' | 'entities' | 'relationships';
type MainView = 'welcome' | 'file' | 'entity' | 'relationships';

interface ViewState {
  sidebar: SidebarView;
  main: MainView;
  selectedFileId?: string;
  selectedEntityId?: string;
}

export default function ProjectWorkspace({
  project,
  files,
  entities,
  relationships,
  onFileUpload,
  onFileDelete,
  onRefresh
}: ProjectWorkspaceProps) {
  const [viewState, setViewState] = useState<ViewState>({
    sidebar: 'files',
    main: 'file' // Start with editor by default
  });
  const [localFiles, setLocalFiles] = useState<Map<string, LocalFile>>(new Map());
  const [uploadedFileContents, setUploadedFileContents] = useState<Map<string, string>>(new Map());

  const handleSidebarViewChange = (view: SidebarView) => {
    setViewState(prev => ({ ...prev, sidebar: view }));
  };

  const handleFileSelect = (fileId: string) => {
    setViewState(prev => ({
      ...prev,
      main: 'file',
      selectedFileId: fileId,
      selectedEntityId: undefined
    }));
  };

  const handleEntitySelect = (entityId: string) => {
    setViewState(prev => ({
      ...prev,
      main: 'entity',
      selectedEntityId: entityId,
      selectedFileId: undefined
    }));
  };

  const handleRelationshipsView = () => {
    setViewState(prev => ({
      ...prev,
      main: 'relationships',
      selectedFileId: undefined,
      selectedEntityId: undefined
    }));
  };

  const renderSidebar = () => {
    switch (viewState.sidebar) {
      case 'files':
        return (
          <FileTreeSidebar
            project={project}
            files={files}
            onFileSelect={handleFileSelect}
            onFileUpload={handleFileUploadWithContent}
            onFileDelete={onFileDelete}
            selectedFileId={viewState.selectedFileId}
          />
        );
      case 'entities':
        return (
          <EntityBrowser
            entities={entities}
            onEntitySelect={handleEntitySelect}
            selectedEntityId={viewState.selectedEntityId}
          />
        );
      case 'relationships':
        return (
          <RelationshipVisualization
            entities={entities}
            relationships={relationships}
            onEntitySelect={handleEntitySelect}
            onViewChange={handleRelationshipsView}
          />
        );
      default:
        return null;
    }
  };

  // Enhanced file upload handler that reads content
  const handleFileUploadWithContent = async (uploadFiles: File[]) => {
    console.log('📤 Starting file upload, files:', uploadFiles.length);
    
    try {
      // Read all file contents
      console.log('📖 Reading file contents...');
      const fileContents = await Promise.all(
        uploadFiles.map(async (file) => {
          try {
            console.log(`📄 Reading: ${file.name}`);
            const { text, filename } = await readFileContent(file);
            console.log(`✅ Read ${filename}: ${text.length} characters`);
            return { file, text, filename };
          } catch (error) {
            console.error(`❌ Failed to read ${file.name}:`, error);
            alert(`Failed to read ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return null;
          }
        })
      );

      const validFileContents = fileContents.filter(fc => fc !== null) as { file: File; text: string; filename: string }[];
      
      if (validFileContents.length === 0) {
        console.log('⚠️ No valid files to upload');
        return;
      }

      console.log(`📤 Uploading ${validFileContents.length} files to backend...`);
      
      // Call the original upload handler
      await onFileUpload(validFileContents.map(fc => fc.file));
      
      console.log('✅ Upload successful, refreshing...');
      
      // After successful upload, refresh to get the new files with IDs
      await onRefresh();
      
      console.log('✅ Upload complete!');
    } catch (error) {
      console.error('❌ Upload error:', error);
      alert(`Failed to upload files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleFileSave = async (content: string, newFilename?: string) => {
    try {
      if (viewState.selectedFileId) {
        // Update existing file
        await api.put(`/api/v1/files/${viewState.selectedFileId}`, {
          text_content: content
        });
        alert('File saved successfully!');
        await onRefresh();
      } else if (newFilename) {
        // Create new file
        const blob = new Blob([content], { type: 'text/plain' });
        const file = new File([blob], newFilename, { type: 'text/plain' });
        await handleFileUploadWithContent([file]);
        alert('File created and uploaded successfully!');
      }
    } catch (error) {
      console.error('Save error:', error);
      throw error; // Let TextEditor handle the error
    }
  };

  const selectedFile = viewState.selectedFileId 
    ? files.find(f => f.id === viewState.selectedFileId)
    : undefined;

  return (
    <WorkspaceLayout
      project={project}
      sidebarView={viewState.sidebar}
      onSidebarViewChange={handleSidebarViewChange}
      sidebar={renderSidebar()}
      rightSidebar={<AIChatPanel projectName={project.name} />}
      onRefresh={onRefresh}
    >
      {viewState.main === 'file' && selectedFile ? (
        <TextEditor 
          file={selectedFile}
          onSave={handleFileSave}
        />
      ) : (
        <MainContentArea
          project={project}
          viewState={viewState}
          files={files}
          entities={entities}
          relationships={relationships}
          onFileSelect={handleFileSelect}
          onEntitySelect={handleEntitySelect}
        />
      )}
    </WorkspaceLayout>
  );
}