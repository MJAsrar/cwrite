'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSearchNavigation } from '@/hooks/useSearchNavigation';
import { ArrowLeft, Search, X } from 'lucide-react';

interface SearchContextIndicatorProps {
  className?: string;
}

export default function SearchContextIndicator({ className = '' }: SearchContextIndicatorProps) {
  const searchParams = useSearchParams();
  const { navigateBackToSearch, getSearchContext } = useSearchNavigation();
  const [searchContext, setSearchContext] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if we arrived from search
    const context = searchParams.get('context');
    const searchId = searchParams.get('searchId');
    
    if (context === 'search' && searchId) {
      const storedContext = getSearchContext();
      if (storedContext) {
        setSearchContext(storedContext);
        setIsVisible(true);
      }
    }
  }, [searchParams, getSearchContext]);

  const handleBackToSearch = () => {
    navigateBackToSearch();
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible || !searchContext) {
    return null;
  }

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              Arrived from search
            </span>
          </div>
          
          {searchContext.query && (
            <div className="text-sm text-blue-700">
              Query: <span className="font-medium">"{searchContext.query}"</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleBackToSearch}
            className="flex items-center space-x-1 px-3 py-1 text-sm text-blue-700 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Back to search</span>
          </button>
          
          <button
            onClick={handleDismiss}
            className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}