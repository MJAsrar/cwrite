'use client';

import { useState } from 'react';
import { Project } from '@/types';
import { 
  FolderOpen, 
  FileText, 
  Users, 
  MoreVertical,
  Edit,
  Trash2,
  ExternalLink,
  AlertCircle,
  CheckCircle
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
    <div className="border-4 border-white bg-white p-6">
      <div className="animate-pulse">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gray-200 border-2 border-gray-300" />
            <div>
              <div className="h-5 bg-gray-200 w-32 mb-2" />
              <div className="h-4 bg-gray-200 w-24" />
            </div>
          </div>
        </div>
        
        <div className="h-4 bg-gray-200 mb-2" />
        <div className="h-4 bg-gray-200 w-3/4 mb-4" />
        
        <div className="grid grid-cols-2 gap-4 mb-4 pt-4 border-t-4 border-gray-200">
          <div className="h-4 bg-gray-200" />
          <div className="h-4 bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ project, onProjectClick }: ProjectCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const getStatusIcon = () => {
    switch (project.indexing_status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-[#39FF14]" />;
      case 'processing':
        return <div className="w-4 h-4 border-2 border-t-[#39FF14] border-r-transparent border-b-transparent border-l-transparent animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-[#FF073A]" />;
      default:
        return <div className="w-4 h-4 border-2 border-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (project.indexing_status) {
      case 'completed':
        return 'INDEXED';
      case 'processing':
        return 'PROCESSING';
      case 'error':
        return 'ERROR';
      default:
        return 'PENDING';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).toUpperCase();
  };

  return (
    <div 
      className="group border-4 border-white bg-white p-6 hover:border-[#39FF14] transition-all duration-100 cursor-pointer"
      onClick={() => onProjectClick(project.id)}
      style={{ boxShadow: '6px 6px 0 0 #0A0A0A' }}
      onMouseEnter={(e) => e.currentTarget.style.boxShadow = '8px 8px 0 0 #39FF14'}
      onMouseLeave={(e) => e.currentTarget.style.boxShadow = '6px 6px 0 0 #0A0A0A'}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4 pb-4 border-b-4 border-[#0A0A0A]">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-[#39FF14] border-4 border-[#0A0A0A] flex items-center justify-center">
            <FolderOpen className="w-6 h-6 text-[#0A0A0A]" />
          </div>
          <div>
            <h3 className="text-lg font-black uppercase text-[#0A0A0A] line-clamp-1 mb-1">
              {project.name}
            </h3>
            <p className="font-mono text-xs text-gray-600 uppercase">
              {formatDate(project.updated_at)}
            </p>
          </div>
        </div>
        
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-2 text-gray-600 hover:text-[#0A0A0A] hover:bg-gray-100 transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 mt-1 w-48 border-4 border-[#0A0A0A] bg-white shadow-lg z-20">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onProjectClick(project.id);
                    setShowMenu(false);
                  }}
                  className="flex items-center w-full px-4 py-3 font-mono text-xs uppercase font-bold text-[#0A0A0A] hover:bg-[#39FF14] transition-colors border-b-2 border-[#0A0A0A]"
                >
                  <ExternalLink className="w-4 h-4 mr-3" />
                  OPEN
                </button>
                <button className="flex items-center w-full px-4 py-3 font-mono text-xs uppercase font-bold text-[#0A0A0A] hover:bg-gray-100 transition-colors border-b-2 border-[#0A0A0A]">
                  <Edit className="w-4 h-4 mr-3" />
                  EDIT
                </button>
                <button className="flex items-center w-full px-4 py-3 font-mono text-xs uppercase font-bold text-[#FF073A] hover:bg-[#FF073A]/10 transition-colors">
                  <Trash2 className="w-4 h-4 mr-3" />
                  DELETE
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <p className="font-mono text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
          {project.description}
        </p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4 pt-4 border-t-4 border-[#0A0A0A]">
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-[#0A0A0A]" />
          <span className="font-mono text-sm font-bold text-[#0A0A0A] uppercase">
            {project.file_count} FILE{project.file_count !== 1 ? 'S' : ''}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-[#0A0A0A]" />
          <span className="font-mono text-sm font-bold text-[#0A0A0A] uppercase">
            {project.entity_count} ENTIT{project.entity_count !== 1 ? 'IES' : 'Y'}
          </span>
        </div>
      </div>

      {/* Status and Word Count */}
      <div className="flex items-center justify-between font-mono text-xs pt-4 border-t-4 border-[#0A0A0A]">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className="font-bold text-[#0A0A0A] uppercase">{getStatusText()}</span>
        </div>
        
        {project.stats?.total_words && (
          <span className="font-bold text-gray-600 uppercase">
            {project.stats.total_words.toLocaleString()} WORDS
          </span>
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
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <ProjectCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-16 border-4 border-white bg-white">
        <div className="w-20 h-20 border-4 border-gray-300 flex items-center justify-center mx-auto mb-6">
          <FolderOpen className="w-10 h-10 text-gray-300" />
        </div>
        <h3 className="text-3xl font-black uppercase text-[#0A0A0A] mb-3">
          NO PROJECTS YET
        </h3>
        <p className="font-mono text-sm text-gray-600 mb-8 max-w-md mx-auto uppercase leading-relaxed">
          CREATE YOUR FIRST PROJECT TO START ORGANIZING YOUR WRITING
        </p>
        <button
          onClick={onRefresh}
          className="border-4 border-[#39FF14] bg-transparent text-[#39FF14] font-mono px-8 py-4 text-sm uppercase font-bold hover:bg-[#39FF14] hover:text-[#0A0A0A] transition-all duration-100"
          style={{ boxShadow: '6px 6px 0 0 #39FF14' }}
          onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 0 0 #39FF14'}
          onMouseLeave={(e) => e.currentTarget.style.boxShadow = '6px 6px 0 0 #39FF14'}
        >
          CREATE YOUR FIRST PROJECT →
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onProjectClick={onProjectClick}
        />
      ))}
    </div>
  );
}
