'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Project, ProjectFile, Entity, Relationship } from '@/types';
import { api } from '@/lib/api';
import VSCodeWorkspace from '@/components/workspace/VSCodeWorkspace';
import { AlertCircle, RefreshCcw, Feather } from 'lucide-react';

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
    if (projectId) loadProjectData();
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [pRes, fRes, eRes, rRes] = await Promise.allSettled([
        api.projects.get(projectId),
        api.files.list(projectId),
        api.entities.list(projectId),
        api.get(`/api/v1/projects/${projectId}/relationships`)
      ]);

      if (pRes.status === 'fulfilled') setProject(pRes.value as Project);
      else throw new Error('Failed to load project');
      if (fRes.status === 'fulfilled') setFiles(fRes.value as ProjectFile[]);
      if (eRes.status === 'fulfilled') setEntities(eRes.value as Entity[]);
      if (rRes.status === 'fulfilled') setRelationships(rRes.value as Relationship[]);
    } catch (err: any) {
      setError(err.message || 'Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (uploadedFiles: File[]) => {
    try {
      const results = await Promise.allSettled(uploadedFiles.map(f => api.files.upload(projectId, f)));
      const newFiles = results.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<any>).value);
      const fails = results.filter(r => r.status === 'rejected');
      if (fails.length > 0) {
        const msgs = fails.map((r, i) => `File ${i + 1}: ${(r as PromiseRejectedResult).reason?.message || 'Unknown error'}`);
        alert(`Upload failed:\n\n${msgs.join('\n')}`);
      }
      setFiles(prev => [...prev, ...newFiles]);
      setProject(await api.projects.get(projectId) as Project);
    } catch (err: any) {
      alert(`Upload failed: ${err.message || 'Unknown error'}`);
    }
  };

  const handleFileDelete = async (fileId: string) => {
    try {
      await api.files.delete(fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
      setProject(await api.projects.get(projectId) as Project);
    } catch (err: any) {
      console.error('Failed to delete file:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FDF6E3]">
        <div className="flex flex-col items-center gap-3">
          <Feather className="w-10 h-10 text-stone-400 animate-pulse" />
          <p className="text-sm text-stone-400 font-medium">Opening project…</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FDF6E3]">
        <div className="rounded-2xl p-8 text-center max-w-sm bg-white border border-stone-200 shadow-sm">
          <AlertCircle className="w-10 h-10 mx-auto mb-4 text-red-400" />
          <h3 className="text-lg font-bold mb-2 text-stone-900" style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>
            Unable to load project
          </h3>
          <p className="text-sm mb-6 text-stone-500">{error || 'Project not found'}</p>
          <button onClick={loadProjectData}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition">
            <RefreshCcw className="w-4 h-4" /> Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <VSCodeWorkspace
      project={project} files={files} entities={entities} relationships={relationships}
      onFileUpload={handleFileUpload} onFileDelete={handleFileDelete} onRefresh={loadProjectData}
    />
  );
}
