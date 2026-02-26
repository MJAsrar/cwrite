'use client';

import { useState, useEffect } from 'react';
import { X, Users, Filter, Search, User, MapPin, Lightbulb, BookOpen, RefreshCw, Loader2, CheckCircle } from 'lucide-react';
import { Entity, ProjectFile } from '@/types';
import { api } from '@/lib/api';

interface EntitiesModalProps {
  entities: Entity[];
  isOpen: boolean;
  onClose: () => void;
  onEntityClick?: (entityId: string) => void;
  theme?: 'sepia' | 'dark' | 'light';
  projectId?: string;
  files?: ProjectFile[];
  onRefresh?: () => Promise<void>;
}

const ICONS: Record<string, any> = { CHARACTER: User, PERSON: User, LOCATION: MapPin, PLACE: MapPin, THEME: Lightbulb, CONCEPT: Lightbulb, ORGANIZATION: Users, EVENT: BookOpen };

export default function EntitiesModal({ entities, isOpen, onClose, onEntityClick, theme = 'sepia', projectId, files, onRefresh }: EntitiesModalProps) {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [filtered, setFiltered] = useState<Entity[]>(entities);
  const [isReExtracting, setIsReExtracting] = useState(false);
  const [reExtractStatus, setReExtractStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const isDark = theme === 'dark';

  const entityTypes = Array.from(new Set(entities.map(e => e.type))).sort();

  useEffect(() => {
    let f = entities;
    if (selectedType) f = f.filter(e => e.type === selectedType);
    if (search.trim()) {
      const q = search.toLowerCase();
      f = f.filter(e => e.name.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q) || e.aliases?.some(a => a.toLowerCase().includes(q)));
    }
    f.sort((a, b) => (b.mention_count || 0) - (a.mention_count || 0));
    setFiltered(f);
  }, [entities, search, selectedType]);

  const handleReExtract = async () => {
    if (!projectId || !files || files.length === 0) return;
    setIsReExtracting(true);
    setReExtractStatus('idle');
    try {
      const completedFiles = files.filter(f => f.upload_status === 'completed');
      await Promise.all(
        completedFiles.map(f => api.post(`/api/v1/files/${f.id}/reprocess`))
      );
      setReExtractStatus('success');
      setTimeout(() => setReExtractStatus('idle'), 3000);
      if (onRefresh) {
        // Wait a moment for background processing to start, then poll
        setTimeout(async () => { await onRefresh(); }, 2000);
      }
    } catch (err) {
      console.error('Re-extraction failed:', err);
      setReExtractStatus('error');
      setTimeout(() => setReExtractStatus('idle'), 3000);
    } finally {
      setIsReExtracting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className={`w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-stone-200'}`}>
        <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-zinc-700' : 'border-stone-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? 'bg-indigo-900/40 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>Characters & Entities</h2>
              <p className="text-[10px] opacity-50">{filtered.length} of {entities.length} found</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {projectId && files && files.length > 0 && (
              <button
                onClick={handleReExtract}
                disabled={isReExtracting}
                title="Re-extract entities from all files"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${reExtractStatus === 'success'
                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                    : reExtractStatus === 'error'
                      ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                      : isDark
                        ? 'bg-indigo-900/30 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-900/50'
                        : 'bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100'
                  } ${isReExtracting ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {isReExtracting ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Re-extracting…</>
                ) : reExtractStatus === 'success' ? (
                  <><CheckCircle className="w-3.5 h-3.5" /> Started!</>
                ) : reExtractStatus === 'error' ? (
                  <>Failed</>
                ) : (
                  <><RefreshCw className="w-3.5 h-3.5" /> Re-extract</>
                )}
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg opacity-40 hover:opacity-100"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className={`p-3 space-y-2 border-b ${isDark ? 'border-zinc-700' : 'border-stone-200'}`}>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-stone-50 border-stone-200'}`}>
            <Search className="w-3.5 h-3.5 opacity-40" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search characters…"
              className="flex-1 bg-transparent border-0 outline-none text-xs" />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter className="w-3 h-3 opacity-40" />
            <button onClick={() => setSelectedType(null)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition ${selectedType === null ? 'bg-indigo-600 text-white' : isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-stone-100 text-stone-600'}`}>
              All
            </button>
            {entityTypes.map(type => (
              <button key={type} onClick={() => setSelectedType(type)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition capitalize ${selectedType === type ? 'bg-indigo-600 text-white' : isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-stone-100 text-stone-600'}`}>
                {type.toLowerCase()} ({entities.filter(e => e.type === type).length})
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="text-center py-16 opacity-40">
              <Users className="w-10 h-10 mx-auto mb-3" />
              <p className="text-sm font-semibold mb-1">No entities</p>
              <p className="text-xs">{search ? 'Try different search' : 'Upload files to extract'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {filtered.map((entity, i) => {
                const Icon = ICONS[entity.type?.toUpperCase()] || Users;
                return (
                  <button key={entity.id || `e-${i}`}
                    onClick={() => entity.id && onEntityClick?.(entity.id)}
                    className={`text-left p-3 rounded-xl border transition hover:scale-[1.01] active:scale-95 ${isDark ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-750' : 'bg-stone-50 border-stone-200 hover:bg-stone-100'}`}>
                    <div className="flex items-start gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-zinc-700 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{entity.name}</h3>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-indigo-50 text-indigo-600 capitalize">{entity.type.toLowerCase()}</span>
                        {entity.description && <p className="text-[10px] opacity-50 line-clamp-2 mt-1">{entity.description}</p>}
                      </div>
                      <span className="text-[10px] opacity-40">{entity.mention_count || 0}×</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
