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
    <div className={`border-4 border-white bg-white ${className}`}>
      {/* Search Header */}
      <div className="p-6 border-b-4 border-[#0A0A0A]">
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
                  className="flex items-center space-x-2 px-4 py-2 border-4 border-[#0A0A0A] bg-transparent text-[#0A0A0A] font-mono text-xs uppercase font-bold hover:bg-[#0A0A0A] hover:text-white transition-all duration-100"
                  style={{ boxShadow: '4px 4px 0 0 #0A0A0A' }}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 0 0 #0A0A0A'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = '4px 4px 0 0 #0A0A0A'}
                >
                  <Save className="w-4 h-4" />
                  <span>SAVE</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Results Tabs */}
      <div className="border-b-4 border-[#0A0A0A]">
        <div className="flex">
          <button
            onClick={() => setActiveTab('results')}
            className={`
              px-6 py-3 font-mono text-xs uppercase font-bold border-r-4 border-[#0A0A0A] transition-all duration-100
              ${activeTab === 'results'
                ? 'bg-[#39FF14] text-[#0A0A0A]'
                : 'bg-white text-gray-600 hover:bg-gray-100'
              }
            `}
          >
            RESULTS
            {searchResponse && (
              <span className="ml-2 px-2 py-0.5 bg-[#0A0A0A] text-white text-xs">
                {searchResponse.total_count}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('saved')}
            className={`
              flex items-center space-x-2 px-6 py-3 font-mono text-xs uppercase font-bold border-r-4 border-[#0A0A0A] transition-all duration-100
              ${activeTab === 'saved'
                ? 'bg-[#39FF14] text-[#0A0A0A]'
                : 'bg-white text-gray-600 hover:bg-gray-100'
              }
            `}
          >
            <Bookmark className="w-4 h-4" />
            <span>SAVED</span>
            {savedSearches.length > 0 && (
              <span className="px-2 py-0.5 bg-[#0A0A0A] text-white text-xs">
                {savedSearches.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`
              flex items-center space-x-2 px-6 py-3 font-mono text-xs uppercase font-bold border-r-4 border-[#0A0A0A] transition-all duration-100
              ${activeTab === 'analytics'
                ? 'bg-[#39FF14] text-[#0A0A0A]'
                : 'bg-white text-gray-600 hover:bg-gray-100'
              }
            `}
          >
            <BarChart3 className="w-4 h-4" />
            <span>ANALYTICS</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`
              flex items-center space-x-2 px-6 py-3 font-mono text-xs uppercase font-bold transition-all duration-100
              ${activeTab === 'history'
                ? 'bg-[#39FF14] text-[#0A0A0A]'
                : 'bg-white text-gray-600 hover:bg-gray-100'
              }
            `}
          >
            <History className="w-4 h-4" />
            <span>HISTORY</span>
            {searchHistory.length > 0 && (
              <span className="px-2 py-0.5 bg-[#0A0A0A] text-white text-xs">
                {searchHistory.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'results' && (
          !query.trim() && !searchResponse ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 border-4 border-gray-300 flex items-center justify-center mx-auto mb-6">
                <History className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-2xl font-black uppercase text-[#0A0A0A] mb-2">
                READY TO SEARCH
              </h3>
              <p className="font-mono text-sm text-gray-600 uppercase">
                ENTER A QUERY TO FIND CONTENT
              </p>
            </div>
          ) : (
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
          )
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
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b-4 border-[#0A0A0A]">
              <h3 className="font-mono text-sm font-bold text-[#0A0A0A] uppercase">
                SEARCH HISTORY ({searchHistory.length})
              </h3>
              {searchHistory.length > 0 && (
                <button
                  onClick={clearSearchHistory}
                  className="font-mono text-xs uppercase text-[#FF073A] hover:text-white hover:bg-[#FF073A] px-3 py-1 border-2 border-[#FF073A] transition-all duration-100"
                >
                  CLEAR ALL
                </button>
              )}
            </div>
            
            {searchHistory.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="font-mono text-sm text-gray-600 uppercase">NO SEARCH HISTORY</p>
              </div>
            ) : (
              <div className="space-y-2">
                {searchHistory.map((historyQuery, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearch(historyQuery)}
                    className="w-full text-left p-4 border-4 border-[#0A0A0A] bg-gray-50 hover:bg-[#39FF14] transition-all duration-100 group"
                  >
                    <div className="flex items-center space-x-3">
                      <History className="w-5 h-5 text-gray-400 group-hover:text-[#0A0A0A]" />
                      <span className="font-mono text-sm text-[#0A0A0A] font-bold">{historyQuery}</span>
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