'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Project, ProjectFile, Entity, Relationship } from '@/types';
import { api } from '@/lib/api';
import VSCodeWorkspace from '@/components/workspace/VSCodeWorkspace';

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
    try {
      const uploadPromises = uploadedFiles.map(file => api.files.upload(projectId, file));
      const results = await Promise.allSettled(uploadPromises);
      
      const newFiles = results
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<any>).value);
      
      const failedResults = results.filter(result => result.status === 'rejected');
      if (failedResults.length > 0) {
        const errorMessages: string[] = [];
        failedResults.forEach((result, index) => {
          const reason = (result as PromiseRejectedResult).reason;
          let errorMsg = 'Unknown error';
          if (reason?.message) {
            errorMsg = reason.message;
          } else if (reason?.detail) {
            errorMsg = reason.detail;
          }
          errorMessages.push(`File ${index + 1}: ${errorMsg}`);
        });
        
        alert(`Upload failed:\n\n${errorMessages.join('\n\n')}`);
      }
      
      setFiles(prev => [...prev, ...newFiles]);
      
      const updatedProject = await api.projects.get(projectId);
      setProject(updatedProject as Project);
      
    } catch (err: any) {
      console.error('Failed to upload files:', err);
      alert(`Upload failed: ${err.message || 'Unknown error'}`);
    }
  };

  const handleFileDelete = async (fileId: string) => {
    try {
      await api.files.delete(fileId);
      setFiles(prev => prev.filter(file => file.id !== fileId));
      
      const updatedProject = await api.projects.get(projectId);
      setProject(updatedProject as Project);
      
    } catch (err: any) {
      console.error('Failed to delete file:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#39FF14] flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 border-4 border-t-[#39FF14] border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
          </div>
          <p className="font-mono text-sm text-[#39FF14] uppercase">LOADING PROJECT...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]">
        <div className="border-4 border-[#FF073A] bg-white p-8 text-center">
          <p className="font-mono text-sm text-[#FF073A] uppercase mb-4">{error || 'PROJECT NOT FOUND'}</p>
          <button 
            onClick={loadProjectData}
            className="border-4 border-[#FF073A] bg-transparent text-[#FF073A] font-mono px-6 py-3 text-sm uppercase font-bold hover:bg-[#FF073A] hover:text-white transition-all duration-100"
            style={{ boxShadow: '6px 6px 0 0 #FF073A' }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 0 0 #FF073A'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = '6px 6px 0 0 #FF073A'}
          >
            TRY AGAIN
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
