'use client';

import { useState, useEffect } from 'react';
import { SearchResult, SearchResponse } from '@/types';
import { useSearchNavigation } from '@/hooks/useSearchNavigation';
import { 
  FileText, 
  Users, 
  MapPin, 
  Lightbulb, 
  Clock, 
  Star,
  ExternalLink,
  Copy,
  Share2,
  Download,
  BookOpen,
  Tag,
  Calendar
} from 'lucide-react';

interface SearchResultsProps {
  searchResponse: SearchResponse | null;
  loading: boolean;
  onResultClick: (result: SearchResult) => void;
  onSaveResult?: (result: SearchResult) => void;
  savedResults?: string[];
  onExportResults?: () => void;
  onShareResults?: (results: SearchResult[]) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  enableInfiniteScroll?: boolean;
  pageSize?: number;
}

export default function SearchResults({
  searchResponse,
  loading,
  onResultClick,
  onSaveResult,
  savedResults = [],
  onExportResults,
  onShareResults,
  onLoadMore,
  hasMore = false,
  loadingMore = false,
  enableInfiniteScroll = true,
  pageSize = 20
}: SearchResultsProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loadMoreRef, setLoadMoreRef] = useState<HTMLDivElement | null>(null);
  const { navigateToResult, preserveSearchState } = useSearchNavigation();

  const getResultIcon = (type: string, metadata?: any) => {
    if (type === 'entity') {
      switch (metadata?.entity_type) {
        case 'character':
          return <Users className="w-4 h-4 text-blue-600" />;
        case 'location':
          return <MapPin className="w-4 h-4 text-green-600" />;
        case 'theme':
          return <Lightbulb className="w-4 h-4 text-purple-600" />;
        default:
          return <Users className="w-4 h-4 text-secondary-500" />;
      }
    }
    return <FileText className="w-4 h-4 text-secondary-500" />;
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (score >= 0.4) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getRelevanceLabel = (score: number) => {
    if (score >= 0.8) return 'Excellent';
    if (score >= 0.6) return 'Good';
    if (score >= 0.4) return 'Fair';
    return 'Low';
  };

  const formatRelevanceScore = (score: number) => {
    return Math.round(score * 100);
  };

  // Infinite scroll implementation
  useEffect(() => {
    if (!enableInfiniteScroll || !loadMoreRef || !hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && onLoadMore) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef);
    return () => observer.disconnect();
  }, [enableInfiniteScroll, loadMoreRef, hasMore, loadingMore, onLoadMore]);

  const copyToClipboard = async (text: string, resultId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(resultId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleResultClick = (result: SearchResult, event?: React.MouseEvent) => {
    // Preserve current search state for back navigation
    if (searchResponse) {
      preserveSearchState({
        query: searchResponse.query,
        results: searchResponse.results,
        totalCount: searchResponse.total_count,
        scrollPosition: window.scrollY
      });
    }
    
    // Use the navigation hook to handle result navigation
    navigateToResult(result);
    
    // Also call the original click handler if provided
    if (onResultClick) {
      onResultClick(result);
    }
  };

  const highlightText = (text: string, highlights: string[]) => {
    if (!highlights || highlights.length === 0) return text;
    
    let highlightedText = text;
    highlights.forEach(highlight => {
      const regex = new RegExp(`(${highlight})`, 'gi');
      highlightedText = highlightedText.replace(
        regex,
        '<mark class="bg-yellow-200 text-yellow-900 px-1 rounded">$1</mark>'
      );
    });
    
    return highlightedText;
  };

  const exportResults = () => {
    if (!searchResponse || onExportResults) {
      onExportResults?.();
      return;
    }

    // Create CSV content
    const csvContent = [
      ['Title', 'Type', 'Content', 'Relevance Score', 'Entity Type', 'File Name'].join(','),
      ...searchResponse.results.map(result => [
        `"${result.title.replace(/"/g, '""')}"`,
        result.type,
        `"${result.content.replace(/"/g, '""')}"`,
        result.relevance_score,
        result.metadata?.entity_type || '',
        result.metadata?.file_name || ''
      ].join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `search-results-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const shareResults = async () => {
    if (!searchResponse) return;

    if (onShareResults) {
      onShareResults(searchResponse.results);
      return;
    }

    // Create shareable text
    const shareText = `Search Results for "${searchResponse.query}"\n\n` +
      searchResponse.results.slice(0, 5).map((result, index) => 
        `${index + 1}. ${result.title}\n   ${result.content.substring(0, 100)}...\n   Relevance: ${formatRelevanceScore(result.relevance_score)}%\n`
      ).join('\n');

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'CoWriteAI Search Results',
          text: shareText
        });
      } catch (err) {
        // Fallback to clipboard
        copyToClipboard(shareText, 'share');
      }
    } else {
      copyToClipboard(shareText, 'share');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white border border-secondary-200 rounded-lg p-4 animate-pulse">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-secondary-200 rounded"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-secondary-200 rounded w-3/4"></div>
                <div className="h-3 bg-secondary-200 rounded w-1/2"></div>
                <div className="space-y-1">
                  <div className="h-3 bg-secondary-200 rounded"></div>
                  <div className="h-3 bg-secondary-200 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!searchResponse) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-secondary-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-secondary-900 mb-2">
          Ready to search
        </h3>
        <p className="text-secondary-600">
          Enter a search query to find relevant content across your projects.
        </p>
      </div>
    );
  }

  if (searchResponse.results.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-secondary-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-secondary-900 mb-2">
          No results found
        </h3>
        <p className="text-secondary-600 mb-4">
          Try adjusting your search query or filters to find what you're looking for.
        </p>
        {searchResponse.suggestions.length > 0 && (
          <div className="text-left max-w-md mx-auto">
            <p className="text-sm font-medium text-secondary-700 mb-2">
              Try these suggestions:
            </p>
            <div className="space-y-1">
              {searchResponse.suggestions.slice(0, 3).map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => {/* Handle suggestion click */}}
                  className="block w-full text-left px-3 py-2 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 text-sm text-secondary-600">
          <span>
            {searchResponse.total_count.toLocaleString()} results
          </span>
          <span>•</span>
          <span className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{searchResponse.query_time_ms}ms</span>
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={exportResults}
            className="flex items-center space-x-1 px-3 py-1 text-xs text-secondary-600 hover:text-secondary-800 hover:bg-secondary-50 rounded transition-colors"
          >
            <Download className="w-3 h-3" />
            <span>Export</span>
          </button>
          <button
            onClick={shareResults}
            className="flex items-center space-x-1 px-3 py-1 text-xs text-secondary-600 hover:text-secondary-800 hover:bg-secondary-50 rounded transition-colors"
          >
            <Share2 className="w-3 h-3" />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-3">
        {searchResponse.results.map((result) => (
          <div
            key={result.id}
            id={`result-${result.id}`}
            className="bg-white border border-secondary-200 rounded-lg p-4 hover:border-secondary-300 transition-colors cursor-pointer"
            onClick={(e) => handleResultClick(result, e)}
          >
            <div className="flex items-start space-x-3">
              {/* Result Icon */}
              <div className="flex-shrink-0 mt-1">
                {getResultIcon(result.type, result.metadata)}
              </div>

              {/* Result Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-medium text-secondary-900 truncate">
                      {result.title}
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-secondary-500 capitalize">
                        {result.type}
                      </span>
                      {result.metadata?.entity_type && (
                        <>
                          <span className="text-xs text-secondary-300">•</span>
                          <span className="text-xs text-secondary-500 capitalize">
                            {result.metadata.entity_type}
                          </span>
                        </>
                      )}
                      {result.metadata?.file_name && (
                        <>
                          <span className="text-xs text-secondary-300">•</span>
                          <span className="text-xs text-secondary-500">
                            {result.metadata.file_name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Relevance Score */}
                  <div className={`
                    px-3 py-1 rounded-full text-xs font-medium border
                    ${getRelevanceColor(result.relevance_score)}
                  `}>
                    <div className="flex items-center space-x-1">
                      <span>{formatRelevanceScore(result.relevance_score)}%</span>
                      <span className="text-xs opacity-75">
                        {getRelevanceLabel(result.relevance_score)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Result Content */}
                <div className="text-sm text-secondary-700 mb-3">
                  <div
                    className="leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: highlightText(result.content, result.highlights)
                    }}
                  />
                  
                  {/* Additional Context */}
                  {result.metadata && (
                    <div className="mt-3 pt-3 border-t border-secondary-100">
                      <div className="flex flex-wrap gap-2 text-xs">
                        {result.metadata.word_count && (
                          <span className="flex items-center space-x-1 px-2 py-1 bg-blue-50 text-blue-700 rounded">
                            <BookOpen className="w-3 h-3" />
                            <span>{result.metadata.word_count} words</span>
                          </span>
                        )}
                        {result.metadata.chapter && (
                          <span className="flex items-center space-x-1 px-2 py-1 bg-green-50 text-green-700 rounded">
                            <Tag className="w-3 h-3" />
                            <span>Chapter {result.metadata.chapter}</span>
                          </span>
                        )}
                        {result.metadata.created_at && (
                          <span className="flex items-center space-x-1 px-2 py-1 bg-purple-50 text-purple-700 rounded">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(result.metadata.created_at).toLocaleDateString()}</span>
                          </span>
                        )}
                        {result.metadata.similarity_score && result.metadata.metadata_score && (
                          <span className="px-2 py-1 bg-gray-50 text-gray-700 rounded text-xs">
                            Semantic: {Math.round(result.metadata.similarity_score * 100)}% • 
                            Metadata: {Math.round(result.metadata.metadata_score * 100)}%
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Result Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(result.content, result.id);
                      }}
                      className="flex items-center space-x-1 px-2 py-1 text-xs text-secondary-600 hover:text-secondary-800 hover:bg-secondary-50 rounded transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedId === result.id ? 'Copied!' : 'Copy'}</span>
                    </button>

                    {onSaveResult && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSaveResult(result);
                        }}
                        className={`
                          flex items-center space-x-1 px-2 py-1 text-xs rounded transition-colors
                          ${savedResults.includes(result.id)
                            ? 'text-yellow-600 bg-yellow-50'
                            : 'text-secondary-600 hover:text-secondary-800 hover:bg-secondary-50'
                          }
                        `}
                      >
                        <Star className={`w-3 h-3 ${savedResults.includes(result.id) ? 'fill-current' : ''}`} />
                        <span>{savedResults.includes(result.id) ? 'Saved' : 'Save'}</span>
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle share functionality
                      }}
                      className="flex items-center space-x-1 px-2 py-1 text-xs text-secondary-600 hover:text-secondary-800 hover:bg-secondary-50 rounded transition-colors"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>Share</span>
                    </button>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResultClick(result);
                    }}
                    className="flex items-center space-x-1 px-2 py-1 text-xs text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>View</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load More / Infinite Scroll */}
      {hasMore && (
        <div className="pt-6">
          {enableInfiniteScroll ? (
            <div
              ref={setLoadMoreRef}
              className="text-center py-4"
            >
              {loadingMore ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-500 border-t-transparent"></div>
                  <span className="text-sm text-secondary-600">Loading more results...</span>
                </div>
              ) : (
                <div className="text-sm text-secondary-500">
                  Scroll down to load more results
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <button
                onClick={onLoadMore}
                disabled={loadingMore}
                className="px-6 py-3 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingMore ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-500 border-t-transparent"></div>
                    <span>Loading...</span>
                  </div>
                ) : (
                  `Load more results (${searchResponse?.total_count ? searchResponse.total_count - searchResponse.results.length : 0} remaining)`
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pagination Info */}
      {searchResponse && searchResponse.results.length > 0 && (
        <div className="mt-6 pt-4 border-t border-secondary-200">
          <div className="flex items-center justify-between text-sm text-secondary-600">
            <div>
              Showing {searchResponse.results.length} of {searchResponse.total_count.toLocaleString()} results
            </div>
            {searchResponse.results.length >= pageSize && (
              <div>
                {Math.ceil(searchResponse.results.length / pageSize)} page{Math.ceil(searchResponse.results.length / pageSize) !== 1 ? 's' : ''} loaded
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}