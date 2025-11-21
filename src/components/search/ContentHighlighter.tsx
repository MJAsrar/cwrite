'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { highlightText, scrollToFirstHighlight, findHighlightMatches } from '@/lib/textHighlighting';
import { ChevronUp, ChevronDown, X, Search } from 'lucide-react';

interface ContentHighlighterProps {
  content: string;
  className?: string;
  onHighlightChange?: (hasHighlights: boolean) => void;
}

export default function ContentHighlighter({
  content,
  className = '',
  onHighlightChange
}: ContentHighlighterProps) {
  const searchParams = useSearchParams();
  const contentRef = useRef<HTMLDivElement>(null);
  const [highlightTerms, setHighlightTerms] = useState<string[]>([]);
  const [currentHighlight, setCurrentHighlight] = useState(0);
  const [totalHighlights, setTotalHighlights] = useState(0);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    // Get highlight terms from URL parameters
    const highlight = searchParams.get('highlight');
    const context = searchParams.get('context');
    
    if (highlight && context === 'search') {
      const terms = highlight.split(',').filter(Boolean);
      setHighlightTerms(terms);
      setShowControls(terms.length > 0);
      
      if (onHighlightChange) {
        onHighlightChange(terms.length > 0);
      }
    } else {
      setHighlightTerms([]);
      setShowControls(false);
      if (onHighlightChange) {
        onHighlightChange(false);
      }
    }
  }, [searchParams, onHighlightChange]);

  useEffect(() => {
    if (highlightTerms.length > 0 && contentRef.current) {
      // Count total highlights
      const matches = findHighlightMatches(content, highlightTerms);
      setTotalHighlights(matches.length);
      
      // Scroll to first highlight after a short delay
      setTimeout(() => {
        if (contentRef.current) {
          scrollToFirstHighlight(contentRef.current);
        }
      }, 100);
    }
  }, [content, highlightTerms]);

  const navigateToHighlight = (direction: 'next' | 'prev') => {
    if (!contentRef.current || totalHighlights === 0) return;

    const highlights = contentRef.current.querySelectorAll('[data-highlight]');
    if (highlights.length === 0) return;

    let newIndex;
    if (direction === 'next') {
      newIndex = currentHighlight >= highlights.length - 1 ? 0 : currentHighlight + 1;
    } else {
      newIndex = currentHighlight <= 0 ? highlights.length - 1 : currentHighlight - 1;
    }

    const targetHighlight = highlights[newIndex] as HTMLElement;
    if (targetHighlight) {
      targetHighlight.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
      
      // Remove previous emphasis
      highlights.forEach(h => h.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-75'));
      
      // Add emphasis to current highlight
      targetHighlight.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-75');
      setTimeout(() => {
        targetHighlight.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-75');
      }, 1500);
      
      setCurrentHighlight(newIndex);
    }
  };

  const clearHighlights = () => {
    setHighlightTerms([]);
    setShowControls(false);
    setCurrentHighlight(0);
    setTotalHighlights(0);
    
    if (onHighlightChange) {
      onHighlightChange(false);
    }

    // Update URL to remove highlight parameters
    const url = new URL(window.location.href);
    url.searchParams.delete('highlight');
    url.searchParams.delete('context');
    url.searchParams.delete('searchId');
    window.history.replaceState({}, '', url.toString());
  };

  const highlightedContent = highlightTerms.length > 0 
    ? highlightText(content, highlightTerms, {
        className: 'bg-yellow-200 text-yellow-900 px-1 rounded font-medium'
      })
    : content;

  return (
    <div className={`relative ${className}`}>
      {/* Highlight Controls */}
      {showControls && totalHighlights > 0 && (
        <div className="sticky top-4 z-10 mb-4">
          <div className="inline-flex items-center space-x-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 shadow-sm">
            <Search className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-900 font-medium">
              {totalHighlights} highlight{totalHighlights !== 1 ? 's' : ''} found
            </span>
            
            {totalHighlights > 1 && (
              <>
                <div className="text-sm text-blue-700">
                  {currentHighlight + 1} of {totalHighlights}
                </div>
                
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => navigateToHighlight('prev')}
                    className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded transition-colors"
                    title="Previous highlight"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => navigateToHighlight('next')}
                    className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded transition-colors"
                    title="Next highlight"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
            
            <button
              onClick={clearHighlights}
              className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded transition-colors"
              title="Clear highlights"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Content with Highlights */}
      <div
        ref={contentRef}
        className="prose prose-secondary max-w-none"
        dangerouslySetInnerHTML={{ __html: highlightedContent }}
      />
    </div>
  );
}