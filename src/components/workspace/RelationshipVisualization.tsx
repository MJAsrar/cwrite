'use client';

import { useState, useMemo } from 'react';
import { Entity, Relationship } from '@/types';
import { 
  GitBranch, 
  User, 
  MapPin, 
  Tag, 
  ArrowRight,
  Filter,
  ChevronDown,
  Network,
  ZoomIn,
  ZoomOut,
  Move,
  Eye,
  TrendingUp,
  Link2,
  Database
} from 'lucide-react';
import Button from '@/components/ui/Button';

interface RelationshipVisualizationProps {
  entities: Entity[];
  relationships: Relationship[];
  onEntitySelect: (entityId: string) => void;
  onViewChange: () => void;
}

interface RelationshipItemProps {
  relationship: Relationship;
  sourceEntity: Entity;
  targetEntity: Entity;
  onEntitySelect: (entityId: string) => void;
}

function RelationshipItem({ 
  relationship, 
  sourceEntity, 
  targetEntity, 
  onEntitySelect 
}: RelationshipItemProps) {
  const [expanded, setExpanded] = useState(false);

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'character':
        return <User className="w-4 h-4 text-blue-500" />;
      case 'location':
        return <MapPin className="w-4 h-4 text-green-500" />;
      case 'theme':
        return <Tag className="w-4 h-4 text-purple-500" />;
      default:
        return <Database className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getRelationshipTypeLabel = () => {
    switch (relationship.relationship_type) {
      case 'appears_with':
        return 'appears with';
      case 'located_in':
        return 'located in';
      case 'related_to':
        return 'related to';
      default:
        return 'connected to';
    }
  };

  const getStrengthConfig = () => {
    const strength = relationship.strength || 0;
    if (strength >= 0.7) {
      return {
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        label: 'Strong'
      };
    }
    if (strength >= 0.4) {
      return {
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        label: 'Medium'
      };
    }
    return {
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      label: 'Weak'
    };
  };

  const strengthConfig = getStrengthConfig();

  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-all group">
      {/* Main relationship display */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEntitySelect(sourceEntity.id)}
            className="flex items-center gap-2 text-foreground hover:text-primary h-auto p-2"
          >
            <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
              {getEntityIcon(sourceEntity.type)}
            </div>
            <span className="font-medium truncate">{sourceEntity.name}</span>
          </Button>
          
          <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full">
            <Link2 className="w-3 h-3 text-muted-foreground" />
            <ArrowRight className="w-3 h-3 text-muted-foreground" />
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEntitySelect(targetEntity.id)}
            className="flex items-center gap-2 text-foreground hover:text-primary h-auto p-2"
          >
            <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
              {getEntityIcon(targetEntity.type)}
            </div>
            <span className="font-medium truncate">{targetEntity.name}</span>
          </Button>
        </div>

        <div className={`
          flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium
          ${strengthConfig.bgColor} ${strengthConfig.borderColor} ${strengthConfig.color}
        `}>
          <TrendingUp className="w-3 h-3" />
          <span>{Math.round((relationship.strength || 0) * 100)}%</span>
        </div>
      </div>

      {/* Relationship details */}
      <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
        <div className="flex items-center gap-2">
          <span className="italic">{getRelationshipTypeLabel()}</span>
          <span>•</span>
          <span>{relationship.co_occurrence_count} co-occurrences</span>
        </div>
        
        {relationship.context_snippets && relationship.context_snippets.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-auto p-1 text-muted-foreground hover:text-foreground"
          >
            <Eye className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Context snippets */}
      {expanded && relationship.context_snippets && relationship.context_snippets.length > 0 && (
        <div className="bg-muted/30 rounded-xl p-4 space-y-3">
          <p className="text-xs font-medium text-foreground mb-2">Context Examples:</p>
          {relationship.context_snippets.slice(0, expanded ? undefined : 1).map((snippet, index) => (
            <div key={index} className="bg-card rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground italic leading-relaxed">
                "{snippet}"
              </p>
            </div>
          ))}
          {relationship.context_snippets.length > 1 && !expanded && (
            <p className="text-xs text-muted-foreground">
              +{relationship.context_snippets.length - 1} more contexts
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function RelationshipVisualization({
  entities,
  relationships,
  onEntitySelect,
  onViewChange
}: RelationshipVisualizationProps) {
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['appears_with', 'located_in', 'related_to']);
  const [minStrength, setMinStrength] = useState(0.1);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');

  const entityMap = useMemo(() => {
    return entities.reduce((acc, entity) => {
      acc[entity.id] = entity;
      return acc;
    }, {} as Record<string, Entity>);
  }, [entities]);

  const filteredRelationships = useMemo(() => {
    return relationships.filter(rel => {
      const matchesType = selectedTypes.includes(rel.relationship_type);
      const matchesStrength = (rel.strength || 0) >= minStrength;
      const hasValidEntities = entityMap[rel.source_entity_id] && entityMap[rel.target_entity_id];
      return matchesType && matchesStrength && hasValidEntities;
    }).sort((a, b) => (b.strength || 0) - (a.strength || 0));
  }, [relationships, selectedTypes, minStrength, entityMap]);

  const relationshipTypes = [
    { id: 'appears_with', label: 'Appears Together', count: 0 },
    { id: 'located_in', label: 'Location Relationships', count: 0 },
    { id: 'related_to', label: 'Thematic Connections', count: 0 }
  ];

  // Update counts
  relationshipTypes.forEach(type => {
    type.count = relationships.filter(rel => rel.relationship_type === type.id).length;
  });

  const toggleRelationshipType = (typeId: string) => {
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
            <Network className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Relationships</h3>
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full font-medium">
            {filteredRelationships.length}
          </span>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex bg-muted rounded-xl p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                ${viewMode === 'list' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
                }
              `}
            >
              <GitBranch className="w-4 h-4" />
              List
            </button>
            <button
              onClick={() => setViewMode('graph')}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                ${viewMode === 'graph' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
                }
              `}
            >
              <Network className="w-4 h-4" />
              Graph
            </button>
          </div>
        </div>

        {/* Enhanced Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center justify-between w-full p-3 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-colors"
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <span>Filters & Settings</span>
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>

        {/* Enhanced Filters */}
        {showFilters && (
          <div className="mt-3 p-4 bg-muted/30 rounded-xl space-y-4">
            {/* Relationship Types */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-3">
                Relationship Types
              </label>
              <div className="space-y-2">
                {relationshipTypes.map((type) => (
                  <label key={type.id} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-accent rounded-lg transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(type.id)}
                      onChange={() => toggleRelationshipType(type.id)}
                      className="rounded border-input text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-foreground flex-1">
                      {type.label}
                    </span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {type.count}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Minimum Strength */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-3">
                Minimum Strength: {Math.round(minStrength * 100)}%
              </label>
              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={minStrength}
                  onChange={(e) => setMinStrength(parseFloat(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'list' ? (
          /* Enhanced Relationships List */
          <div className="h-full overflow-y-auto p-4">
            {filteredRelationships.length === 0 ? (
              <div className="text-center py-12">
                {relationships.length === 0 ? (
                  <>
                    <Network className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h4 className="font-medium text-foreground mb-2">No relationships discovered</h4>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      Process files with multiple entities to discover relationships between characters, locations, and themes.
                    </p>
                  </>
                ) : (
                  <>
                    <GitBranch className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h4 className="font-medium text-foreground mb-2">No matching relationships</h4>
                    <p className="text-sm text-muted-foreground">
                      Try adjusting your filter criteria to see more relationships.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRelationships.map((relationship) => {
                  const sourceEntity = entityMap[relationship.source_entity_id];
                  const targetEntity = entityMap[relationship.target_entity_id];
                  
                  if (!sourceEntity || !targetEntity) return null;
                  
                  return (
                    <RelationshipItem
                      key={relationship.id}
                      relationship={relationship}
                      sourceEntity={sourceEntity}
                      targetEntity={targetEntity}
                      onEntitySelect={onEntitySelect}
                    />
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Graph View Placeholder */
          <div className="h-full flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Network className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="font-serif text-xl font-semibold text-foreground mb-3">
                Interactive Graph View
              </h3>
              <p className="text-muted-foreground mb-6">
                An interactive network visualization will be implemented here, featuring zoom, pan, and node manipulation capabilities.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <ZoomIn className="w-4 h-4" />
                <ZoomOut className="w-4 h-4" />
                <Move className="w-4 h-4" />
                <span>Zoom • Pan • Interact</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}