'use client';

import { useState } from 'react';
import { Search, X, FileText, Sparkles } from 'lucide-react';
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
        project_ids: [projectId],
        query: query.trim(),
        limit: 20,
        offset: 0,
        similarity_threshold: 0.1,
        search_type: 'hybrid'
      });

      const searchResults: SearchResult[] = (response.results || []).map((result: any) => ({
        chunk_id: result.chunk_id || result.id,
        file_id: result.file_id,
        filename: `Result from file ${result.file_id.slice(-6)}`,
        text: result.content || '',
        score: result.relevance_score || result.similarity_score || 0,
        context: result.highlights?.[0] || result.content || ''
      }));

      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
      alert('SEARCH FAILED');
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
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 pt-20 p-4">
      <div className="border-4 border-white bg-white w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b-4 border-[#0A0A0A]">
          <div className="flex-1 flex items-center gap-2 border-4 border-[#0A0A0A] px-3 py-2">
            <Search className="w-5 h-5 text-[#0A0A0A]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="SEARCH WITH SEMANTIC AI..."
              className="flex-1 bg-transparent border-0 outline-none text-[#0A0A0A] placeholder:text-gray-400 font-mono text-sm uppercase"
              autoFocus
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="border-4 border-[#39FF14] bg-transparent text-[#39FF14] font-mono px-4 py-2 text-xs uppercase font-bold hover:bg-[#39FF14] hover:text-[#0A0A0A] transition-all duration-100 disabled:opacity-50 flex items-center gap-2"
            style={{ boxShadow: '4px 4px 0 0 #39FF14' }}
            onMouseEnter={(e) => (!loading && query.trim()) && (e.currentTarget.style.boxShadow = '0 0 0 0 #39FF14')}
            onMouseLeave={(e) => (!loading && query.trim()) && (e.currentTarget.style.boxShadow = '4px 4px 0 0 #39FF14')}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-t-[#39FF14] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                SEARCHING...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                SEARCH
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="p-2 text-[#0A0A0A] hover:text-[#FF073A] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-[#39FF14] flex items-center justify-center mx-auto mb-4">
                  <div className="w-8 h-8 border-4 border-t-[#39FF14] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                </div>
                <p className="font-mono text-sm text-[#0A0A0A] uppercase font-bold">SEARCHING WITH AI...</p>
              </div>
            </div>
          )}

          {!loading && searched && results.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="font-black text-xl uppercase text-[#0A0A0A] mb-1">NO RESULTS</p>
              <p className="font-mono text-xs text-gray-600 uppercase">TRY A DIFFERENT QUERY</p>
            </div>
          )}

          {!loading && !searched && (
            <div className="text-center py-12">
              <Sparkles className="w-16 h-16 mx-auto mb-4 text-[#39FF14]" />
              <p className="font-black text-xl uppercase text-[#0A0A0A] mb-2">SEMANTIC SEARCH</p>
              <p className="font-mono text-xs text-gray-600 max-w-md mx-auto uppercase leading-relaxed">
                SEARCH BY MEANING, NOT JUST KEYWORDS
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
                  className="w-full text-left p-4 border-4 border-[#0A0A0A] bg-gray-50 hover:bg-[#39FF14] transition-all duration-100 group"
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-1 px-2 py-1 bg-[#39FF14] border-2 border-[#0A0A0A] font-mono text-xs font-bold text-[#0A0A0A] uppercase">
                      <Sparkles className="w-3 h-3" />
                      {Math.round(result.score * 100)}% MATCH
                    </div>
                    <div className="flex items-center gap-1 font-mono text-xs text-gray-600 uppercase">
                      <FileText className="w-3 h-3" />
                      <span className="truncate max-w-[150px]">{result.filename}</span>
                    </div>
                  </div>
                  
                  <p className="font-mono text-xs text-[#0A0A0A] leading-relaxed line-clamp-4">
                    {result.text || result.context}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t-4 border-[#0A0A0A] bg-gray-50">
          <p className="font-mono text-xs text-gray-600 text-center uppercase">
            PRESS ENTER TO SEARCH • ESC TO CLOSE
          </p>
        </div>
      </div>
    </div>
  );
}
