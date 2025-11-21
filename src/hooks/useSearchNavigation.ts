'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { SearchResult } from '@/types';

interface SearchContext {
  query: string;
  resultId: string;
  timestamp: number;
  filters?: any;
  scrollPosition?: number;
}

interface UseSearchNavigationReturn {
  navigateToResult: (result: SearchResult) => void;
  navigateBackToSearch: () => void;
  getSearchContext: () => SearchContext | null;
  hasSearchContext: boolean;
  preserveSearchState: (state: any) => void;
  restoreSearchState: () => any;
}

export function useSearchNavigation(): UseSearchNavigationReturn {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hasContext, setHasContext] = useState(false);

  // Check if we have search context on mount
  useEffect(() => {
    const context = getSearchContext();
    setHasContext(!!context);
  }, []);

  const navigateToResult = useCallback((result: SearchResult) => {
    // Create search context for back navigation
    const searchContext: SearchContext = {
      query: searchParams.get('q') || '',
      resultId: result.id,
      timestamp: Date.now(),
      filters: {
        projects: searchParams.getAll('project'),
        entityTypes: searchParams.getAll('entityType'),
        dateRange: searchParams.get('dateRange')
      },
      scrollPosition: window.scrollY
    };

    // Store search context in sessionStorage
    sessionStorage.setItem('searchContext', JSON.stringify(searchContext));

    // Determine navigation target based on result type and metadata
    let targetUrl = '';
    
    if (result.type === 'document' && result.metadata?.file_id) {
      // Navigate to specific file in project
      const projectId = result.metadata.project_id;
      const fileId = result.metadata.file_id;
      targetUrl = `/dashboard/projects/${projectId}/files?file=${fileId}`;
      
      // Add search highlighting parameters
      const params = new URLSearchParams({
        highlight: result.highlights.join(','),
        searchId: result.id,
        context: 'search'
      });
      
      if (result.metadata.chunk_index !== undefined) {
        params.set('chunk', result.metadata.chunk_index.toString());
      }
      
      targetUrl += `&${params.toString()}`;
      
    } else if (result.type === 'entity' && result.metadata?.entity_id) {
      // Navigate to entity view in project
      const projectId = result.metadata.project_id;
      const entityId = result.metadata.entity_id;
      targetUrl = `/dashboard/projects/${projectId}?entity=${entityId}&context=search&searchId=${result.id}`;
      
    } else {
      // Fallback to project main page
      const projectId = result.metadata?.project_id;
      if (projectId) {
        targetUrl = `/dashboard/projects/${projectId}?searchId=${result.id}&context=search`;
      }
    }

    if (targetUrl) {
      router.push(targetUrl);
    }
  }, [router, searchParams]);

  const navigateBackToSearch = useCallback(() => {
    const context = getSearchContext();
    if (!context) {
      // No context, go to search page
      router.push('/dashboard/search');
      return;
    }

    // Reconstruct search URL with previous state
    const searchUrl = new URL('/dashboard/search', window.location.origin);
    
    if (context.query) {
      searchUrl.searchParams.set('q', context.query);
    }
    
    if (context.filters?.projects?.length) {
      context.filters.projects.forEach((project: string) => {
        searchUrl.searchParams.append('project', project);
      });
    }
    
    if (context.filters?.entityTypes?.length) {
      context.filters.entityTypes.forEach((type: string) => {
        searchUrl.searchParams.append('entityType', type);
      });
    }
    
    if (context.filters?.dateRange) {
      searchUrl.searchParams.set('dateRange', context.filters.dateRange);
    }

    // Add result highlight parameter to scroll to the result
    searchUrl.searchParams.set('highlightResult', context.resultId);

    router.push(searchUrl.pathname + searchUrl.search);
  }, [router]);

  const getSearchContext = useCallback((): SearchContext | null => {
    try {
      const stored = sessionStorage.getItem('searchContext');
      if (!stored) return null;
      
      const context = JSON.parse(stored) as SearchContext;
      
      // Check if context is still valid (not too old)
      const maxAge = 30 * 60 * 1000; // 30 minutes
      if (Date.now() - context.timestamp > maxAge) {
        sessionStorage.removeItem('searchContext');
        return null;
      }
      
      return context;
    } catch (error) {
      console.error('Failed to parse search context:', error);
      sessionStorage.removeItem('searchContext');
      return null;
    }
  }, []);

  const preserveSearchState = useCallback((state: any) => {
    try {
      sessionStorage.setItem('searchState', JSON.stringify({
        ...state,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Failed to preserve search state:', error);
    }
  }, []);

  const restoreSearchState = useCallback(() => {
    try {
      const stored = sessionStorage.getItem('searchState');
      if (!stored) return null;
      
      const state = JSON.parse(stored);
      
      // Check if state is still valid
      const maxAge = 30 * 60 * 1000; // 30 minutes
      if (Date.now() - state.timestamp > maxAge) {
        sessionStorage.removeItem('searchState');
        return null;
      }
      
      return state;
    } catch (error) {
      console.error('Failed to restore search state:', error);
      sessionStorage.removeItem('searchState');
      return null;
    }
  }, []);

  return {
    navigateToResult,
    navigateBackToSearch,
    getSearchContext,
    hasSearchContext: hasContext,
    preserveSearchState,
    restoreSearchState
  };
}