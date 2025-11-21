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
import { Plus, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function DashboardClient() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Ensure component only renders on client
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      loadDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load projects, activity, and system status in parallel
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
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (projectData: { name: string; description?: string }) => {
    try {
      const newProject = await api.projects.create(projectData);
      setProjects(prev => [newProject as Project, ...prev]);
      setShowCreateModal(false);
      
      // Navigate to the new project
      router.push(`/dashboard/projects/${(newProject as Project).id}`);
    } catch (err: any) {
      console.error('Failed to create project:', err);
      // Handle error in modal
    }
  };

  const handleProjectClick = (projectId: string) => {
    router.push(`/dashboard/projects/${projectId}`);
  };

  // Don't render until mounted on client to avoid SSR issues
  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="text-center py-16 animate-fade-in">
          <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h3 className="font-serif text-xl font-semibold text-foreground mb-3">
            Something went wrong
          </h3>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            {error}
          </p>
          <Button onClick={loadDashboardData} className="btn-primary">
            Try Again
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Enhanced Header with better spacing */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl lg:text-4xl font-bold text-foreground mb-1">
              Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage your writing projects and explore your creative universe
            </p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary shadow-sm hover:shadow-md transition-shadow"
            size="lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Project
          </Button>
        </div>

        {/* System Status - More compact */}
        {systemStatus && (
          <SystemStatusDisplay status={systemStatus} />
        )}

        {/* Projects Overview with improved design */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl lg:text-2xl font-semibold text-foreground">
              Your Projects
            </h2>
            {!loading && projects.length > 0 && (
              <Button
                onClick={loadDashboardData}
                variant="outline"
                size="sm"
                disabled={loading}
                className="shadow-sm"
              >
                Refresh
              </Button>
            )}
          </div>
          <ProjectOverviewCards
            projects={projects}
            onProjectClick={handleProjectClick}
            onRefresh={loadDashboardData}
            loading={loading}
          />
        </div>

        {/* Recent Activity with improved spacing */}
        {recentActivity && recentActivity.length > 0 && (
          <div>
            <h2 className="font-serif text-xl lg:text-2xl font-semibold text-foreground mb-4">
              Recent Activity
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

