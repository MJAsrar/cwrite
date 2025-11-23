'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Project, Activity, SystemStatus } from '@/types';
import { api } from '@/lib/api';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ProjectOverviewCards from '@/components/dashboard/ProjectOverviewCards';
import RecentActivity from '@/components/dashboard/RecentActivity';
import SystemStatusDisplay from '@/components/dashboard/SystemStatusDisplay';
import CreateProjectModal from '@/components/dashboard/CreateProjectModal';
import { Plus, AlertCircle, FolderOpen } from 'lucide-react';

export default function DashboardClient() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

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

      const [projectsResponse, activityResponse, statusResponse] = await Promise.allSettled([
        api.projects.list(),
        api.get('/api/v1/activity/recent'),
        api.get('/api/v1/system/status')
      ]);

      if (projectsResponse.status === 'fulfilled') {
        setProjects(projectsResponse.value as Project[]);
      }

      if (activityResponse.status === 'fulfilled') {
        setRecentActivity(activityResponse.value as Activity[]);
      }

      if (statusResponse.status === 'fulfilled') {
        setSystemStatus(statusResponse.value as SystemStatus);
      }

    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setError(err.message || 'FAILED TO LOAD DASHBOARD');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (projectData: { name: string; description?: string }) => {
    try {
      const newProject = await api.projects.create(projectData);
      setProjects(prev => [newProject as Project, ...prev]);
      setShowCreateModal(false);
      
      router.push(`/dashboard/projects/${(newProject as Project).id}`);
    } catch (err: any) {
      console.error('Failed to create project:', err);
    }
  };

  const handleProjectClick = (projectId: string) => {
    router.push(`/dashboard/projects/${projectId}`);
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]">
        <div className="w-16 h-16 border-4 border-[#39FF14] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-t-[#39FF14] border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-16 h-16 border-4 border-[#39FF14] flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-t-[#39FF14] border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="border-4 border-[#FF073A] bg-white p-8 text-center">
          <AlertCircle className="w-16 h-16 text-[#FF073A] mx-auto mb-4" />
          <h3 className="text-2xl font-black uppercase text-[#0A0A0A] mb-2">
            ERROR
          </h3>
          <p className="font-mono text-sm text-gray-600 mb-6 uppercase">
            {error}
          </p>
          <button
            onClick={loadDashboardData}
            className="border-4 border-[#FF073A] bg-transparent text-[#FF073A] font-mono px-6 py-3 text-sm uppercase font-bold hover:bg-[#FF073A] hover:text-white transition-all duration-100"
            style={{ boxShadow: '6px 6px 0 0 #FF073A' }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 0 0 #FF073A'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = '6px 6px 0 0 #FF073A'}
          >
            TRY AGAIN
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-5xl md:text-6xl font-black uppercase mb-2 text-white">
              DASHBOARD
            </h1>
            <p className="font-mono text-sm text-gray-400 uppercase">
              MANAGE PROJECTS / EXPLORE CREATIVE UNIVERSE
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="border-4 border-[#39FF14] bg-transparent text-[#39FF14] font-mono px-6 py-3 text-sm uppercase font-bold hover:bg-[#39FF14] hover:text-[#0A0A0A] transition-all duration-100 flex items-center gap-2 w-fit"
            style={{ boxShadow: '6px 6px 0 0 #39FF14' }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 0 0 #39FF14'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = '6px 6px 0 0 #39FF14'}
          >
            <Plus className="w-5 h-5" />
            NEW PROJECT
          </button>
        </div>

        {/* System Status */}
        {systemStatus && (
          <SystemStatusDisplay status={systemStatus} />
        )}

        {/* Projects Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-3xl md:text-4xl font-black uppercase text-white">
              YOUR PROJECTS
            </h2>
            {projects.length > 0 && (
              <button
                onClick={loadDashboardData}
                disabled={loading}
                className="font-mono text-xs uppercase text-gray-400 hover:text-[#39FF14] transition-colors"
              >
                REFRESH
              </button>
            )}
          </div>

          {projects.length === 0 ? (
            <div className="border-4 border-white bg-white p-12 text-center">
              <FolderOpen className="w-20 h-20 text-gray-300 mx-auto mb-6" />
              <h3 className="text-3xl font-black uppercase text-[#0A0A0A] mb-3">
                NO PROJECTS YET
              </h3>
              <p className="font-mono text-sm text-gray-600 mb-8 max-w-md mx-auto uppercase leading-relaxed">
                CREATE YOUR FIRST PROJECT TO START ORGANIZING YOUR WRITING AND DISCOVER INSIGHTS
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="border-4 border-[#39FF14] bg-transparent text-[#39FF14] font-mono px-8 py-4 text-sm uppercase font-bold hover:bg-[#39FF14] hover:text-[#0A0A0A] transition-all duration-100"
                style={{ boxShadow: '6px 6px 0 0 #39FF14' }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 0 0 #39FF14'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = '6px 6px 0 0 #39FF14'}
              >
                CREATE YOUR FIRST PROJECT →
              </button>
            </div>
          ) : (
            <ProjectOverviewCards
              projects={projects}
              onProjectClick={handleProjectClick}
              onRefresh={loadDashboardData}
              loading={loading}
            />
          )}
        </div>

        {/* Recent Activity */}
        {recentActivity && recentActivity.length > 0 && (
          <div>
            <h2 className="text-3xl md:text-4xl font-black uppercase text-white mb-4">
              RECENT ACTIVITY
            </h2>
            <RecentActivity activities={recentActivity} loading={loading} />
          </div>
        )}

        {/* Create Project Modal */}
        <CreateProjectModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateProject}
        />
      </div>
    </DashboardLayout>
  );
}
