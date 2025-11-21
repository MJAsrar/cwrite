'use client';

import { useState, useEffect } from 'react';
import { X, Network, Search, Filter, TrendingUp } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Relationship } from '@/types';

interface RelationshipsModalProps {
  relationships: Relationship[];
  isOpen: boolean;
  onClose: () => void;
  onRelationshipClick?: (relationshipId: string) => void;
}

const RELATIONSHIP_TYPE_COLORS: Record<string, string> = {
  'related_to': 'border-blue-500 text-blue-500',
  'interacts_with': 'border-green-500 text-green-500',
  'located_in': 'border-purple-500 text-purple-500',
  'belongs_to': 'border-orange-500 text-orange-500',
  'causes': 'border-red-500 text-red-500',
  'mentions': 'border-gray-500 text-gray-500',
};

export default function RelationshipsModal({ relationships, isOpen, onClose, onRelationshipClick }: RelationshipsModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [filteredRelationships, setFilteredRelationships] = useState<Relationship[]>(relationships);

  // Get unique relationship types
  const relationshipTypes = Array.from(new Set(relationships.map(r => r.relationship_type))).sort();

  useEffect(() => {
    let filtered = relationships;

    // Filter by type
    if (selectedType) {
      filtered = filtered.filter(r => r.relationship_type === selectedType);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.source_entity_name?.toLowerCase().includes(query) ||
        r.target_entity_name?.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query)
      );
    }

    // Sort by strength
    filtered.sort((a, b) => (b.strength || 0) - (a.strength || 0));

    setFilteredRelationships(filtered);
  }, [relationships, searchQuery, selectedType]);

  if (!isOpen) return null;

  const getRelationshipColor = (type: string) => {
    return RELATIONSHIP_TYPE_COLORS[type] || 'border-gray-500 text-gray-500';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Network className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Relationships</h2>
              <p className="text-sm text-muted-foreground">
                {filteredRelationships.length} of {relationships.length} relationships
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="p-4 border-b border-border space-y-3">
          {/* Search */}
          <div className="flex items-center gap-2 bg-background rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search relationships..."
              className="flex-1 bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground text-sm"
            />
          </div>

          {/* Type Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Button
              variant={selectedType === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedType(null)}
            >
              All
            </Button>
            {relationshipTypes.map(type => (
              <Button
                key={type}
                variant={selectedType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType(type)}
                className="gap-1.5"
              >
                {type.replace(/_/g, ' ')}
                <span className="text-xs opacity-70">
                  ({relationships.filter(r => r.relationship_type === type).length})
                </span>
              </Button>
            ))}
          </div>
        </div>

        {/* Relationships List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredRelationships.length === 0 ? (
            <div className="text-center py-12">
              <Network className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-foreground font-medium mb-1">No relationships found</p>
              <p className="text-muted-foreground text-sm">
                {searchQuery ? 'Try a different search' : 'Upload files to discover relationships'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRelationships.map(relationship => {
                const colorClass = getRelationshipColor(relationship.relationship_type);

                return (
                  <button
                    key={relationship.id}
                    onClick={() => {
                      if (onRelationshipClick) {
                        onRelationshipClick(relationship.id);
                      }
                    }}
                    className="w-full text-left p-4 bg-background hover:bg-accent rounded-lg border border-border transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* Visual Connection */}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="px-3 py-1.5 bg-muted rounded font-medium text-sm text-foreground truncate">
                          {relationship.source_entity_name || 'Unknown'}
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-1">
                          <div className={`h-px w-8 border-t-2 ${colorClass}`}></div>
                          <div className={`px-2 py-0.5 rounded text-xs font-medium ${colorClass} bg-current/10 whitespace-nowrap`}>
                            {relationship.relationship_type.replace(/_/g, ' ')}
                          </div>
                          <div className={`h-px w-8 border-t-2 ${colorClass}`}></div>
                        </div>
                        <div className="px-3 py-1.5 bg-muted rounded font-medium text-sm text-foreground truncate">
                          {relationship.target_entity_name || 'Unknown'}
                        </div>
                      </div>

                      {/* Strength Indicator */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <TrendingUp className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">
                          {Math.round((relationship.strength || 0) * 100)}%
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    {relationship.description && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {relationship.description}
                      </p>
                    )}

                    {/* Evidence */}
                    {relationship.evidence && relationship.evidence.length > 0 && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{relationship.evidence.length} evidence{relationship.evidence.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
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




