'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  SearchQuery, 
  SearchResponse, 
  SearchFilters as SearchFiltersType, 
  SearchResult,
  Project 
} from '@/types';
import { api } from '@/lib/api';
import SearchInput from './SearchInput';
import SearchFilters from './SearchFilters';
import SearchResults from './SearchResults';
import SavedSearches from './SavedSearches';
import SearchAnalytics from './SearchAnalytics';
import SearchResultsExport from './SearchResultsExport';
import { Save, History, Bookmark, BarChart3, Download } from 'lucide-react';

interface SearchInterfaceProps {
  projectId?: string;
  projects: Project[];
  className?: string;
  initialQuery?: string;
  restoredState?: any;
  highlightResultId?: string;
}

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: SearchFiltersType;
  created_at: string;
  last_used?: string;
  result_count?: number;
}

export default function SearchInterface({
  projectId,
  projects,
  className = '',
  initialQuery = '',
  restoredState,
  highlightResultId
}: SearchInterfaceProps) {
  const router = useRouter();
  
  // Search state
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<SearchFiltersType>({
    entity_types: [],
    projects: projectId ? [projectId] : [],
    date_range: undefined
  });
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(restoredState?.results ? {
    results: restoredState.results,
    total_count: restoredState.totalCount,
    query_time_ms: 0,
    query: restoredState.query,
    suggestions: []
  } : null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  
  // UI state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'results' | 'saved' | 'history' | 'analytics'>('results');
  const [showExportModal, setShowExportModal] = useState(false);
  
  // History and saved searches
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [savedResults, setSavedResults] = useState<string[]>([]);

  // Load data from localStorage on mount and handle restored state
  useEffect(() => {
    const history = localStorage.getItem('search_history');
    if (history) {
      setSearchHistory(JSON.parse(history));
    }

    const saved = localStorage.getItem('saved_searches');
    if (saved) {
      setSavedSearches(JSON.parse(saved));
    }

    const savedResultsData = localStorage.getItem('saved_results');
    if (savedResultsData) {
      setSavedResults(JSON.parse(savedResultsData));
    }

    // If we have restored state, restore scroll position
    if (restoredState?.scrollPosition) {
      setTimeout(() => {
        window.scrollTo(0, restoredState.scrollPosition);
      }, 100);
    }

    // If we have a result to highlight, scroll to it
    if (highlightResultId && searchResponse) {
      setTimeout(() => {
        const element = document.getElementById(`result-${highlightResultId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50');
          }, 3000);
        }
      }, 200);
    }
  }, [restoredState, highlightResultId, searchResponse]);

  // Fetch suggestions function
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    try {
      const response = await api.search.suggestions(searchQuery);
      setSuggestions((response as any).suggestions || []);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      setSuggestions([]);
    }
  }, []);

  // Query validation function
  const validateQuery = useCallback((query: string): string | null => {
    if (query.length > 500) {
      return 'Search query is too long (maximum 500 characters)';
    }
    
    // Check for potentially problematic patterns
    if (query.match(/[<>]/)) {
      return 'Search query contains invalid characters';
    }
    
    return null;
  }, []);

  const performSearch = useCallback(async (
    searchQuery: string, 
    searchFilters: SearchFiltersType, 
    offset: number = 0,
    append: boolean = false
  ) => {
    if (!searchQuery.trim()) return;

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setCurrentOffset(0);
    }
    
    setActiveTab('results');

    try {
      const searchRequest: SearchQuery = {
        text: searchQuery.trim(),
        filters: searchFilters,
        limit: 20,
        offset: offset
      };

      const response = await api.search.query(searchRequest);
      const searchResponseData = response as SearchResponse;

      if (append && searchResponse) {
        // Append new results to existing ones
        setSearchResponse({
          ...searchResponseData,
          results: [...searchResponse.results, ...searchResponseData.results]
        });
      } else {
        // Replace with new results
        setSearchResponse(searchResponseData);
      }

      // Update pagination state
      const newOffset = offset + searchResponseData.results.length;
      setCurrentOffset(newOffset);
      setHasMore(newOffset < searchResponseData.total_count);

      // Add to search history (only for new searches, not pagination)
      if (!append) {
        const newHistory = [searchQuery, ...searchHistory.filter(h => h !== searchQuery)].slice(0, 10);
        setSearchHistory(newHistory);
        localStorage.setItem('search_history', JSON.stringify(newHistory));
      }

    } catch (error) {
      console.error('Search failed:', error);
      if (!append) {
        setSearchResponse({
          results: [],
          total_count: 0,
          query_time_ms: 0,
          query: searchQuery,
          suggestions: []
        });
        setHasMore(false);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [searchHistory, searchResponse]);

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    performSearch(searchQuery, filters);
  };

  const handleFiltersChange = (newFilters: SearchFiltersType) => {
    setFilters(newFilters);
    if (query.trim()) {
      performSearch(query, newFilters, 0, false);
    }
  };

  const handleLoadMore = useCallback(() => {
    if (query.trim() && hasMore && !loadingMore) {
      performSearch(query, filters, currentOffset, true);
    }
  }, [query, filters, currentOffset, hasMore, loadingMore, performSearch]);

  const handleResultClick = (result: SearchResult) => {
    // Navigate to the result based on its type
    if (result.type === 'document' && result.metadata?.file_id) {
      router.push(`/dashboard/projects/${result.metadata.project_id}/files/${result.metadata.file_id}`);
    } else if (result.type === 'entity' && result.metadata?.entity_id) {
      router.push(`/dashboard/projects/${result.metadata.project_id}/entities/${result.metadata.entity_id}`);
    }
  };

  const saveCurrentSearch = () => {
    if (!query.trim()) return;

    const searchName = prompt('Enter a name for this search:');
    if (!searchName) return;

    const newSavedSearch: SavedSearch = {
      id: Date.now().toString(),
      name: searchName,
      query: query,
      filters: filters,
      created_at: new Date().toISOString(),
      result_count: searchResponse?.total_count
    };

    const newSavedSearches = [newSavedSearch, ...savedSearches];
    setSavedSearches(newSavedSearches);
    localStorage.setItem('saved_searches', JSON.stringify(newSavedSearches));
  };

  const loadSavedSearch = (search: SavedSearch) => {
    setQuery(search.query);
    setFilters(search.filters);
    performSearch(search.query, search.filters, 0, false);

    // Update last used
    const updatedSearches = savedSearches.map(s => 
      s.id === search.id 
        ? { ...s, last_used: new Date().toISOString() }
        : s
    );
    setSavedSearches(updatedSearches);
    localStorage.setItem('saved_searches', JSON.stringify(updatedSearches));
  };

  const deleteSavedSearch = (searchId: string) => {
    const updatedSearches = savedSearches.filter(s => s.id !== searchId);
    setSavedSearches(updatedSearches);
    localStorage.setItem('saved_searches', JSON.stringify(updatedSearches));
  };

  const renameSavedSearch = (searchId: string, newName: string) => {
    const updatedSearches = savedSearches.map(s => 
      s.id === searchId ? { ...s, name: newName } : s
    );
    setSavedSearches(updatedSearches);
    localStorage.setItem('saved_searches', JSON.stringify(updatedSearches));
  };

  const saveResult = (result: SearchResult) => {
    const newSavedResults = savedResults.includes(result.id)
      ? savedResults.filter(id => id !== result.id)
      : [...savedResults, result.id];
    
    setSavedResults(newSavedResults);
    localStorage.setItem('saved_results', JSON.stringify(newSavedResults));
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('search_history');
  };

  return (
    <div className={`bg-white rounded-lg border border-secondary-200 ${className}`}>
      {/* Search Header */}
      <div className="p-4 border-b border-secondary-200">
        <div className="space-y-4">
          {/* Search Input */}
          <SearchInput
            value={query}
            onChange={setQuery}
            onSearch={handleSearch}
            suggestions={suggestions}
            searchHistory={searchHistory}
            loading={loading}
            onClearHistory={clearSearchHistory}
            onSuggestionsFetch={fetchSuggestions}
            debounceMs={500}
            maxSuggestions={8}
            maxHistory={10}
            validateQuery={validateQuery}
          />

          {/* Search Controls */}
          <div className="flex items-center justify-between">
            <SearchFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              projects={projects}
              showAdvanced={showAdvancedFilters}
              onToggleAdvanced={() => setShowAdvancedFilters(!showAdvancedFilters)}
            />

            <div className="flex items-center space-x-2">
              {query.trim() && (
                <button
                  onClick={saveCurrentSearch}
                  className="flex items-center space-x-1 px-3 py-2 text-sm text-secondary-600 hover:text-secondary-800 hover:bg-secondary-50 rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Search</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Results Tabs */}
      <div className="border-b border-secondary-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab('results')}
            className={`
              px-4 py-3 text-sm font-medium border-b-2 transition-colors
              ${activeTab === 'results'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-secondary-600 hover:text-secondary-800'
              }
            `}
          >
            Results
            {searchResponse && (
              <span className="ml-2 px-2 py-0.5 bg-secondary-100 text-secondary-600 rounded-full text-xs">
                {searchResponse.total_count}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('saved')}
            className={`
              flex items-center space-x-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors
              ${activeTab === 'saved'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-secondary-600 hover:text-secondary-800'
              }
            `}
          >
            <Bookmark className="w-4 h-4" />
            <span>Saved</span>
            {savedSearches.length > 0 && (
              <span className="px-2 py-0.5 bg-secondary-100 text-secondary-600 rounded-full text-xs">
                {savedSearches.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`
              flex items-center space-x-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors
              ${activeTab === 'analytics'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-secondary-600 hover:text-secondary-800'
              }
            `}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`
              flex items-center space-x-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors
              ${activeTab === 'history'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-secondary-600 hover:text-secondary-800'
              }
            `}
          >
            <History className="w-4 h-4" />
            <span>History</span>
            {searchHistory.length > 0 && (
              <span className="px-2 py-0.5 bg-secondary-100 text-secondary-600 rounded-full text-xs">
                {searchHistory.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'results' && (
          <SearchResults
            searchResponse={searchResponse}
            loading={loading}
            loadingMore={loadingMore}
            hasMore={hasMore}
            onResultClick={handleResultClick}
            onSaveResult={saveResult}
            savedResults={savedResults}
            onExportResults={() => setShowExportModal(true)}
            onLoadMore={handleLoadMore}
            enableInfiniteScroll={true}
            pageSize={20}
          />
        )}

        {activeTab === 'analytics' && projectId && (
          <SearchAnalytics projectId={projectId} />
        )}

        {activeTab === 'saved' && (
          <SavedSearches
            savedSearches={savedSearches}
            onLoadSearch={loadSavedSearch}
            onDeleteSearch={deleteSavedSearch}
            onRenameSearch={renameSavedSearch}
          />
        )}

        {activeTab === 'history' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-secondary-900">
                Search History ({searchHistory.length})
              </h3>
              {searchHistory.length > 0 && (
                <button
                  onClick={clearSearchHistory}
                  className="text-xs text-secondary-500 hover:text-secondary-700 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
            
            {searchHistory.length === 0 ? (
              <div className="text-center py-8">
                <History className="w-8 h-8 text-secondary-300 mx-auto mb-3" />
                <p className="text-sm text-secondary-600">No search history</p>
              </div>
            ) : (
              <div className="space-y-2">
                {searchHistory.map((historyQuery, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearch(historyQuery)}
                    className="w-full text-left p-3 bg-secondary-50 hover:bg-secondary-100 rounded-lg transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <History className="w-4 h-4 text-secondary-400" />
                      <span className="text-sm text-secondary-700">{historyQuery}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && searchResponse && (
        <SearchResultsExport
          results={searchResponse.results}
          query={query}
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}