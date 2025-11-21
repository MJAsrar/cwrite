'use client';

import { useState } from 'react';
import { Project } from '@/types';
import Button from '@/components/ui/Button';
import { 
  FolderOpen, 
  FileText, 
  Users, 
  Clock, 
  MoreVertical,
  Edit,
  Trash2,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';

interface ProjectOverviewCardsProps {
  projects: Project[];
  onProjectClick: (projectId: string) => void;
  onRefresh: () => void;
  loading?: boolean;
}

interface ProjectCardProps {
  project: Project;
  onProjectClick: (projectId: string) => void;
}

function ProjectCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-muted rounded-xl" />
          <div>
            <div className="h-5 bg-muted rounded w-32 mb-2" />
            <div className="h-4 bg-muted rounded w-24" />
          </div>
        </div>
        <div className="w-8 h-8 bg-muted rounded" />
      </div>
      
      <div className="h-4 bg-muted rounded mb-2" />
      <div className="h-4 bg-muted rounded w-3/4 mb-4" />
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="h-4 bg-muted rounded" />
        <div className="h-4 bg-muted rounded" />
      </div>
      
      <div className="flex justify-between mb-4">
        <div className="h-4 bg-muted rounded w-20" />
        <div className="h-4 bg-muted rounded w-16" />
      </div>
      
      <div className="pt-4 border-t border-border">
        <div className="h-9 bg-muted rounded-xl" />
      </div>
    </div>
  );
}

function ProjectCard({ project, onProjectClick }: ProjectCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const getStatusIcon = () => {
    switch (project.indexing_status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusText = () => {
    switch (project.indexing_status) {
      case 'completed':
        return 'Indexed';
      case 'processing':
        return 'Processing';
      case 'error':
        return 'Error';
      default:
        return 'Pending';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div 
      className="group bg-card border border-border rounded-2xl p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer animate-fade-in-up"
      onClick={() => onProjectClick(project.id)}
    >
      {/* Enhanced Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <FolderOpen className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-serif text-xl font-semibold text-foreground line-clamp-1 mb-1">
              {project.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              Updated {formatDate(project.updated_at)}
            </p>
          </div>
        </div>
        
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 mt-1 w-48 bg-card border border-border rounded-2xl shadow-lg py-2 z-20 animate-scale-in">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onProjectClick(project.id);
                    setShowMenu(false);
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-accent rounded-xl mx-2 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 mr-3" />
                  Open Project
                </button>
                <button className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-accent rounded-xl mx-2 transition-colors">
                  <Edit className="w-4 h-4 mr-3" />
                  Edit Details
                </button>
                <button className="flex items-center w-full px-4 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-xl mx-2 transition-colors">
                  <Trash2 className="w-4 h-4 mr-3" />
                  Delete Project
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Enhanced Description */}
      {project.description && (
        <p className="text-muted-foreground text-sm mb-4 line-clamp-2 leading-relaxed">
          {project.description}
        </p>
      )}

      {/* Enhanced Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center space-x-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {project.file_count} {project.file_count === 1 ? 'file' : 'files'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {project.entity_count} {project.entity_count === 1 ? 'entity' : 'entities'}
          </span>
        </div>
      </div>

      {/* Enhanced Status and Word Count */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span>{getStatusText()}</span>
        </div>
        
        {project.stats?.total_words && (
          <span>{project.stats.total_words.toLocaleString()} words</span>
        )}
      </div>
    </div>
  );
}

export default function ProjectOverviewCards({ 
  projects, 
  onProjectClick, 
  onRefresh,
  loading = false
}: ProjectOverviewCardsProps) {
  // Loading state with skeleton cards
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <ProjectCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  // Empty state
  if (projects.length === 0) {
    return (
      <div className="text-center py-16 bg-card rounded-2xl border border-border animate-fade-in">
        <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-6">
          <FolderOpen className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-serif text-xl font-semibold text-foreground mb-3">
          No projects yet
        </h3>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
          Create your first project to start organizing your writing and discover insights about your creative work.
        </p>
        <Button 
          onClick={onRefresh}
          className="btn-primary"
        >
          Create Your First Project
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project, index) => (
        <ProjectCard
          key={project.id}
          project={project}
          onProjectClick={onProjectClick}
        />
      ))}
    </div>
  );
}