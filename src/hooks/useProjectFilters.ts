import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Project } from '@/types';
import {
  ProjectFilterState,
  ProjectFilters,
  DEFAULT_FILTER_STATE,
  applyProjectFilters,
  getFiltersFromURL,
  updateURLWithFilters,
  hasActiveFilters,
  resetFilters,
  getFilterSummary
} from '@/lib/projectFilters';

interface UseProjectFiltersOptions {
  projects: Project[];
  syncWithURL?: boolean;
  debounceMs?: number;
}

interface UseProjectFiltersReturn {
  // State
  filterState: ProjectFilterState;
  filteredProjects: Project[];
  isFiltering: boolean;
  hasActiveFilters: boolean;
  filterSummary: string[];
  
  // Actions
  setSearchQuery: (query: string) => void;
  setFilters: (filters: ProjectFilters) => void;
  updateFilter: (key: keyof ProjectFilters, value: any) => void;
  resetAllFilters: () => void;
  
  // Utilities
  getFilteredCount: () => number;
  getTotalCount: () => number;
}

export function useProjectFilters({
  projects,
  syncWithURL = true,
  debounceMs = 300
}: UseProjectFiltersOptions): UseProjectFiltersReturn {
  // Track if this is the initial mount
  const [isInitialMount, setIsInitialMount] = useState(true);
  
  // Initialize state from URL if sync is enabled
  const [filterState, setFilterState] = useState<ProjectFilterState>(() => {
    if (syncWithURL && typeof window !== 'undefined') {
      return getFiltersFromURL();
    }
    return DEFAULT_FILTER_STATE;
  });
  
  // Track the last synced filter state to prevent unnecessary URL updates
  // Initialize with the current filter state
  const lastSyncedStateRef = useRef<string>(
    JSON.stringify({
      searchQuery: filterState.searchQuery,
      filters: filterState.filters
    })
  );
  
  // Track the last applied filter to prevent redundant filtering
  const lastAppliedFilterRef = useRef<string>('');

  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [isFiltering, setIsFiltering] = useState(false);
  
  // Mark initial mount as complete
  useEffect(() => {
    setIsInitialMount(false);
  }, []);

  // Create a stable key from filter state values to prevent unnecessary re-renders
  const filterKey = useMemo(() => {
    return JSON.stringify({
      searchQuery: filterState.searchQuery,
      sortBy: filterState.filters.sortBy,
      sortOrder: filterState.filters.sortOrder,
      status: filterState.filters.status
    });
  }, [
    filterState.searchQuery,
    filterState.filters.sortBy,
    filterState.filters.sortOrder,
    filterState.filters.status
  ]);

  // Apply filters whenever projects or filter criteria actually change
  useEffect(() => {
    // Create a combined key of projects + filters
    const currentKey = `${projects.length}:${filterKey}`;
    
    // Skip if nothing actually changed
    if (currentKey === lastAppliedFilterRef.current) {
      return;
    }
    
    lastAppliedFilterRef.current = currentKey;
    setIsFiltering(true);

    // Debounce the filtering operation
    const timer = setTimeout(() => {
      const filtered = applyProjectFilters(projects, filterState);
      setFilteredProjects(filtered);
      setIsFiltering(false);
    }, debounceMs);

    return () => {
      clearTimeout(timer);
    };
    // Use filterKey instead of filterState to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, filterKey, debounceMs]);

  // Sync with URL when filter state changes (but skip on initial mount)
  useEffect(() => {
    if (syncWithURL && !isInitialMount) {
      // Create a stable string representation of the filter state
      const currentStateKey = JSON.stringify({
        searchQuery: filterState.searchQuery,
        filters: filterState.filters
      });
      
      // Only update URL if the filter state actually changed
      if (currentStateKey !== lastSyncedStateRef.current) {
        lastSyncedStateRef.current = currentStateKey;
        updateURLWithFilters(filterState, true);
      }
    }
    // Note: syncWithURL is intentionally not in dependencies to avoid infinite loops
    // when the prop changes. We only want to update URL when filterState changes.
    // isInitialMount is also excluded to prevent the effect from running twice on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterState]);

  // Handle browser back/forward navigation
  useEffect(() => {
    if (!syncWithURL || typeof window === 'undefined') return;

    const handlePopState = () => {
      const urlFilters = getFiltersFromURL();
      // Update the ref to prevent re-syncing to URL
      lastSyncedStateRef.current = JSON.stringify({
        searchQuery: urlFilters.searchQuery,
        filters: urlFilters.filters
      });
      setFilterState(urlFilters);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
    // syncWithURL is intentionally not in dependencies - we set up the listener once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Actions
  const setSearchQuery = useCallback((query: string) => {
    setFilterState(prev => ({
      ...prev,
      searchQuery: query
    }));
  }, []);

  const setFilters = useCallback((filters: ProjectFilters) => {
    setFilterState(prev => ({
      ...prev,
      filters
    }));
  }, []);

  const updateFilter = useCallback((key: keyof ProjectFilters, value: any) => {
    setFilterState(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [key]: value
      }
    }));
  }, []);

  const resetAllFilters = useCallback(() => {
    setFilterState(resetFilters());
  }, []);

  // Utilities
  const getFilteredCount = useCallback(() => {
    return filteredProjects.length;
  }, [filteredProjects]);

  const getTotalCount = useCallback(() => {
    return projects.length;
  }, [projects]);

  const activeFilters = hasActiveFilters(filterState);
  const filterSummary = getFilterSummary(filterState);

  return {
    // State
    filterState,
    filteredProjects,
    isFiltering,
    hasActiveFilters: activeFilters,
    filterSummary,
    
    // Actions
    setSearchQuery,
    setFilters,
    updateFilter,
    resetAllFilters,
    
    // Utilities
    getFilteredCount,
    getTotalCount
  };
}