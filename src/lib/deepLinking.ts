/**
 * Deep linking utilities for handling direct URL access and navigation state
 */

export interface DeepLinkState {
  searchQuery?: string;
  projectId?: string;
  fileId?: string;
  entityId?: string;
  highlightText?: string;
  scrollTo?: string;
}

/**
 * Parse URL parameters for deep linking state
 */
export function parseDeepLinkParams(searchParams: URLSearchParams): DeepLinkState {
  return {
    searchQuery: searchParams.get('q') || undefined,
    projectId: searchParams.get('project') || undefined,
    fileId: searchParams.get('file') || undefined,
    entityId: searchParams.get('entity') || undefined,
    highlightText: searchParams.get('highlight') || undefined,
    scrollTo: searchParams.get('scrollTo') || undefined,
  };
}

/**
 * Generate URL with deep link parameters
 */
export function generateDeepLink(basePath: string, state: DeepLinkState): string {
  const url = new URL(basePath, window.location.origin);
  
  if (state.searchQuery) {
    url.searchParams.set('q', state.searchQuery);
  }
  if (state.projectId) {
    url.searchParams.set('project', state.projectId);
  }
  if (state.fileId) {
    url.searchParams.set('file', state.fileId);
  }
  if (state.entityId) {
    url.searchParams.set('entity', state.entityId);
  }
  if (state.highlightText) {
    url.searchParams.set('highlight', state.highlightText);
  }
  if (state.scrollTo) {
    url.searchParams.set('scrollTo', state.scrollTo);
  }
  
  return url.pathname + url.search;
}

/**
 * Update URL without navigation (for state preservation)
 */
export function updateUrlState(state: DeepLinkState, replace = true): void {
  const currentPath = window.location.pathname;
  const newUrl = generateDeepLink(currentPath, state);
  
  if (replace) {
    window.history.replaceState(null, '', newUrl);
  } else {
    window.history.pushState(null, '', newUrl);
  }
}

/**
 * Validate route patterns for proper deep linking
 */
export function validateRoute(pathname: string): boolean {
  const validRoutes = [
    /^\/$/,
    /^\/dashboard$/,
    /^\/dashboard\/projects$/,
    /^\/dashboard\/projects\/[^\/]+$/,
    /^\/dashboard\/projects\/[^\/]+\/files$/,
    /^\/dashboard\/search$/,
    /^\/dashboard\/settings$/,
    /^\/auth\/(login|register|forgot-password|verify-email)$/,
  ];
  
  return validRoutes.some(pattern => pattern.test(pathname));
}

/**
 * Get suggested routes based on invalid path
 */
export function getSuggestedRoutes(invalidPath: string): Array<{name: string, href: string, reason: string}> {
  const suggestions = [];
  
  // If it looks like a project path
  if (invalidPath.includes('/projects/')) {
    suggestions.push({
      name: 'Projects',
      href: '/dashboard/projects',
      reason: 'View all projects'
    });
  }
  
  // If it looks like a search path
  if (invalidPath.includes('/search')) {
    suggestions.push({
      name: 'Search',
      href: '/dashboard/search',
      reason: 'Access search functionality'
    });
  }
  
  // Always suggest dashboard
  suggestions.push({
    name: 'Dashboard',
    href: '/dashboard',
    reason: 'Return to main dashboard'
  });
  
  return suggestions;
}