'use client';

import { useState, useEffect, useRef } from 'react';
import { Project } from '@/types';
import {
  FileText,
  Users,
  MoreVertical,
  Edit,
  Trash2,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Clock,
  BookOpen,
  Star,
} from 'lucide-react';
import gsap from 'gsap';

interface ProjectOverviewCardsProps {
  projects: Project[];
  onProjectClick: (projectId: string) => void;
  onRefresh: () => void;
  loading?: boolean;
  viewMode?: 'grid' | 'list';
}

interface ProjectCardProps {
  project: Project;
  onProjectClick: (projectId: string) => void;
  cardIndex: number;
}

// Type labels for projects based on index (mock variety)
const PROJECT_TYPES = ['Novel', 'Draft', 'Journal', 'Doc', 'Planning', 'Story'];

function ProjectCardSkeleton() {
  return (
    <div
      className="rounded-xl overflow-hidden bg-white border border-stone-200"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      <div className="animate-pulse">
        <div className="h-40 bg-stone-50 border-b border-stone-100 p-6">
          <div className="h-2 w-16 bg-stone-200 rounded-full mb-4" />
          <div className="h-1 w-2/3 bg-stone-200 rounded-full mb-2" />
          <div className="h-1 w-full bg-stone-200 rounded-full mb-2" />
          <div className="h-1 w-1/2 bg-stone-200 rounded-full" />
        </div>
        <div className="p-4">
          <div className="h-4 bg-stone-100 rounded w-3/4 mb-2" />
          <div className="h-3 bg-stone-50 rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ project, onProjectClick, cardIndex }: ProjectCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const projectType = PROJECT_TYPES[cardIndex % PROJECT_TYPES.length];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusIcon = () => {
    switch (project.indexing_status) {
      case 'completed': return <CheckCircle2 className="w-3 h-3 text-emerald-500" />;
      case 'processing': return <div className="w-3 h-3 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />;
      case 'error': return <AlertCircle className="w-3 h-3 text-red-500" />;
      default: return <Clock className="w-3 h-3 text-amber-500" />;
    }
  };

  return (
    <div
      ref={cardRef}
      data-card
      className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col cursor-pointer"
      onClick={() => onProjectClick(project.id)}
    >
      {/* Preview area */}
      <div className="h-40 bg-stone-50 border-b border-stone-100 p-6 flex flex-col gap-2 relative overflow-hidden">
        {/* Hover-reveal buttons */}
        <div className="absolute top-0 right-0 p-3 flex gap-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all z-10">
          <button
            onClick={(e) => { e.stopPropagation(); }}
            className="p-1.5 bg-white rounded-full shadow-sm text-stone-500 hover:text-amber-900 border border-stone-100 transition-colors"
          >
            <Star size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="p-1.5 bg-white rounded-full shadow-sm text-stone-500 hover:text-amber-900 border border-stone-100 transition-colors"
          >
            <MoreVertical size={14} />
          </button>
        </div>

        {/* Type label */}
        <div className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">
          {projectType}
        </div>

        {/* Status indicator */}
        <div className="absolute top-3 left-6 flex items-center">
          {getStatusIcon()}
        </div>

        {/* Faux text lines */}
        <div className="text-stone-300 mt-1">
          <div className="h-1 w-2/3 bg-current rounded-full mb-2"></div>
          <div className="h-1 w-full bg-current rounded-full mb-2"></div>
          <div className="h-1 w-1/2 bg-current rounded-full mb-2"></div>
          <div className="h-1 w-4/5 bg-current rounded-full"></div>
        </div>

        {/* Context menu */}
        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}
            />
            <div
              className="absolute right-3 top-12 w-48 rounded-xl z-20 py-1.5 overflow-hidden bg-white"
              style={{
                boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
                border: '1px solid #E7E5E4',
              }}
            >
              <button
                onClick={(e) => { e.stopPropagation(); onProjectClick(project.id); setShowMenu(false); }}
                className="flex items-center w-full px-3.5 py-2 text-sm transition-colors text-stone-700 hover:bg-stone-50"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-2.5 text-stone-500" />
                Open Project
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}
                className="flex items-center w-full px-3.5 py-2 text-sm transition-colors text-stone-700 hover:bg-stone-50"
              >
                <Edit className="w-3.5 h-3.5 mr-2.5 text-stone-500" />
                Edit Details
              </button>
              <div className="h-px mx-3 my-1 bg-stone-200" />
              <button
                onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}
                className="flex items-center w-full px-3.5 py-2 text-sm transition-colors text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5 mr-2.5" />
                Delete Project
              </button>
            </div>
          </>
        )}
      </div>

      {/* Card footer */}
      <div className="p-4">
        <h3 className="font-medium text-stone-900 truncate mb-1">{project.name}</h3>
        <div className="flex items-center justify-between">
          <p className="text-xs text-stone-500 flex items-center gap-1">
            <Clock size={12} /> {formatDate(project.updated_at)}
          </p>
          <div className="flex items-center gap-2">
            {project.file_count > 0 && (
              <span className="text-[10px] text-stone-400 flex items-center gap-0.5">
                <FileText size={10} /> {project.file_count}
              </span>
            )}
            <div className="w-5 h-5 rounded-full bg-stone-200 border border-white text-[8px] flex items-center justify-center font-bold text-stone-600">
              {project.name?.[0]?.toUpperCase() || 'U'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectListRow({ project, onProjectClick, cardIndex }: ProjectCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const projectType = PROJECT_TYPES[cardIndex % PROJECT_TYPES.length];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <tr
      className="hover:bg-stone-50 transition-colors group cursor-pointer"
      onClick={() => onProjectClick(project.id)}
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <FileText className="text-amber-900 shrink-0" size={18} />
          <span className="font-medium text-stone-900">{project.name}</span>
          <span className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider bg-stone-100 px-1.5 py-0.5 rounded hidden sm:inline">
            {projectType}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-stone-600">Me</td>
      <td className="px-6 py-4 text-sm text-stone-500">{formatDate(project.updated_at)}</td>
      <td className="px-6 py-4 text-right relative">
        <button
          onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
          className="p-2 text-stone-400 hover:text-amber-900 transition-colors"
        >
          <MoreVertical size={18} />
        </button>
        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}
            />
            <div
              className="absolute right-6 top-full mt-1 w-48 rounded-xl z-20 py-1.5 overflow-hidden bg-white"
              style={{
                boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
                border: '1px solid #E7E5E4',
              }}
            >
              <button
                onClick={(e) => { e.stopPropagation(); onProjectClick(project.id); setShowMenu(false); }}
                className="flex items-center w-full px-3.5 py-2 text-sm transition-colors text-stone-700 hover:bg-stone-50"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-2.5 text-stone-500" />
                Open Project
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}
                className="flex items-center w-full px-3.5 py-2 text-sm transition-colors text-stone-700 hover:bg-stone-50"
              >
                <Edit className="w-3.5 h-3.5 mr-2.5 text-stone-500" />
                Edit Details
              </button>
              <div className="h-px mx-3 my-1 bg-stone-200" />
              <button
                onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}
                className="flex items-center w-full px-3.5 py-2 text-sm transition-colors text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5 mr-2.5" />
                Delete Project
              </button>
            </div>
          </>
        )}
      </td>
    </tr>
  );
}

export default function ProjectOverviewCards({
  projects,
  onProjectClick,
  loading = false,
  viewMode = 'grid',
}: ProjectOverviewCardsProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  // GSAP stagger entrance animation
  useEffect(() => {
    if (!loading && projects.length > 0 && gridRef.current) {
      const cards = gridRef.current.querySelectorAll('[data-card]');
      if (cards.length > 0) {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 28, scale: 0.97 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.45,
            ease: 'power2.out',
            stagger: 0.07,
            clearProps: 'scale',
          }
        );
      }
    }
  }, [loading, projects.length, viewMode]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <ProjectCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (projects.length === 0) return null;

  if (viewMode === 'list') {
    return (
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 text-xs uppercase tracking-wider font-semibold">
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Owner</th>
              <th className="px-6 py-4">Last Modified</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {projects.map((project, index) => (
              <ProjectListRow
                key={project.id}
                project={project}
                onProjectClick={onProjectClick}
                cardIndex={index}
              />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div
      ref={gridRef}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
    >
      {projects.map((project, index) => (
        <ProjectCard
          key={project.id}
          project={project}
          onProjectClick={onProjectClick}
          cardIndex={index}
        />
      ))}
    </div>
  );
}
