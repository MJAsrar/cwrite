'use client';

import { useState } from 'react';
import { Bookmark, Search, Trash2, Edit2, Calendar, Clock } from 'lucide-react';

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: any;
  created_at: string;
  last_used?: string;
  result_count?: number;
}

interface SavedSearchesProps {
  savedSearches: SavedSearch[];
  onLoadSearch: (search: SavedSearch) => void;
  onDeleteSearch: (searchId: string) => void;
  onRenameSearch: (searchId: string, newName: string) => void;
}

export default function SavedSearches({
  savedSearches,
  onLoadSearch,
  onDeleteSearch,
  onRenameSearch
}: SavedSearchesProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const startEditing = (search: SavedSearch) => {
    setEditingId(search.id);
    setEditName(search.name);
  };

  const saveEdit = () => {
    if (editingId && editName.trim()) {
      onRenameSearch(editingId, editName.trim());
    }
    setEditingId(null);
    setEditName('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 24 * 7) {
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getFilterSummary = (filters: any) => {
    const parts = [];
    
    if (filters.entity_types?.length > 0) {
      parts.push(`${filters.entity_types.length} entity type${filters.entity_types.length > 1 ? 's' : ''}`);
    }
    
    if (filters.projects?.length > 0) {
      parts.push(`${filters.projects.length} project${filters.projects.length > 1 ? 's' : ''}`);
    }
    
    if (filters.date_range) {
      parts.push('date range');
    }

    return parts.length > 0 ? parts.join(', ') : 'no filters';
  };

  if (savedSearches.length === 0) {
    return (
      <div className="text-center py-8">
        <Bookmark className="w-8 h-8 text-secondary-300 mx-auto mb-3" />
        <h3 className="text-sm font-medium text-secondary-900 mb-1">
          No saved searches
        </h3>
        <p className="text-xs text-secondary-600">
          Save searches to quickly access them later
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2 mb-4">
        <Bookmark className="w-4 h-4 text-secondary-600" />
        <h3 className="text-sm font-medium text-secondary-900">
          Saved Searches ({savedSearches.length})
        </h3>
      </div>

      <div className="space-y-2">
        {savedSearches.map((search) => (
          <div
            key={search.id}
            className="group bg-white border border-secondary-200 rounded-lg p-3 hover:border-secondary-300 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              {editingId === search.id ? (
                <div className="flex-1 mr-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit();
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    className="w-full px-2 py-1 text-sm border border-secondary-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    autoFocus
                  />
                  <div className="flex items-center space-x-2 mt-2">
                    <button
                      onClick={saveEdit}
                      className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-2 py-1 text-xs text-secondary-600 hover:text-secondary-800 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-secondary-900 truncate">
                      {search.name}
                    </h4>
                    <p className="text-xs text-secondary-600 truncate mt-1">
                      "{search.query}"
                    </p>
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEditing(search)}
                      className="p-1 text-secondary-400 hover:text-secondary-600 transition-colors"
                      title="Rename search"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onDeleteSearch(search.id)}
                      className="p-1 text-secondary-400 hover:text-red-600 transition-colors"
                      title="Delete search"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}
            </div>

            {editingId !== search.id && (
              <>
                <div className="flex items-center justify-between text-xs text-secondary-500 mb-3">
                  <span>Filters: {getFilterSummary(search.filters)}</span>
                  {search.result_count !== undefined && (
                    <span>{search.result_count} results</span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 text-xs text-secondary-500">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(search.created_at)}</span>
                    </div>
                    {search.last_used && (
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>Used {formatDate(search.last_used)}</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => onLoadSearch(search)}
                    className="flex items-center space-x-1 px-2 py-1 text-xs text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded transition-colors"
                  >
                    <Search className="w-3 h-3" />
                    <span>Load</span>
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}