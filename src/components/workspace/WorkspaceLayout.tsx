'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { Project } from '@/types';
import SearchContextIndicator from '@/components/search/SearchContextIndicator';
import Breadcrumb, { BreadcrumbItem } from '@/components/ui/Breadcrumb';
import Button from '@/components/ui/Button';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { 
  ArrowLeft, 
  FolderOpen, 
  Users, 
  GitBranch, 
  Settings, 
  RefreshCw,
  Menu,
  X,
  BookOpen,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText,
  Database
} from 'lucide-react';

interface WorkspaceLayoutProps {
  project: Project;
  sidebarView: 'files' | 'entities' | 'relationships';
  onSidebarViewChange: (view: 'files' | 'entities' | 'relationships') => void;
  sidebar: ReactNode;
  children: ReactNode;
  rightSidebar?: ReactNode;
  onRefresh: () => Promise<void>;
}

export default function WorkspaceLayout({
  project,
  sidebarView,
  onSidebarViewChange,
  sidebar,
  children,
  rightSidebar,
  onRefresh
}: WorkspaceLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const sidebarTabs = [
    {
      id: 'files' as const,
      label: 'Files',
      icon: FolderOpen,
      count: project.file_count
    },
    {
      id: 'entities' as const,
      label: 'Entities',
      icon: Users,
      count: project.entity_count
    },
    {
      id: 'relationships' as const,
      label: 'Relations',
      icon: GitBranch,
      count: 0 // Will be calculated from relationships
    }
  ];

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusConfig = () => {
    switch (project.indexing_status) {
      case 'completed':
        return {
          icon: CheckCircle,
          text: 'Indexed',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'processing':
        return {
          icon: Loader2,
          text: 'Processing',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          animate: 'animate-spin'
        };
      case 'error':
        return {
          icon: AlertCircle,
          text: 'Error',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      default:
        return {
          icon: Clock,
          text: 'Pending',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200'
        };
    }
  };

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Projects', href: '/dashboard/projects' },
    { label: project.name, current: true }
  ];

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Enhanced Workspace Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="px-6 py-4">
          {/* Top row with navigation and actions */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              
              <Breadcrumb items={breadcrumbItems} />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={refreshing}
                title="Refresh project data"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
              
              <Button variant="ghost" size="icon" title="Project settings">
                <Settings className="h-4 w-4" />
              </Button>
              
              <ThemeToggle />
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden"
                title="Toggle sidebar"
              >
                {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Project info row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              
              <div>
                <h1 className="font-serif text-xl font-semibold text-foreground mb-1">
                  {project.name}
                </h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    <span>{project.file_count} files</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Database className="h-3.5 w-3.5" />
                    <span>{project.entity_count} entities</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Processing Status Indicator */}
            <div className={`
              flex items-center gap-2 px-3 py-2 rounded-xl border
              ${statusConfig.bgColor} ${statusConfig.borderColor}
            `}>
              <StatusIcon className={`h-4 w-4 ${statusConfig.color} ${statusConfig.animate || ''}`} />
              <span className={`text-sm font-medium ${statusConfig.color}`}>
                {statusConfig.text}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Search Context Indicator */}
      <SearchContextIndicator className="mx-6 mt-2" />

      {/* Main Content Area - 3 Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Files/Entities/Relationships */}
        <div className={`
          bg-card border-r border-border flex flex-col transition-all duration-300
          ${sidebarOpen ? 'w-80' : 'w-0'}
          ${sidebarOpen ? 'lg:w-80' : 'lg:w-0'}
        `}>
          {sidebarOpen && (
            <>
              {/* Sidebar Tabs */}
              <div className="border-b border-border p-3">
                <div className="flex gap-1">
                  {sidebarTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => onSidebarViewChange(tab.id)}
                      className={`
                        flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all
                        ${sidebarView === tab.id
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        }
                      `}
                    >
                      <tab.icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                      {tab.count > 0 && (
                        <span className={`
                          px-2 py-0.5 rounded-full text-xs font-medium
                          ${sidebarView === tab.id
                            ? 'bg-primary-foreground/20 text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                          }
                        `}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sidebar Content */}
              <div className="flex-1 overflow-hidden">
                {sidebar}
              </div>
            </>
          )}
        </div>

        {/* Center - Main Editor/Content */}
        <div className="flex-1 overflow-hidden border-r border-border">
          {children}
        </div>

        {/* Right Sidebar - AI Chat (Fixed width, always visible on large screens) */}
        {rightSidebar && (
          <div className="w-96 bg-card flex flex-col hidden xl:flex">
            {rightSidebar}
          </div>
        )}
      </div>

      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}