'use client';

import { useState, useEffect } from 'react';
import { X, Users, Filter, Search, User, MapPin, Lightbulb, BookOpen } from 'lucide-react';
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
    const normalizedType = type?.toUpperCase() || '';
    const Icon = ENTITY_TYPE_ICONS[normalizedType] || Users;
    return Icon;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="border-4 border-white bg-white w-full max-w-4xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-4 border-[#0A0A0A]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#39FF14] border-4 border-[#0A0A0A] flex items-center justify-center">
              <Users className="w-6 h-6 text-[#0A0A0A]" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase text-[#0A0A0A]">ENTITIES</h2>
              <p className="font-mono text-xs text-gray-600 uppercase">
                {filteredEntities.length} OF {entities.length} FOUND
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-[#0A0A0A] hover:text-[#FF073A] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-4 border-b-4 border-[#0A0A0A] space-y-3">
          <div className="flex items-center gap-2 border-4 border-[#0A0A0A] px-3 py-2">
            <Search className="w-4 h-4 text-[#0A0A0A]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="SEARCH ENTITIES..."
              className="flex-1 bg-transparent border-0 outline-none text-[#0A0A0A] placeholder:text-gray-400 font-mono text-xs uppercase"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-[#0A0A0A]" />
            <button
              onClick={() => setSelectedType(null)}
              className={`px-3 py-1 border-2 font-mono text-xs uppercase font-bold transition-all duration-100 ${
                selectedType === null 
                  ? 'border-[#39FF14] bg-[#39FF14] text-[#0A0A0A]' 
                  : 'border-[#0A0A0A] bg-transparent text-[#0A0A0A] hover:bg-gray-100'
              }`}
            >
              ALL
            </button>
            {entityTypes.map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1 border-2 font-mono text-xs uppercase font-bold transition-all duration-100 ${
                  selectedType === type 
                    ? 'border-[#39FF14] bg-[#39FF14] text-[#0A0A0A]' 
                    : 'border-[#0A0A0A] bg-transparent text-[#0A0A0A] hover:bg-gray-100'
                }`}
              >
                {type} ({entities.filter(e => e.type === type).length})
              </button>
            ))}
          </div>
        </div>

        {/* Entities List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredEntities.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="font-black text-xl uppercase text-[#0A0A0A] mb-1">NO ENTITIES</p>
              <p className="font-mono text-xs text-gray-600 uppercase">
                {searchQuery ? 'TRY DIFFERENT SEARCH' : 'UPLOAD FILES TO EXTRACT'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredEntities.map((entity, index) => {
                const Icon = getEntityIcon(entity.type);
                const entityKey = entity.id || `entity-${entity.name}-${index}`;
                const entityId = entity.id;

                return (
                  <button
                    key={entityKey}
                    onClick={() => {
                      if (onEntityClick && entityId) {
                        onEntityClick(entityId);
                      }
                    }}
                    className="text-left p-4 border-4 border-[#0A0A0A] bg-gray-50 hover:bg-[#39FF14]/10 transition-all duration-100"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 border-4 border-[#0A0A0A] bg-[#FF073A] flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-black text-sm uppercase text-[#0A0A0A] truncate">
                            {entity.name}
                          </h3>
                          <span className="font-mono text-xs bg-[#0A0A0A] text-white px-2 py-1 flex-shrink-0">
                            {entity.mention_count || 0}
                          </span>
                        </div>
                        <div className="mb-2">
                          <span className="inline-block px-2 py-0.5 bg-[#39FF14] border-2 border-[#0A0A0A] font-mono text-xs font-bold text-[#0A0A0A] uppercase">
                            {entity.type}
                          </span>
                        </div>
                        {entity.description && (
                          <p className="font-mono text-xs text-gray-600 line-clamp-2 mb-2">
                            {entity.description}
                          </p>
                        )}
                        {entity.aliases && entity.aliases.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {entity.aliases.slice(0, 3).map((alias, i) => (
                              <span
                                key={`${entityKey}-alias-${i}-${alias}`}
                                className="font-mono text-xs bg-white border-2 border-[#0A0A0A] text-[#0A0A0A] px-2 py-0.5"
                              >
                                {alias}
                              </span>
                            ))}
                            {entity.aliases.length > 3 && (
                              <span className="font-mono text-xs text-gray-600">
                                +{entity.aliases.length - 3}
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




