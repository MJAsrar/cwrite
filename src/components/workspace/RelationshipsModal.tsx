'use client';

import { useState, useEffect } from 'react';
import { X, Network, Search, Filter, ArrowRight } from 'lucide-react';
import { Relationship } from '@/types';

interface RelationshipsModalProps {
  relationships: Relationship[];
  isOpen: boolean;
  onClose: () => void;
  onRelationshipClick?: (relationshipId: string) => void;
}

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="border-4 border-white bg-white w-full max-w-5xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-4 border-[#0A0A0A]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#FF073A] border-4 border-[#0A0A0A] flex items-center justify-center">
              <Network className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase text-[#0A0A0A]">RELATIONSHIPS</h2>
              <p className="font-mono text-xs text-gray-600 uppercase">
                {filteredRelationships.length} OF {relationships.length} CONNECTIONS
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
              placeholder="SEARCH RELATIONSHIPS..."
              className="flex-1 bg-transparent border-0 outline-none text-[#0A0A0A] placeholder:text-gray-400 font-mono text-xs uppercase"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-[#0A0A0A]" />
            <button
              onClick={() => setSelectedType(null)}
              className={`px-3 py-1 border-2 font-mono text-xs uppercase font-bold transition-all duration-100 ${
                selectedType === null 
                  ? 'border-[#FF073A] bg-[#FF073A] text-white' 
                  : 'border-[#0A0A0A] bg-transparent text-[#0A0A0A] hover:bg-gray-100'
              }`}
            >
              ALL
            </button>
            {relationshipTypes.map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1 border-2 font-mono text-xs uppercase font-bold transition-all duration-100 ${
                  selectedType === type 
                    ? 'border-[#FF073A] bg-[#FF073A] text-white' 
                    : 'border-[#0A0A0A] bg-transparent text-[#0A0A0A] hover:bg-gray-100'
                }`}
              >
                {type.replace(/_/g, ' ')} ({relationships.filter(r => r.relationship_type === type).length})
              </button>
            ))}
          </div>
        </div>

        {/* Relationships List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredRelationships.length === 0 ? (
            <div className="text-center py-12">
              <Network className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="font-black text-xl uppercase text-[#0A0A0A] mb-1">NO RELATIONSHIPS</p>
              <p className="font-mono text-xs text-gray-600 uppercase">
                {searchQuery ? 'TRY DIFFERENT SEARCH' : 'UPLOAD FILES TO DISCOVER'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRelationships.map(relationship => {
                return (
                  <button
                    key={relationship.id}
                    onClick={() => {
                      if (onRelationshipClick) {
                        onRelationshipClick(relationship.id);
                      }
                    }}
                    className="w-full text-left p-4 border-4 border-[#0A0A0A] bg-gray-50 hover:bg-[#FF073A]/10 transition-all duration-100"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="px-3 py-2 bg-[#39FF14] border-2 border-[#0A0A0A] font-black text-sm uppercase text-[#0A0A0A] truncate flex-1">
                        {relationship.source_entity_name || 'UNKNOWN'}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <ArrowRight className="w-5 h-5 text-[#0A0A0A]" />
                        <div className="px-2 py-1 bg-[#FF073A] border-2 border-[#0A0A0A] font-mono text-xs font-bold text-white uppercase whitespace-nowrap">
                          {relationship.relationship_type.replace(/_/g, ' ')}
                        </div>
                        <ArrowRight className="w-5 h-5 text-[#0A0A0A]" />
                      </div>
                      <div className="px-3 py-2 bg-[#39FF14] border-2 border-[#0A0A0A] font-black text-sm uppercase text-[#0A0A0A] truncate flex-1">
                        {relationship.target_entity_name || 'UNKNOWN'}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      {relationship.description && (
                        <p className="font-mono text-xs text-gray-600 flex-1">
                          {relationship.description}
                        </p>
                      )}
                      {relationship.strength && (
                        <div className="flex items-center gap-2 ml-4">
                          <div className="w-16 h-2 border-2 border-[#0A0A0A] bg-white">
                            <div 
                              className="h-full bg-[#39FF14]" 
                              style={{ width: `${Math.min(100, (relationship.strength || 0) * 100)}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs font-bold text-[#0A0A0A]">
                            {Math.round((relationship.strength || 0) * 100)}%
                          </span>
                        </div>
                      )}
                    </div>

                    {relationship.evidence && relationship.evidence.length > 0 && (
                      <div className="mt-2 pt-2 border-t-2 border-[#0A0A0A]">
                        <span className="font-mono text-xs text-gray-600 uppercase">
                          {relationship.evidence.length} EVIDENCE
                        </span>
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




