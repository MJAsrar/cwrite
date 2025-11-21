'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Filter, Grid, List, AlertCircle } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ProjectsGrid from '@/components/projects/ProjectsGrid';
import ProjectSearchBar from '@/components/projects/ProjectSearchBar';
import CreateProjectModal from '@/components/dashboard/CreateProjectModal';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import Button from '@/components/ui/Button';
import { Project } from '@/types';
import { api } from '@/lib/api';
import { useProjectFilters } from '@/hooks/useProjectFilters';
import { ProjectFilters } from '@/lib/projectFilters';

export default function ProjectsClient() {
  const [mounted, setMounted] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Use the project filters hook with URL synchronization
  // syncWithURL is always true on client-side (this is a client component)
  const {
    filterState,
    filteredProjects,
    isFiltering,
    hasActiveFilters: hasFilters,
    filterSummary,
    setSearchQuery,
    setFilters,
    resetAllFilters,
    getFilteredCount,
    getTotalCount
  } = useProjectFilters({
    projects,
    syncWithURL: true,
    debounceMs: 300
  });

  // Load projects on component mount - runs only once
  useEffect(() => {
    setMounted(true);
    loadProjects(); // always runs once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const projectsData = await api.projects.list();
      // Ensure projectsData is an array
      const projects = Array.isArray(projectsData) ? projectsData : [];
      setProjects(projects);
    } catch (err: any) {
      console.error('Failed to load projects:', err);
      setError(err.message || 'Failed to load projects. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleFilter = (newFilters: ProjectFilters) => {
    setFilters(newFilters);
  };

  const handleProjectClick = (projectId: string) => {
    window.location.href = `/dashboard/projects/${projectId}`;
  };

  const handleProjectDelete = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      await api.projects.delete(projectId);
      // Reload projects after deletion
      await loadProjects();
    } catch (err: any) {
      console.error('Failed to delete project:', err);
      alert('Failed to delete project. Please try again.');
    }
  };

  const handleProjectCreated = async (projectData: { name: string; description?: string }) => {
    try {
      await api.projects.create(projectData);
      setShowCreateModal(false);
      // Reload projects list
      loadProjects();
    } catch (err: any) {
      console.error('Failed to create project:', err);
      throw err; // Re-throw to let modal handle the error
    }
  };

  const handleRetry = () => {
    loadProjects();
  };

  // Don't render until mounted on client to avoid SSR issues
  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-secondary-900 dark:text-secondary-100">
                Projects
              </h1>
              <p className="text-secondary-600 dark:text-secondary-400 mt-1">
                Manage your writing projects and track their progress
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* View mode toggle */}
              <div className="flex items-center bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode('grid')}
                  className={`rounded-md ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-secondary-700 text-secondary-900 dark:text-secondary-100 shadow-sm'
                      : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-secondary-100'
                  }`}
                  aria-label="Grid view"
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode('list')}
                  className={`rounded-md ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-secondary-700 text-secondary-900 dark:text-secondary-100 shadow-sm'
                      : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-secondary-100'
                  }`}
                  aria-label="List view"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>

              {/* Create project button */}
              <Button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Project
              </Button>
            </div>
          </div>

          {/* Search and filters */}
          <ProjectSearchBar
            onSearch={handleSearch}
            onFilter={handleFilter}
            filters={filterState.filters}
            placeholder="Search projects by name or description..."
          />

          {/* Filter summary */}
          {hasFilters && (
            <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  <span className="text-sm font-medium text-primary-800 dark:text-primary-200">
                    Active Filters:
                  </span>
                  <span className="text-sm text-primary-700 dark:text-primary-300">
                    {filterSummary.join(' • ')}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-primary-600 dark:text-primary-400">
                    {getFilteredCount()} of {getTotalCount()} projects
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetAllFilters}
                    className="text-primary-700 dark:text-primary-300 hover:text-primary-900 dark:hover:text-primary-100"
                  >
                    Clear All
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                    Error loading projects
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {error}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetry}
                    className="mt-3 border-red-300 text-red-700 hover:bg-red-50"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Projects grid */}
          <ProjectsGrid
            projects={filteredProjects}
            loading={loading || isFiltering}
            viewMode={viewMode}
            onProjectClick={handleProjectClick}
            onProjectDelete={handleProjectDelete}
            onRefresh={loadProjects}
          />

          {/* Create project modal */}
          <CreateProjectModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleProjectCreated}
          />
        </div>
      </DashboardLayout>
    </ErrorBoundary>
  );
}

