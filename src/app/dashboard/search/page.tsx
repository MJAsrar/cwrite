'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import SearchInterface from '@/components/search/SearchInterface';
import { Project } from '@/types';
import { api } from '@/lib/api';
import { useSearchNavigation } from '@/hooks/useSearchNavigation';
import { Search, AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';

// Disable static generation for this page
export const dynamic = 'force-dynamic';

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { restoreSearchState } = useSearchNavigation();
  
  // State management
  const [mounted, setMounted] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'network' | 'auth' | 'server' | 'unknown'>('unknown');
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [restoredState, setRestoredState] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Ensure component only renders on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Get initial search query from URL params or restored state
  const initialQuery = searchParams.get('q') || '';
  const initialProjectId = searchParams.get('project') || undefined;
  const highlightResultId = searchParams.get('highlightResult');

  // Network status monitoring (only on client)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Enhanced error categorization
  const categorizeError = useCallback((err: any): 'network' | 'auth' | 'server' | 'unknown' => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return 'network';
    }
    if (err.code === 'NETWORK_ERROR' || err.message?.includes('Network Error')) {
      return 'network';
    }
    if (err.response?.status === 401 || err.response?.status === 403) {
      return 'auth';
    }
    if (err.response?.status >= 500) {
      return 'server';
    }
    return 'unknown';
  }, []);

  // Enhanced retry with exponential backoff
  const loadProjectsWithRetry = useCallback(async (attempt = 0) => {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    try {
      setLoading(true);
      setError(null);
      setErrorType('unknown');
      
      if (attempt > 0) {
        setIsRetrying(true);
        // Exponential backoff: 1s, 2s, 4s
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const projectsData = await api.projects.list();
      setProjects(Array.isArray(projectsData) ? projectsData : []);
      setRetryCount(0); // Reset retry count on success
      
      // Try to restore search state if returning from navigation
      const restored = restoreSearchState();
      if (restored) {
        setRestoredState(restored);
      }
    } catch (err: any) {
      console.error('Failed to load projects:', err);
      const errorCategory = categorizeError(err);
      setErrorType(errorCategory);
      
      if (attempt < maxRetries && errorCategory !== 'auth') {
        // Auto-retry for network and server errors
        setTimeout(() => loadProjectsWithRetry(attempt + 1), 100);
        return;
      }
      
      // Set final error message
      let errorMessage = 'Failed to load projects';
      switch (errorCategory) {
        case 'network':
          errorMessage = 'Unable to connect to the server. Please check your internet connection.';
          break;
        case 'auth':
          errorMessage = 'Your session has expired. Please log in again.';
          break;
        case 'server':
          errorMessage = 'The server is currently experiencing issues. Please try again later.';
          break;
        default:
          errorMessage = err.message || 'An unexpected error occurred while loading projects.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  }, [categorizeError, restoreSearchState]);

  // Load projects for search filtering and restore search state (only after mounted on client)
  useEffect(() => {
    if (mounted) {
      loadProjectsWithRetry();
    }
  }, [mounted, loadProjectsWithRetry]);

  // Auto-retry when coming back online
  useEffect(() => {
    if (isOnline && error && errorType === 'network') {
      loadProjectsWithRetry();
    }
  }, [isOnline, error, errorType, loadProjectsWithRetry]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    loadProjectsWithRetry();
  };

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  // Don't render until mounted on client to avoid SSR issues
  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <Search className="w-8 h-8 text-primary-600" />
              <h1 className="text-3xl font-bold text-secondary-900">Search</h1>
            </div>
            <p className="text-secondary-600">
              Find content across all your projects using natural language search
            </p>
          </div>

          {/* Enhanced Loading State */}
          <div className="bg-white rounded-lg border border-secondary-200 p-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent"></div>
              <div className="text-center">
                <p className="text-secondary-900 font-medium">
                  {isRetrying ? `Retrying... (Attempt ${retryCount + 1})` : 'Loading search interface...'}
                </p>
                <p className="text-sm text-secondary-600 mt-1">
                  {isRetrying ? 'Please wait while we reconnect' : 'Preparing your projects for search'}
                </p>
              </div>
              {!isOnline && (
                <div className="flex items-center space-x-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                  <WifiOff className="w-4 h-4" />
                  <span className="text-sm">You appear to be offline</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Enhanced Error state
  if (error) {
    const getErrorIcon = () => {
      switch (errorType) {
        case 'network':
          return <WifiOff className="w-12 h-12 text-amber-500 mx-auto mb-4" />;
        case 'auth':
          return <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />;
        case 'server':
          return <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />;
        default:
          return <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />;
      }
    };

    const getErrorTitle = () => {
      switch (errorType) {
        case 'network':
          return 'Connection Problem';
        case 'auth':
          return 'Authentication Required';
        case 'server':
          return 'Server Unavailable';
        default:
          return 'Unable to Load Search';
      }
    };

    const getErrorActions = () => {
      if (errorType === 'auth') {
        return (
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={() => router.push('/auth/login')}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <span>Log In Again</span>
            </button>
            <button
              onClick={handleBackToDashboard}
              className="px-4 py-2 text-secondary-600 hover:text-secondary-800 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        );
      }

      return (
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>{isRetrying ? 'Retrying...' : 'Try Again'}</span>
          </button>
          <button
            onClick={handleBackToDashboard}
            className="px-4 py-2 text-secondary-600 hover:text-secondary-800 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      );
    };

    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <Search className="w-8 h-8 text-primary-600" />
              <h1 className="text-3xl font-bold text-secondary-900">Search</h1>
            </div>
            <p className="text-secondary-600">
              Find content across all your projects using natural language search
            </p>
          </div>

          {/* Enhanced Error State */}
          <div className="bg-white rounded-lg border border-red-200 p-8">
            <div className="text-center">
              {getErrorIcon()}
              <h3 className="text-lg font-medium text-secondary-900 mb-2">
                {getErrorTitle()}
              </h3>
              <p className="text-secondary-600 mb-6 max-w-md mx-auto">
                {error}
              </p>
              
              {/* Network status indicator */}
              {errorType === 'network' && (
                <div className="mb-6">
                  <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg text-sm ${
                    isOnline 
                      ? 'bg-green-50 text-green-700' 
                      : 'bg-red-50 text-red-700'
                  }`}>
                    {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                    <span>{isOnline ? 'Connected' : 'Offline'}</span>
                  </div>
                </div>
              )}

              {getErrorActions()}

              {/* Additional help text */}
              {errorType === 'network' && (
                <p className="text-xs text-secondary-500 mt-4">
                  We'll automatically retry when your connection is restored
                </p>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <Search className="w-8 h-8 text-primary-600" />
                <h1 className="text-3xl font-bold text-secondary-900">Search</h1>
              </div>
              <p className="text-secondary-600">
                Find content across all your projects using natural language search
              </p>
            </div>
            
            {/* Quick Stats */}
            <div className="hidden md:flex items-center space-x-6 text-sm text-secondary-600">
              <div className="text-center">
                <div className="font-semibold text-secondary-900">{projects.length}</div>
                <div>Projects</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-secondary-900">
                  {projects.reduce((sum, p) => sum + (p.file_count || 0), 0)}
                </div>
                <div>Files</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-secondary-900">
                  {projects.reduce((sum, p) => sum + (p.entity_count || 0), 0)}
                </div>
                <div>Entities</div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Interface */}
        <div className="space-y-6">
          {/* Main Search Component */}
          <SearchInterface
            projects={projects}
            projectId={initialProjectId}
            initialQuery={initialQuery}
            restoredState={restoredState}
            highlightResultId={highlightResultId || undefined}
            className="shadow-sm"
          />

          {/* Search Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-sm font-medium text-blue-900 mb-3">
              Search Tips
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
              <div>
                <h4 className="font-medium mb-1">Natural Language</h4>
                <p>Ask questions like "What are the main themes in my story?" or "Show me all characters in Chapter 5"</p>
              </div>
              <div>
                <h4 className="font-medium mb-1">Specific Searches</h4>
                <p>Search for specific names, places, or concepts to find all related content</p>
              </div>
              <div>
                <h4 className="font-medium mb-1">Use Filters</h4>
                <p>Filter by project, entity type, or date range to narrow down results</p>
              </div>
              <div>
                <h4 className="font-medium mb-1">Save Searches</h4>
                <p>Save frequently used searches for quick access later</p>
              </div>
            </div>
          </div>

          {/* Empty State for New Users */}
          {projects.length === 0 && (
            <div className="bg-white border border-secondary-200 rounded-lg p-8 text-center">
              <Search className="w-12 h-12 text-secondary-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-secondary-900 mb-2">
                No Projects Yet
              </h3>
              <p className="text-secondary-600 mb-6">
                Create your first project and upload some files to start searching your content.
              </p>
              <button
                onClick={() => router.push('/dashboard/projects')}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Go to Projects
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}