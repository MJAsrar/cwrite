"""
RAG Context Assembly Service

Gathers and assembles relevant context for AI chat:
- Semantic search results (text chunks)
- Relevant entities (characters, locations, themes)
- Scene information
- Position/structure data
- Relationships between entities
"""

import logging
from typing import List, Dict, Optional, Any
from datetime import datetime

from ..repositories.text_chunk_repository import TextChunkRepository
from ..repositories.entity_repository import EntityRepository
from ..repositories.relationship_repository import RelationshipRepository
from ..repositories.scene_repository import SceneRepository
from ..repositories.entity_mention_repository import EntityMentionRepository
from .embedding_service import EmbeddingService

logger = logging.getLogger(__name__)


class RAGContextService:
    """Service for assembling RAG context"""
    
    def __init__(
        self,
        text_chunk_repo: Optional[TextChunkRepository] = None,
        entity_repo: Optional[EntityRepository] = None,
        relationship_repo: Optional[RelationshipRepository] = None,
        scene_repo: Optional[SceneRepository] = None,
        entity_mention_repo: Optional[EntityMentionRepository] = None,
        embedding_service: Optional[EmbeddingService] = None
    ):
        """Initialize RAG context service"""
        self.text_chunk_repo = text_chunk_repo or TextChunkRepository()
        self.entity_repo = entity_repo or EntityRepository()
        self.relationship_repo = relationship_repo or RelationshipRepository()
        self.scene_repo = scene_repo or SceneRepository()
        self.entity_mention_repo = entity_mention_repo or EntityMentionRepository()
        self.embedding_service = embedding_service or EmbeddingService(self.text_chunk_repo)
    
    async def assemble_context(
        self,
        query: str,
        project_id: str,
        file_id: Optional[str] = None,
        max_chunks: int = 5,
        include_entities: bool = True,
        include_scenes: bool = True,
        include_relationships: bool = True
    ) -> Dict[str, Any]:
        """
        Assemble comprehensive context for a query
        
        Args:
            query: User query
            project_id: Project ID
            file_id: Optional file ID to limit scope
            max_chunks: Maximum text chunks to retrieve
            include_entities: Whether to include entity information
            include_scenes: Whether to include scene analysis
            include_relationships: Whether to include relationships
            
        Returns:
            Context dictionary with all relevant information
        """
        context = {
            'query': query,
            'chunks': [],
            'entities': [],
            'scenes': [],
            'relationships': [],
            'metadata': {}
        }
        
        try:
            # 1. Semantic search for relevant text chunks
            search_results = await self.embedding_service.semantic_search(
                project_id=project_id,
                query=query,
                limit=max_chunks,
                min_similarity=0.1
            )
            
            logger.info(f"Semantic search returned {len(search_results)} chunks")
            
            context['chunks'] = [
                {
                    'content': chunk['content'],
                    'file_id': chunk['file_id'],
                    'chunk_index': chunk.get('chunk_index', 0),
                    'similarity': chunk.get('score', 0.0),
                    'word_count': len(chunk['content'].split()),
                    'entities_mentioned': chunk.get('entities_mentioned', [])
                }
                for chunk in search_results
            ]
            
            # 2. Get relevant entities from chunks
            if include_entities and context['chunks']:
                mentioned_entity_ids = set()
                for chunk_data in context['chunks']:
                    entity_ids = chunk_data.get('entities_mentioned', [])
                    mentioned_entity_ids.update(entity_ids)
                
                if mentioned_entity_ids:
                    entities = []
                    for entity_id in mentioned_entity_ids:
                        entity = await self.entity_repo.get_by_id(entity_id)
                        if entity:
                            entities.append(entity)
                    
                    context['entities'] = [
                        {
                            'id': e.id,
                            'name': e.name,
                            'type': e.type,
                            'aliases': e.aliases or [],
                            'description': e.description,
                            'mentions': e.mentions,
                            'first_appearance': e.first_appearance
                        }
                        for e in entities
                    ]
            
            # 3. Get scene information
            if include_scenes and file_id:
                scenes = await self.scene_repo.get_by_file(file_id)
                
                # Find scenes that overlap with retrieved chunks
                relevant_scenes = []
                for chunk in search_results:
                    chunk_start = chunk.get('start_position', 0)
                    chunk_end = chunk.get('end_position', 0)
                    for scene in scenes:
                        # Check if chunk overlaps with scene
                        if (scene.start_char_pos <= chunk_start <= scene.end_char_pos or
                            scene.start_char_pos <= chunk_end <= scene.end_char_pos):
                            if scene not in relevant_scenes:
                                relevant_scenes.append(scene)
                
                context['scenes'] = [
                    {
                        'scene_number': s.scene_number,
                        'chapter_number': s.chapter_number,
                        'pov_type': s.pov_type,
                        'pov_character': s.pov_character,
                        'scene_type': s.scene_type,
                        'scene_significance': s.scene_significance,
                        'location': s.location,
                        'time_marker': s.time_marker,
                        'time_markers': s.time_markers or [],
                        'is_flashback': s.is_flashback,
                        'characters_present': s.characters_present or [],
                        'emotional_tone': s.emotional_tone or [],
                        'word_count': s.word_count,
                        'dialogue_percentage': s.dialogue_percentage
                    }
                    for s in relevant_scenes[:5]  # Limit to 5 most relevant scenes
                ]
            
            # 4. Get relationships between entities
            if include_relationships and context['entities']:
                entity_ids = [e['id'] for e in context['entities']]
                relationships = await self.relationship_repo.get_relationships_between_entities(
                    project_id, entity_ids
                )
                
                context['relationships'] = [
                    {
                        'source_entity': r.source_entity_id,
                        'target_entity': r.target_entity_id,
                        'relationship_type': r.relationship_type,
                        'confidence': r.confidence,
                        'context': r.context[:200] if r.context else None  # Truncate
                    }
                    for r in relationships[:10]  # Limit to 10 relationships
                ]
            
            # 5. Add metadata
            context['metadata'] = {
                'total_chunks_retrieved': len(context['chunks']),
                'total_entities': len(context['entities']),
                'total_scenes': len(context['scenes']),
                'total_relationships': len(context['relationships']),
                'timestamp': datetime.utcnow().isoformat()
            }
            
            logger.info(f"Assembled context: {len(context['chunks'])} chunks, "
                       f"{len(context['entities'])} entities, {len(context['scenes'])} scenes")
            
        except Exception as e:
            logger.error(f"Error assembling context: {str(e)}")
            raise
        
        return context
    
    async def get_project_overview(self, project_id: str) -> Dict[str, Any]:
        """
        Get high-level project overview
        
        Args:
            project_id: Project ID
            
        Returns:
            Project overview with stats
        """
        try:
            # Get all entities
            entities = await self.entity_repo.get_by_project(project_id)
            
            # Group by type
            characters = [e for e in entities if e.type.lower() == 'character']
            locations = [e for e in entities if e.type.lower() == 'location']
            themes = [e for e in entities if e.type.lower() == 'theme']
            
            # Get all relationships
            relationships = await self.relationship_repo.get_by_project(project_id)
            
            # Get chunk count
            chunks = await self.text_chunk_repo.get_by_project(project_id)
            
            return {
                'total_entities': len(entities),
                'characters': [{'name': c.name, 'mentions': c.mentions} for c in characters[:20]],
                'locations': [{'name': l.name, 'mentions': l.mentions} for l in locations[:20]],
                'themes': [{'name': t.name, 'mentions': t.mentions} for t in themes[:20]],
                'total_relationships': len(relationships),
                'total_chunks': len(chunks),
                'estimated_words': sum(c.word_count for c in chunks)
            }
        
        except Exception as e:
            logger.error(f"Error getting project overview: {str(e)}")
            return {}
    
    async def get_entity_context(
        self,
        entity_id: str,
        project_id: str
    ) -> Dict[str, Any]:
        """
        Get detailed context about a specific entity
        
        Args:
            entity_id: Entity ID
            project_id: Project ID
            
        Returns:
            Entity context with mentions, relationships, scenes
        """
        try:
            # Get entity
            entity = await self.entity_repo.get_by_id(entity_id)
            if not entity:
                return {}
            
            # Get relationships
            relationships = await self.relationship_repo.get_entity_relationships(entity_id)
            
            # Get mentions
            mentions = await self.entity_mention_repo.get_by_entity(entity_id)
            
            # Get scenes where entity appears
            scenes = []
            scene_ids = set(m.scene_id for m in mentions if m.scene_id)
            for scene_id in scene_ids:
                scene = await self.scene_repo.get_by_id(scene_id)
                if scene:
                    scenes.append(scene)
            
            return {
                'entity': {
                    'id': entity.id,
                    'name': entity.name,
                    'type': entity.type,
                    'description': entity.description,
                    'aliases': entity.aliases or [],
                    'mentions': entity.mentions
                },
                'total_mentions': len(mentions),
                'first_mention': mentions[0] if mentions else None,
                'relationships': [
                    {
                        'related_entity': r.target_entity_id if r.source_entity_id == entity_id else r.source_entity_id,
                        'type': r.relationship_type,
                        'confidence': r.confidence
                    }
                    for r in relationships[:10]
                ],
                'scenes': [
                    {
                        'scene_number': s.scene_number,
                        'chapter_number': s.chapter_number,
                        'scene_type': s.scene_type
                    }
                    for s in scenes[:10]
                ]
            }
        
        except Exception as e:
            logger.error(f"Error getting entity context: {str(e)}")
            return {}
    
    def format_context_for_llm(self, context: Dict[str, Any]) -> str:
        """
        Format assembled context into a readable string for LLM
        
        Args:
            context: Context dictionary from assemble_context
            
        Returns:
            Formatted context string
        """
        parts = []
        
        # Text chunks
        if context.get('chunks'):
            parts.append("=== RELEVANT STORY EXCERPTS ===\n")
            for i, chunk in enumerate(context['chunks'], 1):
                similarity = chunk.get('similarity', 0)
                parts.append(f"[Excerpt {i}] (Relevance: {similarity:.2f})")
                parts.append(chunk['content'])
                parts.append("")  # Empty line
        
        # Entities
        if context.get('entities'):
            parts.append("\n=== CHARACTERS & ENTITIES ===")
            for entity in context['entities']:
                aliases_str = f" (also known as: {', '.join(entity['aliases'])})" if entity.get('aliases') else ""
                parts.append(f"- {entity['name']}{aliases_str} [{entity['type']}]")
                if entity.get('description'):
                    parts.append(f"  Description: {entity['description']}")
                parts.append(f"  Mentioned {entity['mentions']} times")
            parts.append("")
        
        # Scenes
        if context.get('scenes'):
            parts.append("\n=== SCENE CONTEXT ===")
            for scene in context['scenes']:
                scene_info = [f"Scene {scene['scene_number']}"]
                if scene.get('chapter_number'):
                    scene_info.append(f"Chapter {scene['chapter_number']}")
                if scene.get('pov_type'):
                    scene_info.append(f"POV: {scene['pov_type']}")
                if scene.get('scene_type'):
                    scene_info.append(f"Type: {scene['scene_type']}")
                if scene.get('emotional_tone'):
                    scene_info.append(f"Tone: {', '.join(scene['emotional_tone'])}")
                
                parts.append(" | ".join(scene_info))
            parts.append("")
        
        # Relationships
        if context.get('relationships'):
            parts.append("\n=== CHARACTER RELATIONSHIPS ===")
            for rel in context['relationships'][:5]:  # Limit to avoid clutter
                parts.append(f"- {rel['relationship_type']} (confidence: {rel.get('confidence', 0):.2f})")
            parts.append("")
        
        return "\n".join(parts)

