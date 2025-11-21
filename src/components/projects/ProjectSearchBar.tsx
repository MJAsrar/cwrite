'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, X, ChevronDown } from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { ProjectFilters, DEFAULT_FILTERS } from '@/lib/projectFilters';

interface ProjectSearchBarProps {
  onSearch: (query: string) => void;
  onFilter: (filters: ProjectFilters) => void;
  filters: ProjectFilters;
  placeholder?: string;
}

export default function ProjectSearchBar({
  onSearch,
  onFilter,
  filters,
  placeholder = "Search projects..."
}: ProjectSearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState<ProjectFilters>(filters);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, onSearch]);

  // Update local filters when props change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    onSearch('');
  };

  const handleFilterChange = (key: keyof ProjectFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFilter(newFilters);
  };

  const handleResetFilters = () => {
    setLocalFilters(DEFAULT_FILTERS);
    onFilter(DEFAULT_FILTERS);
  };

  const hasActiveFilters = localFilters.status !== DEFAULT_FILTERS.status || 
                          localFilters.sortBy !== DEFAULT_FILTERS.sortBy || 
                          localFilters.sortOrder !== DEFAULT_FILTERS.sortOrder;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={placeholder}
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 ${hasActiveFilters ? 'border-primary-300 bg-primary-50 text-primary-700' : ''}`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                !
              </span>
            )}
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
              Filter Options
            </h3>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs"
              >
                Reset All
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Sort by */}
            <div>
              <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                Sort by
              </label>
              <select
                value={localFilters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="updated_at">Last Updated</option>
                <option value="created_at">Date Created</option>
                <option value="name">Name</option>
              </select>
            </div>

            {/* Sort order */}
            <div>
              <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                Order
              </label>
              <select
                value={localFilters.sortOrder}
                onChange={(e) => handleFilterChange('sortOrder', e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>

            {/* Status filter */}
            <div>
              <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                Status
              </label>
              <select
                value={localFilters.status}
                onChange={(e) => handleFilterChange('status', e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Projects</option>
                <option value="completed">Ready</option>
                <option value="processing">Processing</option>
                <option value="pending">Pending</option>
                <option value="error">Error</option>
              </select>
            </div>
          </div>

          {/* Active filters summary */}
          {hasActiveFilters && (
            <div className="pt-3 border-t border-secondary-200 dark:border-secondary-700">
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-secondary-600 dark:text-secondary-400">
                  Active filters:
                </span>
                
                {localFilters.status !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-900/20 text-primary-800 dark:text-primary-300 text-xs rounded-full">
                    Status: {localFilters.status}
                    <button
                      onClick={() => handleFilterChange('status', 'all')}
                      className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                
                {(localFilters.sortBy !== DEFAULT_FILTERS.sortBy || localFilters.sortOrder !== DEFAULT_FILTERS.sortOrder) && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-900/20 text-primary-800 dark:text-primary-300 text-xs rounded-full">
                    Sort: {localFilters.sortBy === 'updated_at' ? 'Last Updated' : 
                           localFilters.sortBy === 'created_at' ? 'Date Created' : 'Name'} 
                    ({localFilters.sortOrder === 'desc' ? 'Newest' : 'Oldest'})
                    <button
                      onClick={() => {
                        handleFilterChange('sortBy', DEFAULT_FILTERS.sortBy);
                        handleFilterChange('sortOrder', DEFAULT_FILTERS.sortOrder);
                      }}
                      className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}