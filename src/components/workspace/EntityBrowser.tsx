'use client';

import { useState, useMemo } from 'react';
import { Entity } from '@/types';
import { 
  Users, 
  MapPin, 
  Tag, 
  Search, 
  Filter,
  ChevronDown,
  User,
  Hash,
  Database
} from 'lucide-react';
import Input from '@/components/ui/Input';

interface EntityBrowserProps {
  entities: Entity[];
  onEntitySelect: (entityId: string) => void;
  selectedEntityId?: string;
}

interface EntityItemProps {
  entity: Entity;
  isSelected: boolean;
  onSelect: () => void;
}

function EntityItem({ entity, isSelected, onSelect }: EntityItemProps) {
  const getEntityIcon = () => {
    switch (entity.type) {
      case 'character':
        return <User className="w-4 h-4 text-blue-500" />;
      case 'location':
        return <MapPin className="w-4 h-4 text-green-500" />;
      case 'theme':
        return <Tag className="w-4 h-4 text-purple-500" />;
      default:
        return <Hash className="w-4 h-4 text-secondary-400" />;
    }
  };

  const getEntityTypeColor = () => {
    switch (entity.type) {
      case 'character':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'location':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'theme':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-secondary-50 text-secondary-700 border-secondary-200';
    }
  };

  const getConfidenceColor = () => {
    if (entity.confidence_score >= 0.8) return 'text-green-600';
    if (entity.confidence_score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div
      className={`
        p-4 rounded-xl cursor-pointer transition-all border group
        ${isSelected 
          ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
          : 'bg-card border-border hover:border-primary/30 hover:shadow-sm'
        }
      `}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`
            w-8 h-8 rounded-lg flex items-center justify-center
            ${isSelected ? 'bg-primary-foreground/20' : 'bg-muted'}
          `}>
            {getEntityIcon()}
          </div>
          <h4 className={`font-medium truncate ${
            isSelected ? 'text-primary-foreground' : 'text-foreground'
          }`}>
            {entity.name}
          </h4>
        </div>
        <span className={`
          text-xs px-2 py-1 rounded-full font-medium border
          ${isSelected 
            ? 'bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30' 
            : getEntityTypeColor()
          }
        `}>
          {entity.type}
        </span>
      </div>

      <div className="space-y-2">
        <div className={`flex items-center justify-between text-xs ${
          isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'
        }`}>
          <span>{entity.mention_count} mentions</span>
          <span className={`font-medium px-2 py-0.5 rounded-full ${
            isSelected 
              ? 'bg-primary-foreground/20 text-primary-foreground' 
              : `${getConfidenceColor()} bg-muted`
          }`}>
            {Math.round(entity.confidence_score * 100)}%
          </span>
        </div>

        {entity.aliases && entity.aliases.length > 0 && (
          <div className={`text-xs ${
            isSelected ? 'text-primary-foreground/60' : 'text-muted-foreground'
          }`}>
            Also: {entity.aliases.slice(0, 2).join(', ')}
            {entity.aliases.length > 2 && ` +${entity.aliases.length - 2} more`}
          </div>
        )}
      </div>
    </div>
  );
}

export default function EntityBrowser({
  entities,
  onEntitySelect,
  selectedEntityId
}: EntityBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['character', 'location', 'theme']);
  const [sortBy, setSortBy] = useState<'name' | 'mentions' | 'confidence'>('mentions');
  const [showFilters, setShowFilters] = useState(false);

  const entityTypes = [
    { id: 'character', label: 'Characters', icon: User, color: 'text-blue-600' },
    { id: 'location', label: 'Locations', icon: MapPin, color: 'text-green-600' },
    { id: 'theme', label: 'Themes', icon: Tag, color: 'text-purple-600' }
  ];

  const filteredAndSortedEntities = useMemo(() => {
    let filtered = entities.filter(entity => {
      const matchesSearch = entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           entity.aliases.some(alias => alias.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = selectedTypes.includes(entity.type);
      return matchesSearch && matchesType;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'mentions':
          return b.mention_count - a.mention_count;
        case 'confidence':
          return b.confidence_score - a.confidence_score;
        default:
          return 0;
      }
    });

    return filtered;
  }, [entities, searchQuery, selectedTypes, sortBy]);

  const entityCounts = useMemo(() => {
    return entityTypes.reduce((acc, type) => {
      acc[type.id] = entities.filter(e => e.type === type.id).length;
      return acc;
    }, {} as Record<string, number>);
  }, [entities]);

  const toggleEntityType = (typeId: string) => {
    setSelectedTypes(prev => 
      prev.includes(typeId) 
        ? prev.filter(t => t !== typeId)
        : [...prev, typeId]
    );
  };

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Enhanced Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Entities</h3>
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full font-medium">
            {filteredAndSortedEntities.length}
          </span>
        </div>

        {/* Enhanced Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search entities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
          />
        </div>

        {/* Enhanced Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center justify-between w-full p-3 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-colors"
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <span>Filters & Sort</span>
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>

        {/* Enhanced Filters */}
        {showFilters && (
          <div className="mt-3 p-4 bg-muted/30 rounded-xl space-y-4">
            {/* Entity Types */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-3">
                Entity Types
              </label>
              <div className="space-y-2">
                {entityTypes.map((type) => (
                  <label key={type.id} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-accent rounded-lg transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(type.id)}
                      onChange={() => toggleEntityType(type.id)}
                      className="rounded border-input text-primary focus:ring-primary"
                    />
                    <type.icon className={`w-4 h-4 ${type.color}`} />
                    <span className="text-sm text-foreground">
                      {type.label}
                    </span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full ml-auto">
                      {entityCounts[type.id] || 0}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full text-sm bg-background border border-input rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="mentions">Most Mentions</option>
                <option value="confidence">Highest Confidence</option>
                <option value="name">Alphabetical</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Entity List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredAndSortedEntities.length === 0 ? (
          <div className="text-center py-12">
            {entities.length === 0 ? (
              <>
                <Database className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h4 className="font-medium text-foreground mb-2">No entities discovered</h4>
                <p className="text-sm text-muted-foreground">
                  Upload and process files to discover characters, locations, and themes.
                </p>
              </>
            ) : (
              <>
                <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h4 className="font-medium text-foreground mb-2">No matching entities</h4>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your search or filter criteria.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAndSortedEntities.map((entity) => (
              <EntityItem
                key={entity.id}
                entity={entity}
                isSelected={selectedEntityId === entity.id}
                onSelect={() => onEntitySelect(entity.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}