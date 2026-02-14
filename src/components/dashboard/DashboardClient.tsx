'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Project } from '@/types';
import { api } from '@/lib/api';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ProjectOverviewCards from '@/components/dashboard/ProjectOverviewCards';
import CreateProjectModal from '@/components/dashboard/CreateProjectModal';
import {
  Plus,
  AlertCircle,
  FolderOpen,
  RefreshCcw,
  FileText,
  ExternalLink,
  LayoutGrid,
  List,
} from 'lucide-react';

// Template definitions
const templates = [
  { name: 'Blank Document', icon: <Plus className="w-8 h-8" /> },
  { name: 'Novel Draft', icon: <FileText className="w-8 h-8" /> },
  { name: 'Essay Template', icon: <FileText className="w-8 h-8" /> },
  { name: 'Meeting Notes', icon: <FileText className="w-8 h-8" /> },
  { name: 'Business Letter', icon: <FileText className="w-8 h-8" /> },
];

export default function DashboardClient() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      loadDashboardData();
    }
  }, [mounted]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const projectsResponse = await api.projects.list();
      setProjects(projectsResponse as Project[]);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load your projects. Please ensure you have a stable connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (projectData: { name: string; description?: string; settings?: { genre: string } }) => {
    try {
      const newProject = await api.projects.create(projectData);
      setProjects(prev => [newProject as Project, ...prev]);
      setShowCreateModal(false);
      router.push(`/dashboard/projects/${(newProject as Project).id}`);
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  const handleProjectClick = (projectId: string) => {
    router.push(`/dashboard/projects/${projectId}`);
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FCFAF7]">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: '#D97706', borderTopColor: 'transparent' }}
          />
          <p className="text-sm font-medium text-stone-500">Starting up…</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: '#D97706', borderTopColor: 'transparent' }}
            />
            <p className="text-sm font-medium text-stone-500">Loading your universe…</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <div
            className="rounded-2xl p-8 text-center max-w-lg mx-auto mt-12"
            style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}
          >
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-xl font-bold mb-2 text-red-900">
              Unable to Load Dashboard
            </h3>
            <p className="text-sm mb-6 max-w-sm mx-auto text-red-700">{error}</p>
            <button
              onClick={loadDashboardData}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl border transition-all bg-white text-red-700 border-red-200 hover:bg-red-50"
            >
              <RefreshCcw className="w-4 h-4" /> Try Again
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Templates Section */}
      <section className="p-6 sm:p-8 bg-stone-50 border-b border-stone-200">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
              Start a new project
            </h2>
            <button className="text-sm text-amber-900 font-medium hover:underline flex items-center gap-1">
              Template Gallery <ExternalLink size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
            {templates.map((template, idx) => (
              <button
                key={idx}
                onClick={() => setShowCreateModal(true)}
                className="group flex flex-col items-start gap-3"
              >
                <div className="w-full aspect-[3/4] bg-white border border-stone-200 rounded-lg shadow-sm group-hover:shadow-md group-hover:border-amber-900/30 transition-all flex items-center justify-center text-stone-300 group-hover:text-amber-900">
                  {template.icon}
                </div>
                <span className="text-sm font-medium text-stone-700">{template.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Projects List */}
      <section className="p-6 sm:p-8 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2
              className="text-xl font-semibold text-stone-900"
              style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
            >
              Recent Projects
              {projects.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
                  {projects.length}
                </span>
              )}
            </h2>
            <div className="flex items-center gap-3">
              {projects.length > 0 && (
                <button
                  onClick={loadDashboardData}
                  disabled={loading}
                  className="flex items-center gap-1.5 text-xs font-medium text-stone-400 hover:text-amber-900 transition-colors mr-2"
                >
                  <RefreshCcw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              )}
              <div className="flex items-center bg-stone-100 p-1 rounded-lg border border-stone-200">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-amber-900' : 'text-stone-500 hover:text-stone-700'}`}
                >
                  <LayoutGrid size={18} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-amber-900' : 'text-stone-500 hover:text-stone-700'}`}
                >
                  <List size={18} />
                </button>
              </div>
            </div>
          </div>

          {projects.length === 0 ? (
            <div className="rounded-2xl p-14 text-center border-2 border-dashed border-stone-200">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ background: 'linear-gradient(135deg, #FDE68A, #F59E0B)' }}
              >
                <FolderOpen className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-stone-900">
                No projects yet
              </h3>
              <p className="text-sm mb-8 max-w-sm mx-auto text-stone-500">
                Create your first project to start organizing your writing, characters, and generating deep insights.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-xl text-white transition-all duration-200 shadow-sm bg-amber-900 hover:bg-amber-950"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                Create your first project
              </button>
            </div>
          ) : (
            <ProjectOverviewCards
              projects={projects}
              onProjectClick={handleProjectClick}
              onRefresh={loadDashboardData}
              loading={loading}
              viewMode={viewMode}
            />
          )}
        </div>
      </section>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-amber-900 text-white rounded-full shadow-xl hover:shadow-2xl hover:scale-110 transition-all flex items-center justify-center z-30"
      >
        <Plus size={28} />
      </button>

      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateProject}
      />
    </DashboardLayout>
  );
}
