'use client';

import { useState } from 'react';
import { Filter, X, Calendar, FolderOpen, Users, MapPin, Lightbulb } from 'lucide-react';
import { SearchFilters as SearchFiltersType, Project } from '@/types';

interface SearchFiltersProps {
  filters: SearchFiltersType;
  onFiltersChange: (filters: SearchFiltersType) => void;
  projects: Project[];
  showAdvanced?: boolean;
  onToggleAdvanced?: () => void;
}

export default function SearchFilters({
  filters,
  onFiltersChange,
  projects,
  showAdvanced = false,
  onToggleAdvanced
}: SearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const entityTypes = [
    { id: 'character', label: 'Characters', icon: Users, color: 'text-blue-600' },
    { id: 'location', label: 'Locations', icon: MapPin, color: 'text-green-600' },
    { id: 'theme', label: 'Themes', icon: Lightbulb, color: 'text-purple-600' }
  ];

  const updateFilters = (updates: Partial<SearchFiltersType>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const toggleEntityType = (entityType: string) => {
    const currentTypes = filters.entity_types || [];
    const newTypes = currentTypes.includes(entityType)
      ? currentTypes.filter(t => t !== entityType)
      : [...currentTypes, entityType];
    updateFilters({ entity_types: newTypes });
  };

  const toggleProject = (projectId: string) => {
    const currentProjects = filters.projects || [];
    const newProjects = currentProjects.includes(projectId)
      ? currentProjects.filter(p => p !== projectId)
      : [...currentProjects, projectId];
    updateFilters({ projects: newProjects });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      entity_types: [],
      projects: [],
      date_range: undefined
    });
  };

  const hasActiveFilters = 
    (filters.entity_types && filters.entity_types.length > 0) ||
    (filters.projects && filters.projects.length > 0) ||
    filters.date_range;

  const activeFilterCount = 
    (filters.entity_types?.length || 0) +
    (filters.projects?.length || 0) +
    (filters.date_range ? 1 : 0);

  return (
    <div className="relative">
      {/* Filter Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors
          ${hasActiveFilters
            ? 'border-primary-300 bg-primary-50 text-primary-700'
            : 'border-secondary-300 bg-white text-secondary-600 hover:bg-secondary-50'
          }
        `}
      >
        <Filter className="w-4 h-4" />
        <span className="text-sm font-medium">Filters</span>
        {activeFilterCount > 0 && (
          <span className="bg-primary-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[1.25rem] text-center">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Filter Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-secondary-200 rounded-lg shadow-lg z-50">
          <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-secondary-900">Search Filters</h3>
              <div className="flex items-center space-x-2">
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="text-xs text-secondary-500 hover:text-secondary-700 transition-colors"
                  >
                    Clear all
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-secondary-400 hover:text-secondary-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Entity Types */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Entity Types
              </label>
              <div className="space-y-2">
                {entityTypes.map((entityType) => (
                  <label
                    key={entityType.id}
                    className="flex items-center space-x-3 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filters.entity_types?.includes(entityType.id) || false}
                      onChange={() => toggleEntityType(entityType.id)}
                      className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                    />
                    <entityType.icon className={`w-4 h-4 ${entityType.color}`} />
                    <span className="text-sm text-secondary-700">{entityType.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Projects */}
            {projects.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Projects
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {projects.map((project) => (
                    <label
                      key={project.id}
                      className="flex items-center space-x-3 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filters.projects?.includes(project.id) || false}
                        onChange={() => toggleProject(project.id)}
                        className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                      />
                      <FolderOpen className="w-4 h-4 text-secondary-500" />
                      <span className="text-sm text-secondary-700 truncate">
                        {project.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Advanced Options Toggle */}
            {onToggleAdvanced && (
              <div className="pt-2 border-t border-secondary-200">
                <button
                  onClick={onToggleAdvanced}
                  className="flex items-center space-x-2 text-sm text-primary-600 hover:text-primary-700 transition-colors"
                >
                  <Calendar className="w-4 h-4" />
                  <span>{showAdvanced ? 'Hide' : 'Show'} Advanced Options</span>
                </button>
              </div>
            )}

            {/* Advanced Options */}
            {showAdvanced && (
              <div className="pt-2 border-t border-secondary-200 space-y-4">
                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Date Range
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-secondary-600 mb-1">From</label>
                      <input
                        type="date"
                        value={filters.date_range?.start || ''}
                        onChange={(e) => updateFilters({
                          date_range: {
                            start: e.target.value,
                            end: filters.date_range?.end || ''
                          }
                        })}
                        className="w-full px-2 py-1 text-sm border border-secondary-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-secondary-600 mb-1">To</label>
                      <input
                        type="date"
                        value={filters.date_range?.end || ''}
                        onChange={(e) => updateFilters({
                          date_range: {
                            start: filters.date_range?.start || '',
                            end: e.target.value
                          }
                        })}
                        className="w-full px-2 py-1 text-sm border border-secondary-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}