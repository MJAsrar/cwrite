'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import SearchInterface from '@/components/search/SearchInterface';
import { Project } from '@/types';
import { api } from '@/lib/api';
import { useSearchNavigation } from '@/hooks/useSearchNavigation';
import { Search, AlertCircle, RefreshCcw } from 'lucide-react';

export const dynamic = 'force-dynamic';

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { restoreSearchState } = useSearchNavigation();

  const [mounted, setMounted] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoredState, setRestoredState] = useState<any>(null);

  const initialQuery = searchParams.get('q') || '';
  const initialProjectId = searchParams.get('project') || undefined;
  const highlightResultId = searchParams.get('highlightResult');

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const projectsData = await api.projects.list();
      setProjects(Array.isArray(projectsData) ? projectsData : []);

      const restored = restoreSearchState();
      if (restored) {
        setRestoredState(restored);
      }
    } catch (err: any) {
      console.error('Failed to load projects:', err);
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [restoreSearchState]);

  useEffect(() => {
    if (mounted) {
      loadProjects();
    }
  }, [mounted, loadProjects]);

  if (!mounted || loading) {
    return (
      <DashboardLayout>
        <div className="p-6 sm:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1
                className="text-3xl font-bold tracking-tight mb-1.5 text-stone-900"
                style={{ fontFamily: 'var(--font-playfair), Georgia, serif', letterSpacing: '-0.02em' }}
              >
                Semantic Search
              </h1>
              <p className="text-sm text-stone-500">Search across all your projects using natural language</p>
            </div>
            <div className="flex items-center justify-center h-48">
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: '#D97706', borderTopColor: 'transparent' }}
                />
                <p className="text-sm font-medium text-stone-500">Loading search interface…</p>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="p-6 sm:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1
                className="text-3xl font-bold tracking-tight mb-1.5 text-stone-900"
                style={{ fontFamily: 'var(--font-playfair), Georgia, serif', letterSpacing: '-0.02em' }}
              >
                Semantic Search
              </h1>
              <p className="text-sm text-stone-500">Search across all your projects using natural language</p>
            </div>
            <div className="rounded-2xl p-8 text-center max-w-lg mx-auto bg-red-50 border border-red-200">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
              <h3 className="text-xl font-bold mb-2 text-red-900">Unable to Load</h3>
              <p className="text-sm mb-6 max-w-sm mx-auto text-red-700">{error}</p>
              <button
                onClick={loadProjects}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl border transition-all bg-white text-red-700 border-red-200 hover:bg-red-50"
              >
                <RefreshCcw className="w-4 h-4" /> Try Again
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 sm:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8 pb-6 border-b border-stone-200">
            <h1
              className="text-3xl font-bold tracking-tight mb-1.5 text-stone-900"
              style={{ fontFamily: 'var(--font-playfair), Georgia, serif', letterSpacing: '-0.02em' }}
            >
              Semantic Search
            </h1>
            <p className="text-sm text-stone-500">
              {projects.length} projects · {projects.reduce((sum, p) => sum + (p.file_count || 0), 0)} files · {projects.reduce((sum, p) => sum + (p.entity_count || 0), 0)} entities
            </p>
          </div>

          {/* Search Interface */}
          <div className="space-y-6">
            <SearchInterface
              projects={projects}
              projectId={initialProjectId}
              initialQuery={initialQuery}
              restoredState={restoredState}
              highlightResultId={highlightResultId || undefined}
            />

            {/* Search Tips */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-800 mb-4">
                Search Tips
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-stone-600">
                <div className="flex items-start gap-2">
                  <span className="text-amber-600 mt-0.5">→</span>
                  <span>Use natural language queries</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-600 mt-0.5">→</span>
                  <span>Search by character, location, or theme</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-600 mt-0.5">→</span>
                  <span>Filter by project or date</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-600 mt-0.5">→</span>
                  <span>Semantic similarity matching</span>
                </div>
              </div>
            </div>

            {/* Empty State */}
            {projects.length === 0 && (
              <div className="rounded-2xl p-10 text-center border-2 border-dashed border-stone-200">
                <Search className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-stone-900">No Projects</h3>
                <p className="text-sm text-stone-500 mb-6">
                  Create a project to start searching
                </p>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-xl text-white transition-all bg-amber-900 hover:bg-amber-950"
                >
                  Go to Dashboard →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#FCFAF7]">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: '#D97706', borderTopColor: 'transparent' }}
          />
          <p className="text-sm font-medium text-stone-500">Loading…</p>
        </div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
