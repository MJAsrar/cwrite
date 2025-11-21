'use client';

import { Activity } from '@/types';
import { 
  FileText, 
  FolderPlus, 
  Search, 
  Users, 
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface RecentActivityProps {
  activities: Activity[];
  loading?: boolean;
}

interface ActivityItemProps {
  activity: Activity;
}

function ActivityItemSkeleton() {
  return (
    <div className="flex items-start space-x-4 p-4 rounded-xl border border-border animate-pulse">
      <div className="w-5 h-5 bg-muted rounded flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-16" />
        </div>
        <div className="h-3 bg-muted rounded w-1/2" />
      </div>
    </div>
  );
}

function ActivityItem({ activity }: ActivityItemProps) {
  const getActivityIcon = () => {
    switch (activity.type) {
      case 'file_upload':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'project_created':
        return <FolderPlus className="w-5 h-5 text-green-500" />;
      case 'search_performed':
        return <Search className="w-5 h-5 text-purple-500" />;
      case 'entity_discovered':
        return <Users className="w-5 h-5 text-orange-500" />;
      default:
        return <Clock className="w-5 h-5 text-secondary-400" />;
    }
  };

  const getActivityColor = () => {
    switch (activity.type) {
      case 'file_upload':
        return 'bg-blue-50 border-blue-200';
      case 'project_created':
        return 'bg-green-50 border-green-200';
      case 'search_performed':
        return 'bg-purple-50 border-purple-200';
      case 'entity_discovered':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-secondary-50 border-secondary-200';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days}d ago`;
    }
  };

  const getStatusIndicator = () => {
    if (activity.metadata?.status === 'completed') {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    } else if (activity.metadata?.status === 'error') {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
    return null;
  };

  return (
    <div className="flex items-start space-x-4 p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex-shrink-0 mt-0.5">
        {getActivityIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">
            {activity.description}
          </p>
          <div className="flex items-center space-x-2">
            {getStatusIndicator()}
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatTimestamp(activity.timestamp)}
            </span>
          </div>
        </div>
        
        {activity.metadata?.project_name && (
          <p className="text-xs text-muted-foreground mt-1">
            Project: {activity.metadata.project_name}
          </p>
        )}
        
        {activity.metadata?.file_name && (
          <p className="text-xs text-muted-foreground mt-1">
            File: {activity.metadata.file_name}
          </p>
        )}
        
        {activity.metadata?.entity_count && (
          <p className="text-xs text-muted-foreground mt-1">
            {activity.metadata.entity_count} entities discovered
          </p>
        )}
      </div>
    </div>
  );
}

export default function RecentActivity({ activities, loading = false }: RecentActivityProps) {
  // Loading state
  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border">
        <div className="p-6 border-b border-border">
          <div className="h-6 bg-muted rounded w-32 mb-2" />
          <div className="h-4 bg-muted rounded w-48" />
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <ActivityItemSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (activities.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-8 text-center animate-fade-in">
        <div className="w-12 h-12 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Clock className="w-6 h-6 text-muted-foreground" />
        </div>
        <h3 className="font-serif text-lg font-semibold text-foreground mb-2">
          No recent activity
        </h3>
        <p className="text-muted-foreground">
          Your recent project activities will appear here as you work on your writing projects.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border animate-fade-in">
      <div className="p-6 border-b border-border">
        <h3 className="font-serif text-lg font-semibold text-foreground">Recent Activity</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Latest updates from your projects
        </p>
      </div>
      
      <div className="p-6">
        <div className="space-y-3">
          {activities.slice(0, 10).map((activity, index) => (
            <div
              key={activity.id}
              style={{ animationDelay: `${index * 50}ms` }}
              className="animate-fade-in-up"
            >
              <ActivityItem activity={activity} />
            </div>
          ))}
        </div>
        
        {activities.length > 10 && (
          <div className="mt-6 pt-4 border-t border-border text-center">
            <button className="text-sm text-primary hover:text-primary/80 font-medium transition-colors">
              View all activity
            </button>
          </div>
        )}
      </div>
    </div>
  );
}