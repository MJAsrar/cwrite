'use client';

import { useState, useEffect } from 'react';
import { X, Network, Search, Filter, ArrowRight, RefreshCw, Loader2, CheckCircle } from 'lucide-react';
import { Relationship } from '@/types';
import { api } from '@/lib/api';

interface RelationshipsModalProps {
  relationships: Relationship[];
  isOpen: boolean;
  onClose: () => void;
  onRelationshipClick?: (relationshipId: string) => void;
  theme?: 'sepia' | 'dark' | 'light';
  projectId?: string;
  onRefresh?: () => Promise<void>;
}

export default function RelationshipsModal({ relationships, isOpen, onClose, onRelationshipClick, theme = 'sepia', projectId, onRefresh }: RelationshipsModalProps) {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [filtered, setFiltered] = useState<Relationship[]>(relationships);
  const [isRediscovering, setIsRediscovering] = useState(false);
  const [rediscoverStatus, setRediscoverStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const isDark = theme === 'dark';

  const types = Array.from(new Set(relationships.map(r => r.relationship_type))).sort();

  useEffect(() => {
    let f = relationships;
    if (selectedType) f = f.filter(r => r.relationship_type === selectedType);
    if (search.trim()) {
      const q = search.toLowerCase();
      f = f.filter(r => r.source_entity_name?.toLowerCase().includes(q) || r.target_entity_name?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q));
    }
    f.sort((a, b) => (b.strength || 0) - (a.strength || 0));
    setFiltered(f);
  }, [relationships, search, selectedType]);

  const handleRediscover = async () => {
    if (!projectId) return;
    setIsRediscovering(true);
    setRediscoverStatus('idle');
    try {
      await api.post(`/api/v1/projects/${projectId}/relationships/discover?force_rediscovery=true`);
      setRediscoverStatus('success');
      setTimeout(() => setRediscoverStatus('idle'), 3000);
      if (onRefresh) {
        setTimeout(async () => { await onRefresh(); }, 2000);
      }
    } catch (err) {
      console.error('Relationship re-discovery failed:', err);
      setRediscoverStatus('error');
      setTimeout(() => setRediscoverStatus('idle'), 3000);
    } finally {
      setIsRediscovering(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className={`w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-stone-200'}`}>
        <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-zinc-700' : 'border-stone-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? 'bg-indigo-900/40 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
              <Network className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>Plot & Relationships</h2>
              <p className="text-[10px] opacity-50">{filtered.length} of {relationships.length} connections</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {projectId && (
              <button
                onClick={handleRediscover}
                disabled={isRediscovering}
                title="Re-discover relationships between all entities"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${rediscoverStatus === 'success'
                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                    : rediscoverStatus === 'error'
                      ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                      : isDark
                        ? 'bg-indigo-900/30 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-900/50'
                        : 'bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100'
                  } ${isRediscovering ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {isRediscovering ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Discovering…</>
                ) : rediscoverStatus === 'success' ? (
                  <><CheckCircle className="w-3.5 h-3.5" /> Started!</>
                ) : rediscoverStatus === 'error' ? (
                  <>Failed</>
                ) : (
                  <><RefreshCw className="w-3.5 h-3.5" /> Re-discover</>
                )}
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg opacity-40 hover:opacity-100"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className={`p-3 space-y-2 border-b ${isDark ? 'border-zinc-700' : 'border-stone-200'}`}>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-stone-50 border-stone-200'}`}>
            <Search className="w-3.5 h-3.5 opacity-40" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search relationships…"
              className="flex-1 bg-transparent border-0 outline-none text-xs" />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter className="w-3 h-3 opacity-40" />
            <button onClick={() => setSelectedType(null)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition ${selectedType === null ? 'bg-indigo-600 text-white' : isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-stone-100 text-stone-600'}`}>
              All
            </button>
            {types.map(type => (
              <button key={type} onClick={() => setSelectedType(type)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition ${selectedType === type ? 'bg-indigo-600 text-white' : isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-stone-100 text-stone-600'}`}>
                {type.replace(/_/g, ' ')} ({relationships.filter(r => r.relationship_type === type).length})
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="text-center py-16 opacity-40">
              <Network className="w-10 h-10 mx-auto mb-3" />
              <p className="text-sm font-semibold mb-1">No relationships</p>
              <p className="text-xs">{search ? 'Try different search' : 'Upload files to discover'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(rel => (
                <button key={rel.id}
                  onClick={() => onRelationshipClick?.(rel.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition hover:scale-[1.005] ${isDark ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-750' : 'bg-stone-50 border-stone-200 hover:bg-stone-100'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`px-2.5 py-1 rounded-lg text-sm font-medium truncate flex-1 ${isDark ? 'bg-zinc-700 text-zinc-200' : 'bg-white border border-stone-200'}`}>
                      {rel.source_entity_name || 'Unknown'}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <ArrowRight className="w-3 h-3 opacity-30" />
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-600 text-white whitespace-nowrap">
                        {rel.relationship_type.replace(/_/g, ' ')}
                      </span>
                      <ArrowRight className="w-3 h-3 opacity-30" />
                    </div>
                    <div className={`px-2.5 py-1 rounded-lg text-sm font-medium truncate flex-1 ${isDark ? 'bg-zinc-700 text-zinc-200' : 'bg-white border border-stone-200'}`}>
                      {rel.target_entity_name || 'Unknown'}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    {rel.description && <p className="text-[10px] opacity-50 flex-1">{rel.description}</p>}
                    {rel.strength && (
                      <div className="flex items-center gap-1.5 ml-4 flex-shrink-0">
                        <div className={`w-14 h-1 rounded-full overflow-hidden ${isDark ? 'bg-zinc-700' : 'bg-stone-200'}`}>
                          <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(100, (rel.strength || 0) * 100)}%` }} />
                        </div>
                        <span className="text-[9px] font-medium opacity-50">{Math.round((rel.strength || 0) * 100)}%</span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
