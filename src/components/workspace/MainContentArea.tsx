'use client';

import { useState } from 'react';
import { Project, ProjectFile, Entity, Relationship } from '@/types';
import { 
  BookOpen, 
  FileText, 
  Users, 
  GitBranch,
  Upload,
  Search,
  Sparkles,
  Home,
  Eye,
  Database,
  Network,
  TrendingUp,
  Clock,
  Star,
  Filter
} from 'lucide-react';
import Button from '@/components/ui/Button';
import FilePreview from './FilePreview';
import EntityBrowser from './EntityBrowser';

interface MainContentAreaProps {
  project: Project;
  viewState: {
    sidebar: 'files' | 'entities' | 'relationships';
    main: 'welcome' | 'file' | 'entity' | 'relationships';
    selectedFileId?: string;
    selectedEntityId?: string;
  };
  files: ProjectFile[];
  entities: Entity[];
  relationships: Relationship[];
  onFileSelect: (fileId: string) => void;
  onEntitySelect: (entityId: string) => void;
}

type MainViewTab = 'overview' | 'files' | 'entities' | 'relationships' | 'analytics';

function OverviewTab({ project, files, entities }: { 
  project: Project; 
  files: ProjectFile[]; 
  entities: Entity[];
}) {
  const stats = [
    {
      label: 'Files',
      value: files.length,
      icon: FileText,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      description: 'Uploaded documents'
    },
    {
      label: 'Characters',
      value: entities.filter(e => e.type === 'character').length,
      icon: Users,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      description: 'Discovered characters'
    },
    {
      label: 'Locations',
      value: entities.filter(e => e.type === 'location').length,
      icon: GitBranch,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
      description: 'Identified locations'
    },
    {
      label: 'Themes',
      value: entities.filter(e => e.type === 'theme').length,
      icon: Sparkles,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
      description: 'Extracted themes'
    }
  ];

  const recentFiles = files
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  const topEntities = entities
    .sort((a, b) => b.mention_count - a.mention_count)
    .slice(0, 8);

  return (
    <div className="p-6 space-y-6">
      {/* Project Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-foreground mb-2">
          {project.name}
        </h1>
        {project.description && (
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {project.description}
          </p>
        )}
      </div>

      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border border-border p-6 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground mb-1">{stat.value}</p>
              <p className="text-sm font-medium text-foreground">{stat.label}</p>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="font-serif text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button variant="outline" className="justify-start h-12">
            <Upload className="w-5 h-5 mr-3" />
            Upload New Files
          </Button>
          <Button variant="outline" className="justify-start h-12">
            <Search className="w-5 h-5 mr-3" />
            Search Content
          </Button>
          <Button variant="outline" className="justify-start h-12">
            <Sparkles className="w-5 h-5 mr-3" />
            Analyze Relationships
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Files */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl font-semibold text-foreground">Recent Files</h2>
            <Clock className="w-5 h-5 text-muted-foreground" />
          </div>
          {recentFiles.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No files uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentFiles.map((file) => (
                <div key={file.id} className="flex items-center gap-3 p-3 hover:bg-accent rounded-xl cursor-pointer transition-colors">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {file.filename}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(file.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Eye className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Entities */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl font-semibold text-foreground">Top Entities</h2>
            <Star className="w-5 h-5 text-muted-foreground" />
          </div>
          {topEntities.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No entities discovered yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topEntities.map((entity) => (
                <div key={entity.id} className="flex items-center justify-between p-3 hover:bg-accent rounded-xl cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      entity.type === 'character' ? 'bg-blue-500' :
                      entity.type === 'location' ? 'bg-green-500' : 'bg-purple-500'
                    }`} />
                    <span className="text-sm font-medium text-foreground">
                      {entity.name}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    {entity.mention_count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FileView({ fileId, files }: { fileId: string; files: ProjectFile[] }) {
  const file = files.find(f => f.id === fileId);
  
  if (!file) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-secondary-600">File not found</p>
      </div>
    );
  }

  return <FilePreview file={file} />;
}

function EntityView({ entityId, entities }: { entityId: string; entities: Entity[] }) {
  const entity = entities.find(e => e.id === entityId);
  
  if (!entity) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-secondary-600">Entity not found</p>
      </div>
    );
  }

  const getEntityIcon = () => {
    switch (entity.type) {
      case 'character':
        return <Users className="w-6 h-6 text-blue-500" />;
      case 'location':
        return <GitBranch className="w-6 h-6 text-green-500" />;
      case 'theme':
        return <Sparkles className="w-6 h-6 text-purple-500" />;
      default:
        return <FileText className="w-6 h-6 text-secondary-400" />;
    }
  };

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg border border-secondary-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            {getEntityIcon()}
            <div>
              <h1 className="text-2xl font-bold text-secondary-900">{entity.name}</h1>
              <p className="text-secondary-600 capitalize">
                {entity.type} • {entity.mention_count} mentions • {Math.round(entity.confidence_score * 100)}% confidence
              </p>
            </div>
          </div>

          {entity.aliases && entity.aliases.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-secondary-900 mb-2">Also known as:</h3>
              <div className="flex flex-wrap gap-2">
                {entity.aliases.map((alias, index) => (
                  <span key={index} className="px-3 py-1 bg-secondary-100 text-secondary-700 rounded-full text-sm">
                    {alias}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="prose max-w-none">
            <p className="text-secondary-600">
              Detailed entity information, mentions, and relationships will be displayed here.
              This includes context snippets, related entities, and occurrence patterns throughout the project.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilesTab({ files, onFileSelect }: { files: ProjectFile[]; onFileSelect: (fileId: string) => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('date');

  const filteredFiles = files.filter(file =>
    file.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedFiles = [...filteredFiles].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.filename.localeCompare(b.filename);
      case 'size':
        return b.size - a.size;
      case 'date':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  return (
    <div className="p-6 space-y-6">
      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-4 py-2 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="date">Sort by Date</option>
          <option value="name">Sort by Name</option>
          <option value="size">Sort by Size</option>
        </select>
      </div>

      {/* Files Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedFiles.map((file) => (
          <div
            key={file.id}
            onClick={() => onFileSelect(file.id)}
            className="bg-card rounded-xl border border-border p-4 hover:shadow-sm cursor-pointer transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-500" />
              </div>
              <Eye className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h3 className="font-medium text-foreground mb-2 truncate">{file.filename}</h3>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{new Date(file.created_at).toLocaleDateString()}</span>
              <span>{Math.round(file.size / 1024)} KB</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EntitiesTab({ entities, onEntitySelect }: { entities: Entity[]; onEntitySelect: (entityId: string) => void }) {
  return (
    <div className="h-full">
      <EntityBrowser
        entities={entities}
        onEntitySelect={onEntitySelect}
      />
    </div>
  );
}

function RelationshipsTab() {
  return (
    <div className="p-6">
      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <Network className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="font-serif text-2xl font-bold text-foreground mb-4">Relationship Analysis</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Interactive relationship visualization and analysis tools will be implemented here.
          This will include network graphs, relationship strength analysis, and pattern discovery.
        </p>
      </div>
    </div>
  );
}

function AnalyticsTab({ project, files, entities }: { project: Project; files: ProjectFile[]; entities: Entity[] }) {
  return (
    <div className="p-6">
      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <TrendingUp className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="font-serif text-2xl font-bold text-foreground mb-4">Analytics Dashboard</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Comprehensive analytics and insights about your project will be displayed here.
          This includes writing patterns, entity relationships, and content analysis.
        </p>
      </div>
    </div>
  );
}

export default function MainContentArea({
  project,
  viewState,
  files,
  entities,
  relationships,
  onFileSelect,
  onEntitySelect
}: MainContentAreaProps) {
  const [activeTab, setActiveTab] = useState<MainViewTab>('overview');

  // Handle specific view states
  if (viewState.main === 'file' && viewState.selectedFileId) {
    return <FileView fileId={viewState.selectedFileId} files={files} />;
  }
  
  if (viewState.main === 'entity' && viewState.selectedEntityId) {
    return <EntityView entityId={viewState.selectedEntityId} entities={entities} />;
  }

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: Home },
    { id: 'files' as const, label: 'Files', icon: FileText, count: files.length },
    { id: 'entities' as const, label: 'Entities', icon: Database, count: entities.length },
    { id: 'relationships' as const, label: 'Relationships', icon: Network },
    { id: 'analytics' as const, label: 'Analytics', icon: TrendingUp }
  ];

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Enhanced Tab Navigation */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-1 p-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
                ${activeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }
              `}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`
                  px-2 py-0.5 rounded-full text-xs font-medium
                  ${activeTab === tab.id
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

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'overview' && (
          <div className="h-full overflow-y-auto">
            <OverviewTab project={project} files={files} entities={entities} />
          </div>
        )}
        {activeTab === 'files' && (
          <div className="h-full overflow-y-auto">
            <FilesTab files={files} onFileSelect={onFileSelect} />
          </div>
        )}
        {activeTab === 'entities' && (
          <EntitiesTab entities={entities} onEntitySelect={onEntitySelect} />
        )}
        {activeTab === 'relationships' && <RelationshipsTab />}
        {activeTab === 'analytics' && (
          <div className="h-full overflow-y-auto">
            <AnalyticsTab project={project} files={files} entities={entities} />
          </div>
        )}
      </div>
    </div>
  );
}