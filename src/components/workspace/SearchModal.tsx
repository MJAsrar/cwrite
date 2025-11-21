'use client';

import { useState } from 'react';
import { Search, X, FileText, Loader2, Sparkles } from 'lucide-react';
import Button from '@/components/ui/Button';
import { api } from '@/lib/api';

interface SearchResult {
  chunk_id: string;
  file_id: string;
  filename: string;
  text: string;
  score: number;
  context: string;
}

interface SearchModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onResultClick?: (fileId: string, chunkId: string) => void;
}

export default function SearchModal({ projectId, isOpen, onClose, onResultClick }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);

    try {
      const response = await api.post<any>('/api/v1/search/search', {
        project_ids: [projectId],  // Backend expects array
        query: query.trim(),
        limit: 20,
        offset: 0,
        similarity_threshold: 0.1,
        search_type: 'hybrid'
      });

      // Transform backend response to our format
      const searchResults: SearchResult[] = (response.results || []).map((result: any) => ({
        chunk_id: result.chunk_id || result.id,
        file_id: result.file_id,
        filename: `Result from file ${result.file_id.slice(-6)}`, // Simplified filename
        text: result.content || '',  // The actual matching text chunk
        score: result.relevance_score || result.similarity_score || 0,
        context: result.highlights?.[0] || result.content || ''  // Use highlights for preview
      }));

      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
      alert('Search failed. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm pt-20">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <div className="flex-1 flex items-center gap-2 bg-background rounded-lg px-3 py-2">
            <Search className="w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search across all files with semantic search..."
              className="flex-1 bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground"
              autoFocus
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Search
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
                <p className="text-muted-foreground">Searching with AI...</p>
              </div>
            </div>
          )}

          {!loading && searched && results.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-foreground font-medium mb-1">No results found</p>
              <p className="text-muted-foreground text-sm">Try a different search query</p>
            </div>
          )}

          {!loading && !searched && (
            <div className="text-center py-12">
              <Sparkles className="w-12 h-12 mx-auto mb-3 text-primary opacity-50" />
              <p className="text-foreground font-medium mb-1">Semantic Search</p>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Search by meaning, not just keywords. Results show the actual text passages that match your query.
              </p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-3">
              {results.map((result, index) => (
                <button
                  key={`${result.chunk_id}-${index}`}
                  onClick={() => {
                    if (onResultClick) {
                      onResultClick(result.file_id, result.chunk_id);
                    }
                    onClose();
                  }}
                  className="w-full text-left p-4 bg-background hover:bg-accent rounded-lg border border-border transition-colors group"
                >
                  {/* Score Badge */}
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded text-xs font-medium text-primary">
                      <Sparkles className="w-3 h-3" />
                      {Math.round(result.score * 100)}% match
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <FileText className="w-3 h-3" />
                      <span className="truncate max-w-[150px]">{result.filename}</span>
                    </div>
                  </div>
                  
                  {/* Main Text Content - This is what matched! */}
                  <p className="text-sm text-foreground leading-relaxed line-clamp-4 group-hover:text-foreground">
                    {result.text || result.context}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            Press <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-xs">Enter</kbd> to search •{' '}
            <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-xs">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
}

