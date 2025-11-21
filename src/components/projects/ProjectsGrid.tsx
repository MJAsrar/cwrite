'use client';

import { FolderOpen } from 'lucide-react';
import Button from '@/components/ui/Button';
import ProjectCard from './ProjectCard';
import { Project } from '@/types';

interface ProjectsGridProps {
  projects: Project[];
  loading: boolean;
  viewMode: 'grid' | 'list';
  onProjectClick: (projectId: string) => void;
  onProjectDelete: (projectId: string) => void;
  onRefresh: () => void;
}



function LoadingSkeleton({ viewMode }: { viewMode: 'grid' | 'list' }) {
  const skeletons = Array.from({ length: viewMode === 'grid' ? 6 : 4 }, (_, i) => i);

  if (viewMode === 'list') {
    return (
      <div className="space-y-4">
        {skeletons.map((i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-muted rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-muted rounded w-1/3" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
              <div className="flex gap-6">
                <div className="h-4 bg-muted rounded w-16" />
                <div className="h-4 bg-muted rounded w-16" />
                <div className="h-4 bg-muted rounded w-20" />
              </div>
              <div className="h-6 bg-muted rounded-full w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {skeletons.map((i) => (
        <div key={i} className="bg-card border border-border rounded-2xl p-6 animate-pulse">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-muted rounded-xl" />
            <div className="w-8 h-8 bg-muted rounded" />
          </div>
          <div className="space-y-3 mb-4">
            <div className="h-6 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-4">
              <div className="h-4 bg-muted rounded w-12" />
              <div className="h-4 bg-muted rounded w-12" />
            </div>
            <div className="h-6 bg-muted rounded-full w-16" />
          </div>
          <div className="flex justify-between pt-4 border-t border-border">
            <div className="h-3 bg-muted rounded w-20" />
            <div className="h-3 bg-muted rounded w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="text-center py-16 animate-fade-in">
      <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
        <FolderOpen className="w-12 h-12 text-muted-foreground" />
      </div>
      
      <h3 className="font-serif text-2xl font-semibold text-foreground mb-3">
        No projects found
      </h3>
      
      <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
        You haven't created any projects yet. Create your first project to start organizing your writing and unlock the power of AI-assisted content analysis.
      </p>
      
      <Button onClick={onRefresh} variant="outline" className="rounded-full">
        Refresh Projects
      </Button>
    </div>
  );
}

export default function ProjectsGrid({
  projects,
  loading,
  viewMode,
  onProjectClick,
  onProjectDelete,
  onRefresh
}: ProjectsGridProps) {
  // Close any open action menus when clicking outside
  const handleClickOutside = () => {
    // This will be handled by individual cards
  };

  if (loading) {
    return <LoadingSkeleton viewMode={viewMode} />;
  }

  if (projects.length === 0) {
    return <EmptyState onRefresh={onRefresh} />;
  }

  if (viewMode === 'list') {
    return (
      <div className="space-y-4" onClick={handleClickOutside}>
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            viewMode={viewMode}
            onProjectClick={onProjectClick}
            onProjectDelete={onProjectDelete}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" onClick={handleClickOutside}>
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          viewMode={viewMode}
          onProjectClick={onProjectClick}
          onProjectDelete={onProjectDelete}
        />
      ))}
    </div>
  );
}