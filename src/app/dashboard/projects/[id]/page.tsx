'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Project, ProjectFile, Entity, Relationship } from '@/types';
import { api } from '@/lib/api';
import VSCodeWorkspace from '@/components/workspace/VSCodeWorkspace';
import { Loader2 } from 'lucide-react';

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.id as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      loadProjectData();
    }
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load project data in parallel
      const [projectResponse, filesResponse, entitiesResponse, relationshipsResponse] = await Promise.allSettled([
        api.projects.get(projectId),
        api.files.list(projectId),
        api.entities.list(projectId),
        api.get(`/api/v1/projects/${projectId}/relationships`)
      ]);

      if (projectResponse.status === 'fulfilled') {
        setProject(projectResponse.value as Project);
      } else {
        throw new Error('Failed to load project');
      }

      if (filesResponse.status === 'fulfilled') {
        setFiles(filesResponse.value as ProjectFile[]);
      }

      if (entitiesResponse.status === 'fulfilled') {
        setEntities(entitiesResponse.value as Entity[]);
      }

      if (relationshipsResponse.status === 'fulfilled') {
        setRelationships(relationshipsResponse.value as Relationship[]);
      }

    } catch (err: any) {
      console.error('Failed to load project data:', err);
      setError(err.message || 'Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (uploadedFiles: File[]) => {
    console.log('🔵 Page: handleFileUpload called with', uploadedFiles.length, 'files');
    try {
      const uploadPromises = uploadedFiles.map(file => {
        console.log(`🔵 Uploading file via API: ${file.name}`);
        return api.files.upload(projectId, file);
      });
      
      console.log('🔵 Waiting for uploads...');
      const results = await Promise.allSettled(uploadPromises);
      
      const newFiles = results
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<any>).value);
      
      console.log(`🔵 Upload results: ${newFiles.length} successful`);
      
      const failedResults = results.filter(result => result.status === 'rejected');
      if (failedResults.length > 0) {
        const errorMessages: string[] = [];
        failedResults.forEach((result, index) => {
          const reason = (result as PromiseRejectedResult).reason;
          console.error(`🔵 Failed upload ${index + 1}:`, reason);
          
          // Extract meaningful error message
          let errorMsg = 'Unknown error';
          if (reason?.message) {
            errorMsg = reason.message;
          } else if (reason?.detail) {
            errorMsg = reason.detail;
          } else if (reason?.error) {
            errorMsg = reason.error;
          }
          
          // Check for specific error types
          if (reason?.status === 409 || errorMsg.includes('already exists')) {
            errorMsg = 'File already exists in this project. Please rename or delete the existing file first.';
          }
          
          errorMessages.push(`File ${index + 1}: ${errorMsg}`);
        });
        
        alert(`Upload failed:\n\n${errorMessages.join('\n\n')}`);
      }
      
      setFiles(prev => [...prev, ...newFiles]);
      
      // Refresh project data to get updated stats
      const updatedProject = await api.projects.get(projectId);
      setProject(updatedProject as Project);
      
      console.log('🔵 Upload complete!');
      
    } catch (err: any) {
      console.error('🔵 Failed to upload files:', err);
      alert(`Upload failed: ${err.message || 'Unknown error'}`);
    }
  };

  const handleFileDelete = async (fileId: string) => {
    try {
      await api.files.delete(fileId);
      setFiles(prev => prev.filter(file => file.id !== fileId));
      
      // Refresh project data to get updated stats
      const updatedProject = await api.projects.get(projectId);
      setProject(updatedProject as Project);
      
    } catch (err: any) {
      console.error('Failed to delete file:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-600" />
          <p className="text-secondary-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Project not found'}</p>
          <button 
            onClick={loadProjectData}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <VSCodeWorkspace
      project={project}
      files={files}
      entities={entities}
      relationships={relationships}
      onFileUpload={handleFileUpload}
      onFileDelete={handleFileDelete}
      onRefresh={loadProjectData}
    />
  );
}