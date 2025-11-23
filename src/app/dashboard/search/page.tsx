'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import SearchInterface from '@/components/search/SearchInterface';
import { Project } from '@/types';
import { api } from '@/lib/api';
import { useSearchNavigation } from '@/hooks/useSearchNavigation';
import { Search, AlertCircle, RefreshCw } from 'lucide-react';

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
      setError(err.message || 'FAILED TO LOAD PROJECTS');
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
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-5xl md:text-6xl font-black uppercase mb-2 text-white">
              SEARCH
            </h1>
            <p className="font-mono text-sm text-gray-400 uppercase">
              SEMANTIC SEARCH / NATURAL LANGUAGE QUERIES
            </p>
          </div>

          <div className="border-4 border-white bg-white p-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 border-4 border-[#39FF14] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-t-[#39FF14] border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
              </div>
              <p className="font-mono text-sm text-[#0A0A0A] uppercase font-bold">
                LOADING SEARCH INTERFACE...
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-5xl md:text-6xl font-black uppercase mb-2 text-white">
              SEARCH
            </h1>
            <p className="font-mono text-sm text-gray-400 uppercase">
              SEMANTIC SEARCH / NATURAL LANGUAGE QUERIES
            </p>
          </div>

          <div className="border-4 border-[#FF073A] bg-white p-8">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-[#FF073A] mx-auto mb-4" />
              <h3 className="text-2xl font-black uppercase text-[#0A0A0A] mb-2">
                ERROR
              </h3>
              <p className="font-mono text-sm text-gray-600 mb-6 uppercase">
                {error}
              </p>
              <button
                onClick={loadProjects}
                className="border-4 border-[#FF073A] bg-transparent text-[#FF073A] font-mono px-6 py-3 text-sm uppercase font-bold hover:bg-[#FF073A] hover:text-white transition-all duration-100 inline-flex items-center gap-2"
                style={{ boxShadow: '6px 6px 0 0 #FF073A' }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 0 0 #FF073A'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = '6px 6px 0 0 #FF073A'}
              >
                <RefreshCw className="w-4 h-4" />
                RETRY
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl md:text-6xl font-black uppercase mb-2 text-white">
            SEARCH
          </h1>
          <p className="font-mono text-sm text-gray-400 uppercase">
            {projects.length} PROJECTS / {projects.reduce((sum, p) => sum + (p.file_count || 0), 0)} FILES / {projects.reduce((sum, p) => sum + (p.entity_count || 0), 0)} ENTITIES
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
          <div className="border-4 border-[#39FF14] bg-[#39FF14]/10 p-6">
            <h3 className="font-mono text-xs uppercase font-bold text-[#39FF14] mb-4">
              SEARCH TIPS:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs text-gray-300">
              <div>
                <span className="text-[#39FF14]">→</span> USE NATURAL LANGUAGE QUERIES
              </div>
              <div>
                <span className="text-[#39FF14]">→</span> SEARCH BY CHARACTER / LOCATION / THEME
              </div>
              <div>
                <span className="text-[#39FF14]">→</span> FILTER BY PROJECT OR DATE
              </div>
              <div>
                <span className="text-[#39FF14]">→</span> SEMANTIC SIMILARITY MATCHING
              </div>
            </div>
          </div>

          {/* Empty State */}
          {projects.length === 0 && (
            <div className="border-4 border-white bg-white p-8 text-center">
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-2xl font-black uppercase text-[#0A0A0A] mb-2">
                NO PROJECTS
              </h3>
              <p className="font-mono text-sm text-gray-600 mb-6 uppercase">
                CREATE A PROJECT TO START SEARCHING
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="border-4 border-[#39FF14] bg-transparent text-[#39FF14] font-mono px-6 py-3 text-sm uppercase font-bold hover:bg-[#39FF14] hover:text-[#0A0A0A] transition-all duration-100"
                style={{ boxShadow: '6px 6px 0 0 #39FF14' }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 0 0 #39FF14'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = '6px 6px 0 0 #39FF14'}
              >
                GO TO DASHBOARD →
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]">
        <div className="border-4 border-[#39FF14] p-8">
          <p className="font-mono text-[#39FF14] uppercase">LOADING...</p>
        </div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
