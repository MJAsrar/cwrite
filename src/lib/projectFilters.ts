import { Project } from '@/types';

export interface ProjectFilters {
  sortBy: 'name' | 'created_at' | 'updated_at';
  sortOrder: 'asc' | 'desc';
  status?: 'all' | 'pending' | 'processing' | 'completed' | 'error';
}

export interface ProjectFilterState {
  searchQuery: string;
  filters: ProjectFilters;
}

/**
 * Default filter state
 */
export const DEFAULT_FILTERS: ProjectFilters = {
  sortBy: 'updated_at',
  sortOrder: 'desc',
  status: 'all'
};

export const DEFAULT_FILTER_STATE: ProjectFilterState = {
  searchQuery: '',
  filters: DEFAULT_FILTERS
};

/**
 * Filter projects by search query (name and description)
 */
export function filterProjectsBySearch(projects: Project[], searchQuery: string): Project[] {
  if (!searchQuery.trim()) {
    return projects;
  }

  const query = searchQuery.toLowerCase().trim();
  return projects.filter(project => {
    const nameMatch = project.name.toLowerCase().includes(query);
    const descriptionMatch = project.description?.toLowerCase().includes(query) || false;
    return nameMatch || descriptionMatch;
  });
}

/**
 * Filter projects by status
 */
export function filterProjectsByStatus(projects: Project[], status: string): Project[] {
  if (!status || status === 'all') {
    return projects;
  }

  return projects.filter(project => project.indexing_status === status);
}

/**
 * Sort projects based on the specified criteria
 */
export function sortProjects(projects: Project[], sortBy: string, sortOrder: string): Project[] {
  const sorted = [...projects].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortBy) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'created_at':
        aValue = new Date(a.created_at);
        bValue = new Date(b.created_at);
        break;
      case 'updated_at':
      default:
        aValue = new Date(a.updated_at);
        bValue = new Date(b.updated_at);
        break;
    }

    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  return sorted;
}

/**
 * Apply all filters and sorting to a list of projects
 */
export function applyProjectFilters(
  projects: Project[],
  filterState: ProjectFilterState
): Project[] {
  let filtered = projects;

  // Apply search filter
  filtered = filterProjectsBySearch(filtered, filterState.searchQuery);

  // Apply status filter
  filtered = filterProjectsByStatus(filtered, filterState.filters.status || 'all');

  // Apply sorting
  filtered = sortProjects(filtered, filterState.filters.sortBy, filterState.filters.sortOrder);

  return filtered;
}

/**
 * Convert filter state to URL search parameters
 */
export function filtersToURLParams(filterState: ProjectFilterState): URLSearchParams {
  const params = new URLSearchParams();

  // Add search query
  if (filterState.searchQuery.trim()) {
    params.set('q', filterState.searchQuery.trim());
  }

  // Add filters (only if different from defaults)
  if (filterState.filters.sortBy !== DEFAULT_FILTERS.sortBy) {
    params.set('sortBy', filterState.filters.sortBy);
  }

  if (filterState.filters.sortOrder !== DEFAULT_FILTERS.sortOrder) {
    params.set('sortOrder', filterState.filters.sortOrder);
  }

  if (filterState.filters.status && filterState.filters.status !== DEFAULT_FILTERS.status) {
    params.set('status', filterState.filters.status);
  }

  return params;
}

/**
 * Parse URL search parameters to filter state
 */
export function urlParamsToFilters(searchParams: URLSearchParams): ProjectFilterState {
  const searchQuery = searchParams.get('q') || '';
  
  const filters: ProjectFilters = {
    sortBy: (searchParams.get('sortBy') as any) || DEFAULT_FILTERS.sortBy,
    sortOrder: (searchParams.get('sortOrder') as any) || DEFAULT_FILTERS.sortOrder,
    status: (searchParams.get('status') as any) || DEFAULT_FILTERS.status
  };

  // Validate filter values
  if (!['name', 'created_at', 'updated_at'].includes(filters.sortBy)) {
    filters.sortBy = DEFAULT_FILTERS.sortBy;
  }

  if (!['asc', 'desc'].includes(filters.sortOrder)) {
    filters.sortOrder = DEFAULT_FILTERS.sortOrder;
  }

  if (!['all', 'pending', 'processing', 'completed', 'error'].includes(filters.status || '')) {
    filters.status = DEFAULT_FILTERS.status;
  }

  return {
    searchQuery,
    filters
  };
}

/**
 * Update URL with current filter state
 */
export function updateURLWithFilters(filterState: ProjectFilterState, replace: boolean = false): void {
  if (typeof window === 'undefined') return;

  const params = filtersToURLParams(filterState);
  const url = new URL(window.location.href);
  
  // Clear existing search params
  url.search = '';
  
  // Add new params
  params.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const newUrl = url.toString();
  
  if (replace) {
    window.history.replaceState({}, '', newUrl);
  } else {
    window.history.pushState({}, '', newUrl);
  }
}

/**
 * Get filter state from current URL
 */
export function getFiltersFromURL(): ProjectFilterState {
  if (typeof window === 'undefined') {
    return DEFAULT_FILTER_STATE;
  }

  const searchParams = new URLSearchParams(window.location.search);
  return urlParamsToFilters(searchParams);
}

/**
 * Check if current filters are different from defaults
 */
export function hasActiveFilters(filterState: ProjectFilterState): boolean {
  return (
    filterState.searchQuery.trim() !== '' ||
    filterState.filters.sortBy !== DEFAULT_FILTERS.sortBy ||
    filterState.filters.sortOrder !== DEFAULT_FILTERS.sortOrder ||
    filterState.filters.status !== DEFAULT_FILTERS.status
  );
}

/**
 * Reset filters to default state
 */
export function resetFilters(): ProjectFilterState {
  return { ...DEFAULT_FILTER_STATE };
}

/**
 * Create a filter summary for display
 */
export function getFilterSummary(filterState: ProjectFilterState): string[] {
  const summary: string[] = [];

  if (filterState.searchQuery.trim()) {
    summary.push(`Search: "${filterState.searchQuery.trim()}"`);
  }

  if (filterState.filters.status && filterState.filters.status !== 'all') {
    const statusLabels = {
      pending: 'Pending',
      processing: 'Processing',
      completed: 'Ready',
      error: 'Error'
    };
    summary.push(`Status: ${statusLabels[filterState.filters.status as keyof typeof statusLabels]}`);
  }

  if (filterState.filters.sortBy !== DEFAULT_FILTERS.sortBy || filterState.filters.sortOrder !== DEFAULT_FILTERS.sortOrder) {
    const sortLabels = {
      name: 'Name',
      created_at: 'Date Created',
      updated_at: 'Last Updated'
    };
    const orderLabel = filterState.filters.sortOrder === 'asc' ? 'Oldest First' : 'Newest First';
    summary.push(`Sort: ${sortLabels[filterState.filters.sortBy]} (${orderLabel})`);
  }

  return summary;
}