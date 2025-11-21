'use client';

import { useState, useEffect } from 'react';
import { Entity, Relationship } from '@/types';
import { 
  User, 
  MapPin, 
  Tag, 
  Hash, 
  Calendar, 
  FileText, 
  GitBranch,
  TrendingUp,
  Quote,
  Search,
  ExternalLink,
  Edit2,
  Star,
  X,
  ChevronRight
} from 'lucide-react';
import { api } from '@/lib/api';

interface EntityDetailViewProps {
  entity: Entity;
  onClose: () => void;
  onEdit?: (entity: Entity) => void;
}

interface EntityMention {
  id: string;
  file_id: string;
  file_name: string;
  context: string;
  position: number;
  created_at: string;
}

export default function EntityDetailView({
  entity,
  onClose,
  onEdit
}: EntityDetailViewProps) {
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [mentions, setMentions] = useState<EntityMention[]>([]);
  const [relatedEntities, setRelatedEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'mentions' | 'relationships'>('overview');

  useEffect(() => {
    loadEntityDetails();
  }, [entity.id]);

  const loadEntityDetails = async () => {
    try {
      setLoading(true);
      
      // Load relationships
      const relationshipsResponse = await api.get(`/entities/${entity.id}/relationships`);
      setRelationships((relationshipsResponse as any).data || []);
      
      // Load mentions
      const mentionsResponse = await api.get(`/entities/${entity.id}/mentions`);
      setMentions((mentionsResponse as any).data || []);
      
      // Load related entities
      const relatedResponse = await api.get(`/entities/${entity.id}/related`);
      setRelatedEntities((relatedResponse as any).data || []);
      
    } catch (error) {
      console.error('Failed to load entity details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'character':
        return <User className="w-5 h-5" />;
      case 'location':
        return <MapPin className="w-5 h-5" />;
      case 'theme':
        return <Tag className="w-5 h-5" />;
      default:
        return <Hash className="w-5 h-5" />;
    }
  };

  const getEntityTypeColor = (type: string) => {
    switch (type) {
      case 'character':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'location':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'theme':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg border ${getEntityTypeColor(entity.type)}`}>
              {getEntityIcon(entity.type)}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{entity.name}</h2>
              <p className="text-sm text-gray-500 capitalize">{entity.type}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {onEdit && (
              <button
                onClick={() => onEdit(entity)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('mentions')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'mentions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Mentions ({mentions.length})
          </button>
          <button
            onClick={() => setActiveTab('relationships')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'relationships'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Relationships ({relationships.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <Quote className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-500">Mentions</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{mentions.length}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <GitBranch className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-500">Relationships</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{relationships.length}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-500">Confidence</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {Math.round((entity.confidence_score || 0) * 100)}%
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-500">First Seen</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {entity.created_at ? formatDate(entity.created_at) : 'Unknown'}
                  </p>
                </div>
              </div>

              {/* Aliases */}
              {entity.aliases && entity.aliases.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Aliases</h3>
                  <div className="flex flex-wrap gap-2">
                    {entity.aliases.map((alias, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {alias}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Mentions */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Mentions</h3>
                <div className="space-y-3">
                  {mentions.slice(0, 3).map((mention) => (
                    <div key={mention.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-900">
                            {mention.file_name}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatDate(mention.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {mention.context}
                      </p>
                    </div>
                  ))}
                  {mentions.length > 3 && (
                    <button
                      onClick={() => setActiveTab('mentions')}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1"
                    >
                      <span>View all {mentions.length} mentions</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'mentions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  All Mentions ({mentions.length})
                </h3>
                <div className="flex items-center space-x-2">
                  <Search className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search mentions..."
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="space-y-3">
                {mentions.map((mention) => (
                  <div key={mention.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-900">
                          {mention.file_name}
                        </span>
                        <span className="text-xs text-gray-500">
                          Position {mention.position}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">
                          {formatDate(mention.created_at)}
                        </span>
                        <button className="p-1 text-gray-400 hover:text-gray-600">
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {mention.context}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'relationships' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Relationships ({relationships.length})
              </h3>
              <div className="space-y-3">
                {relationships.map((relationship) => {
                  const relatedEntity = relatedEntities.find(
                    e => e.id === relationship.target_entity_id || e.id === relationship.source_entity_id
                  );
                  
                  if (!relatedEntity) return null;
                  
                  return (
                    <div key={relationship.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className={`p-1 rounded border ${getEntityTypeColor(relatedEntity.type)}`}>
                            {getEntityIcon(relatedEntity.type)}
                          </div>
                          <div>
                            <span className="font-medium text-gray-900">{relatedEntity.name}</span>
                            <span className="text-sm text-gray-500 ml-2 capitalize">
                              {relatedEntity.type}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            {relationship.relationship_type}
                          </span>
                          <div className="flex items-center space-x-1">
                            <Star className="w-3 h-3 text-yellow-500" />
                            <span className="text-xs text-gray-500">
                              {Math.round((relationship.strength || 0) * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>
                      {relationship.context_snippets && relationship.context_snippets.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-500 mb-1">Context:</p>
                          <p className="text-sm text-gray-600 italic">
                            "{relationship.context_snippets[0]}"
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}