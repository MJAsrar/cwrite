'use client';

import { useState } from 'react';
import { Search, X, FileText, Sparkles, Loader2 } from 'lucide-react';
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
  theme?: 'sepia' | 'dark' | 'light';
}

export default function SearchModal({ projectId, isOpen, onClose, onResultClick, theme = 'sepia' }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const isDark = theme === 'dark';
  const modalBg = isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-stone-200';
  const inputBg = isDark ? 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500' : 'bg-stone-50 border-stone-200 text-stone-800 placeholder:text-stone-400';
  const cardBg = isDark ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-750' : 'bg-stone-50 border-stone-200 hover:bg-stone-100';

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const response = await api.post<any>('/api/v1/search/search', {
        project_ids: [projectId], query: query.trim(), limit: 20, offset: 0,
        similarity_threshold: 0.1, search_type: 'hybrid'
      });
      setResults((response.results || []).map((r: any) => ({
        chunk_id: r.chunk_id || r.id, file_id: r.file_id,
        filename: `Result from file ${r.file_id.slice(-6)}`,
        text: r.content || '', score: r.relevance_score || r.similarity_score || 0,
        context: r.highlights?.[0] || r.content || ''
      })));
    } catch { alert('Search failed.'); setResults([]); }
    finally { setLoading(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] p-4 bg-black/40 backdrop-blur-sm">
      <div className={`w-full max-w-2xl max-h-[70vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden ${modalBg}`}>
        <div className="flex items-center gap-2.5 p-3 border-b border-inherit">
          <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border ${inputBg}`}>
            <Search className="w-4 h-4 opacity-40" />
            <input
              type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by meaning…" autoFocus
              className="flex-1 bg-transparent border-0 outline-none text-sm"
            />
          </div>
          <button onClick={handleSearch} disabled={loading || !query.trim()}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-30 flex items-center gap-1.5">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {loading ? 'Searching…' : 'Search'}
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg opacity-40 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              <p className="text-sm opacity-50">Searching with AI…</p>
            </div>
          )}
          {!loading && searched && results.length === 0 && (
            <div className="text-center py-16">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-semibold mb-1">No results found</p>
              <p className="text-xs opacity-50">Try a different query</p>
            </div>
          )}
          {!loading && !searched && (
            <div className="text-center py-16">
              <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-semibold mb-1">Semantic Search</p>
              <p className="text-xs opacity-50">Search by meaning, not just keywords</p>
            </div>
          )}
          {!loading && results.length > 0 && (
            <div className="space-y-2">
              {results.map((r, i) => (
                <button key={`${r.chunk_id}-${i}`}
                  onClick={() => { onResultClick?.(r.file_id, r.chunk_id); onClose(); }}
                  className={`w-full text-left p-3 rounded-xl transition border ${cardBg}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" /> {Math.round(r.score * 100)}%
                    </span>
                    <span className="text-[10px] opacity-40 flex items-center gap-1">
                      <FileText className="w-2.5 h-2.5" /> {r.filename}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed line-clamp-3 opacity-70">{r.text || r.context}</p>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className={`px-3 py-2 border-t text-center text-[10px] opacity-30 ${isDark ? 'border-zinc-700' : 'border-stone-200'}`}>
          Enter to search · Esc to close
        </div>
      </div>
    </div>
  );
}
