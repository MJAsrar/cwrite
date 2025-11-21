'use client';

import { useState } from 'react';
import { 
  FolderOpen, 
  FileText, 
  Users, 
  Clock, 
  MoreVertical, 
  Trash2, 
  ExternalLink, 
  AlertCircle,
  CheckCircle,
  Loader2,
  Calendar,
  Activity
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Project } from '@/types';
// @ts-ignore
import { formatDistanceToNow, format } from 'date-fns';

interface ProjectCardProps {
  project: Project;
  viewMode: 'grid' | 'list';
  onProjectClick: (projectId: string) => void;
  onProjectDelete: (projectId: string) => void;
  showActions?: boolean;
}

interface ProjectCardData extends Project {
  stats?: Project['stats'] & {
    processing_progress?: number;
  };
}

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  projectName: string;
  loading?: boolean;
}

function DeleteConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  projectName, 
  loading = false 
}: DeleteConfirmationModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Project"
      size="sm"
      closeOnOverlayClick={!loading}
      closeOnEscape={!loading}
    >
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <div className="flex-1">
            <p className="text-foreground font-medium mb-2">
              Are you sure you want to delete "{projectName}"?
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              This action cannot be undone. All files, entities, and relationships in this project will be permanently deleted.
            </p>
          </div>
        </div>
        
        <div className="flex gap-3 justify-end pt-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={onConfirm}
            disabled={loading}
            loading={loading}
          >
            {!loading && <Trash2 className="w-4 h-4 mr-2" />}
            {loading ? 'Deleting...' : 'Delete Project'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ProjectStatusIndicator({ status, progress }: { status: string; progress?: number }) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
          icon: CheckCircle,
          text: 'Ready'
        };
      case 'processing':
        return {
          color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
          icon: Loader2,
          text: progress ? `Processing ${progress}%` : 'Processing'
        };
      case 'error':
        return {
          color: 'bg-destructive/10 text-destructive',
          icon: AlertCircle,
          text: 'Error'
        };
      case 'pending':
      default:
        return {
          color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
          icon: Clock,
          text: 'Pending'
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      <Icon className={`w-3 h-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
      {config.text}
    </span>
  );
}

function ProjectStats({ project }: { project: ProjectCardData }) {
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  const formatWordCount = (count?: number) => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="space-y-3">
      {/* Primary Stats */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-muted-foreground">
            <FileText className="w-4 h-4" />
            <span>{project.file_count} files</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{project.entity_count} entities</span>
          </div>
          {project.stats?.total_words && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Activity className="w-4 h-4" />
              <span>{formatWordCount(project.stats.total_words)} words</span>
            </div>
          )}
        </div>
        
        <ProjectStatusIndicator 
          status={project.indexing_status} 
          progress={project.stats?.processing_progress}
        />
      </div>

      {/* Secondary Stats */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border">
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          <span>Updated {formatDate(project.updated_at)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          <span>Created {formatDate(project.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

function ProjectActions({ 
  project, 
  onProjectClick, 
  onProjectDelete, 
  showActions, 
  setShowActions 
}: {
  project: Project;
  onProjectClick: (projectId: string) => void;
  onProjectDelete: (projectId: string) => void;
  showActions: boolean;
  setShowActions: (show: boolean) => void;
}) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onProjectDelete(project.id);
      setShowDeleteModal(false);
      setShowActions(false);
    } catch (error) {
      console.error('Failed to delete project:', error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            setShowActions(!showActions);
          }}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label="Project actions"
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
        
        {showActions && (
          <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-xl shadow-lg z-10 overflow-hidden">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onProjectClick(project.id);
                setShowActions(false);
              }}
              className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-accent flex items-center gap-2 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open Project
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteModal(true);
                setShowActions(false);
              }}
              className="w-full px-4 py-3 text-left text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Project
            </button>
          </div>
        )}
      </div>

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        projectName={project.name}
        loading={deleting}
      />
    </>
  );
}

export default function ProjectCard({ 
  project, 
  viewMode, 
  onProjectClick, 
  onProjectDelete, 
  showActions = true 
}: ProjectCardProps) {
  const [actionsOpen, setActionsOpen] = useState(false);

  // Close actions menu when clicking outside
  const handleCardClick = () => {
    if (actionsOpen) {
      setActionsOpen(false);
    } else {
      onProjectClick(project.id);
    }
  };

  if (viewMode === 'list') {
    return (
      <div className="bg-card border border-border rounded-xl p-4 hover:shadow-md hover:border-primary/30 transition-all duration-300 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center gap-4 flex-1 cursor-pointer"
            onClick={handleCardClick}
          >
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <FolderOpen className="w-5 h-5 text-primary" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-foreground truncate">
                {project.name}
              </h3>
              {project.description && (
                <p className="text-muted-foreground text-sm truncate">
                  {project.description}
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-6">
              <ProjectStats project={project} />
            </div>
          </div>
          
          {showActions && (
            <div className="ml-4">
              <ProjectActions
                project={project}
                onProjectClick={onProjectClick}
                onProjectDelete={onProjectDelete}
                showActions={actionsOpen}
                setShowActions={setActionsOpen}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="group bg-card border border-border rounded-2xl p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer animate-fade-in-up">
      <div onClick={handleCardClick}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <FolderOpen className="h-6 w-6 text-primary" />
          </div>
          
          {showActions && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <ProjectActions
                project={project}
                onProjectClick={onProjectClick}
                onProjectDelete={onProjectDelete}
                showActions={actionsOpen}
                setShowActions={setActionsOpen}
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="mb-4">
          <h3 className="font-serif text-xl font-semibold text-foreground mb-2 line-clamp-1">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
              {project.description}
            </p>
          )}
        </div>

        {/* Stats */}
        <ProjectStats project={project} />
      </div>
    </div>
  );
}