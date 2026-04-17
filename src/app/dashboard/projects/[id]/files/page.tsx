'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

// Disable static generation for this page
export const dynamic = 'force-dynamic';
import { Project, ProjectFile } from '@/types';
import { api } from '@/lib/api';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FileProcessingStatus from '@/components/workspace/FileProcessingStatus';
import FileUploadZone from '@/components/workspace/FileUploadZone';
import SearchContextIndicator from '@/components/search/SearchContextIndicator';
import FilePreview from '@/components/workspace/FilePreview';
import { ArrowLeft, FileText, PlusCircle } from 'lucide-react';
import Link from 'next/link';

function ProjectFilesPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [newFileName, setNewFileName] = useState('untitled');
  const [creatingFile, setCreatingFile] = useState(false);
  const [createFileError, setCreateFileError] = useState<string | null>(null);

  // Get file ID from URL params if navigating from search
  const fileParam = searchParams.get('file');
  const highlightParam = searchParams.get('highlight');
  const contextParam = searchParams.get('context');

  useEffect(() => {
    if (projectId) {
      loadProjectData();
    }
  }, [projectId]);

  // Handle file selection from URL params
  useEffect(() => {
    if (fileParam && files.length > 0) {
      const file = files.find(f => f.id === fileParam);
      if (file) {
        setSelectedFile(file);
      }
    }
  }, [fileParam, files]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [projectResponse, filesResponse] = await Promise.allSettled([
        api.projects.get(projectId),
        api.files.list(projectId)
      ]);

      if (projectResponse.status === 'fulfilled') {
        setProject(projectResponse.value as Project);
      } else {
        throw new Error('Failed to load project');
      }

      if (filesResponse.status === 'fulfilled') {
        setFiles(filesResponse.value as ProjectFile[]);
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
      const uploadPromises = uploadedFiles.map(file => 
        api.files.upload(projectId, file)
      );
      
      const results = await Promise.allSettled(uploadPromises);
      const newFiles = results
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<any>).value);
      
      setFiles(prev => [...prev, ...newFiles]);
      
      // Refresh project data to get updated stats
      const updatedProject = await api.projects.get(projectId);
      setProject(updatedProject as Project);
      setCreateFileError(null);
      
    } catch (err: any) {
      console.error('Failed to upload files:', err);
      setCreateFileError(err?.message || 'Failed to upload file. Please try again.');
    }
  };

  const handleCreateNewFile = async () => {
    const sanitizedName = newFileName.trim().replace(/[^a-zA-Z0-9 _-]/g, '');
    if (!sanitizedName) {
      setCreateFileError('Please enter a valid file name.');
      return;
    }

    setCreatingFile(true);
    setCreateFileError(null);

    try {
      const filename = sanitizedName.toLowerCase().endsWith('.txt') ? sanitizedName : `${sanitizedName}.txt`;
      const starterContent = 'Start writing here...\n';
      const newFile = new File([starterContent], filename, { type: 'text/plain' });

      await handleFileUpload([newFile]);
      setNewFileName('untitled');
    } catch (err: any) {
      setCreateFileError(err?.message || 'Failed to create new file.');
    } finally {
      setCreatingFile(false);
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

  const handleFileSelect = (fileId: string) => {
    router.push(`/dashboard/projects/${projectId}?file=${fileId}`);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !project) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error || 'Project not found'}</p>
          <Link href="/dashboard" className="text-primary-600 hover:text-primary-700 font-medium">
            Return to Dashboard
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Search Context Indicator */}
        {contextParam === 'search' && (
          <SearchContextIndicator />
        )}

        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link
            href={`/dashboard/projects/${projectId}`}
            className="flex items-center text-secondary-600 hover:text-secondary-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Project
          </Link>
          
          <div className="h-4 w-px bg-secondary-300" />
          
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">
              {selectedFile ? `File: ${selectedFile.filename}` : 'File Management'}
            </h1>
            <p className="text-secondary-600">{project.name}</p>
          </div>
        </div>

        {selectedFile ? (
          /* File Preview */
          <div className="bg-white rounded-lg border border-secondary-200 overflow-hidden">
            <FilePreview
              file={selectedFile}
              onClose={() => {
                setSelectedFile(null);
                // Remove file param from URL
                const url = new URL(window.location.href);
                url.searchParams.delete('file');
                url.searchParams.delete('highlight');
                url.searchParams.delete('context');
                url.searchParams.delete('searchId');
                window.history.replaceState({}, '', url.toString());
              }}
            />
          </div>
        ) : (
          <>
            {/* Upload Zone */}
            <div className="bg-white rounded-lg border border-secondary-200 p-6">
              <h2 className="text-lg font-semibold text-secondary-900 mb-4">Files</h2>

              <div className="mb-6 rounded-lg border border-secondary-200 bg-secondary-50 p-4">
                <h3 className="text-sm font-semibold text-secondary-900 mb-3 flex items-center gap-2">
                  <PlusCircle className="w-4 h-4" />
                  Create New File
                </h3>

                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder="Enter file name"
                    className="flex-1 rounded-md border border-secondary-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleCreateNewFile}
                    disabled={creatingFile}
                    className="rounded-md bg-primary-600 text-white px-4 py-2 text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                  >
                    {creatingFile ? 'Creating...' : 'Create .txt file'}
                  </button>
                </div>

                {createFileError && (
                  <p className="mt-2 text-sm text-red-600">{createFileError}</p>
                )}
              </div>

              <h3 className="text-sm font-semibold text-secondary-900 mb-3">Or Upload Existing Files</h3>
              <FileUploadZone
                onFileUpload={handleFileUpload}
                maxFiles={10}
                acceptedTypes={['.txt', '.md', '.docx']}
              />
            </div>

            {/* File Processing Status */}
            <FileProcessingStatus
              files={files}
              onFileSelect={handleFileSelect}
              onFileDelete={handleFileDelete}
              onRefresh={loadProjectData}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function ProjectFilesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    }>
      <ProjectFilesPageContent />
    </Suspense>
  );
}