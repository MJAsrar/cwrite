'use client';

import { useState, useEffect } from 'react';
import { X, Users, Filter, Search, User, MapPin, Lightbulb, BookOpen } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Entity } from '@/types';

interface EntitiesModalProps {
  entities: Entity[];
  isOpen: boolean;
  onClose: () => void;
  onEntityClick?: (entityId: string) => void;
}

const ENTITY_TYPE_ICONS: Record<string, any> = {
  CHARACTER: User,
  PERSON: User,
  LOCATION: MapPin,
  PLACE: MapPin,
  THEME: Lightbulb,
  CONCEPT: Lightbulb,
  ORGANIZATION: Users,
  EVENT: BookOpen,
};

const ENTITY_TYPE_COLORS: Record<string, string> = {
  CHARACTER: 'text-blue-500 bg-blue-500/10',
  PERSON: 'text-blue-500 bg-blue-500/10',
  LOCATION: 'text-green-500 bg-green-500/10',
  PLACE: 'text-green-500 bg-green-500/10',
  THEME: 'text-purple-500 bg-purple-500/10',
  CONCEPT: 'text-purple-500 bg-purple-500/10',
  ORGANIZATION: 'text-orange-500 bg-orange-500/10',
  EVENT: 'text-pink-500 bg-pink-500/10',
};

export default function EntitiesModal({ entities, isOpen, onClose, onEntityClick }: EntitiesModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [filteredEntities, setFilteredEntities] = useState<Entity[]>(entities);

  // Get unique entity types
  const entityTypes = Array.from(new Set(entities.map(e => e.type))).sort();

  useEffect(() => {
    let filtered = entities;

    // Filter by type
    if (selectedType) {
      filtered = filtered.filter(e => e.type === selectedType);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.name.toLowerCase().includes(query) ||
        e.description?.toLowerCase().includes(query) ||
        e.aliases?.some(alias => alias.toLowerCase().includes(query))
      );
    }

    // Sort by mention count
    filtered.sort((a, b) => (b.mention_count || 0) - (a.mention_count || 0));

    setFilteredEntities(filtered);
  }, [entities, searchQuery, selectedType]);

  if (!isOpen) return null;

  const getEntityIcon = (type: string) => {
    // Normalize type to uppercase for lookup
    const normalizedType = type?.toUpperCase() || '';
    const Icon = ENTITY_TYPE_ICONS[normalizedType] || Users;
    return Icon;
  };

  const getEntityColor = (type: string) => {
    // Normalize type to uppercase for lookup
    const normalizedType = type?.toUpperCase() || '';
    return ENTITY_TYPE_COLORS[normalizedType] || 'text-gray-500 bg-gray-500/10';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Entities</h2>
              <p className="text-sm text-muted-foreground">
                {filteredEntities.length} of {entities.length} entities
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
              placeholder="Search entities..."
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
            {entityTypes.map(type => (
              <Button
                key={type}
                variant={selectedType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType(type)}
                className="gap-1.5"
              >
                {type}
                <span className="text-xs opacity-70">
                  ({entities.filter(e => e.type === type).length})
                </span>
              </Button>
            ))}
          </div>
        </div>

        {/* Entities List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredEntities.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-foreground font-medium mb-1">No entities found</p>
              <p className="text-muted-foreground text-sm">
                {searchQuery ? 'Try a different search' : 'Upload files to extract entities'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredEntities.map((entity, index) => {
                const Icon = getEntityIcon(entity.type);
                const colorClass = getEntityColor(entity.type);
                
                // Use either id or _id, with fallback to index
                const entityKey = entity.id || entity._id || `entity-${entity.name}-${index}`;
                const entityId = entity.id || entity._id;

                return (
                  <button
                    key={entityKey}
                    onClick={() => {
                      if (onEntityClick && entityId) {
                        onEntityClick(entityId);
                      }
                    }}
                    className="text-left p-4 bg-background hover:bg-accent rounded-lg border border-border transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${colorClass} flex-shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-medium text-foreground truncate">
                            {entity.name}
                          </h3>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded flex-shrink-0">
                            {entity.mention_count || 0} mentions
                          </span>
                        </div>
                        {entity.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {entity.description}
                          </p>
                        )}
                        {entity.aliases && entity.aliases.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {entity.aliases.slice(0, 3).map((alias, i) => (
                              <span
                                key={`${entityKey}-alias-${i}-${alias}`}
                                className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded"
                              >
                                {alias}
                              </span>
                            ))}
                            {entity.aliases.length > 3 && (
                              <span className="text-xs text-muted-foreground">
                                +{entity.aliases.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
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




