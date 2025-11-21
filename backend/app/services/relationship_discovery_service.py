"""
Relationship Discovery Service

This service handles the discovery and analysis of relationships between entities
through co-occurrence analysis, relationship strength calculation, and type classification.
"""

import logging
from typing import List, Dict, Set, Tuple, Optional, Any
from collections import defaultdict, Counter
from datetime import datetime
import re
import math

from ..models.entity import Entity, EntityType
from ..models.relationship import Relationship, RelationshipType, RelationshipCreate
from ..models.text_chunk import TextChunk
from ..repositories.entity_repository import EntityRepository
from ..repositories.relationship_repository import RelationshipRepository
from ..repositories.text_chunk_repository import TextChunkRepository

logger = logging.getLogger(__name__)


class RelationshipDiscoveryService:
    """Service for discovering and analyzing entity relationships"""
    
    def __init__(
        self, 
        entity_repository: EntityRepository,
        relationship_repository: RelationshipRepository,
        text_chunk_repository: TextChunkRepository
    ):
        self.entity_repository = entity_repository
        self.relationship_repository = relationship_repository
        self.text_chunk_repository = text_chunk_repository
        
        # Configuration parameters
        self.min_co_occurrence_threshold = 2
        self.context_window_size = 200  # characters
        self.relationship_strength_threshold = 0.1
        
    async def discover_relationships_for_project(
        self, 
        project_id: str,
        force_rediscovery: bool = False
    ) -> List[Relationship]:
        """
        Discover all relationships for entities in a project
        
        Args:
            project_id: ID of the project
            force_rediscovery: Whether to rediscover existing relationships
            
        Returns:
            List of discovered relationships
        """
        try:
            logger.info(f"Starting relationship discovery for project {project_id}")
            
            # Get all entities for the project
            entities = await self.entity_repository.get_by_project(project_id)
            if not entities:
                logger.info(f"No entities found for project {project_id}")
                return []
            
            # Get all text chunks for the project
            text_chunks = await self.text_chunk_repository.get_by_project(project_id)
            if not text_chunks:
                logger.info(f"No text chunks found for project {project_id}")
                return []
            
            # Clear existing relationships if force rediscovery
            if force_rediscovery:
                await self.relationship_repository.delete_by_project(project_id)
            
            # Discover co-occurrences
            co_occurrences = await self._analyze_co_occurrences(entities, text_chunks)
            
            # Create or update relationships
            relationships = []
            for (entity1_id, entity2_id), occurrence_data in co_occurrences.items():
                if occurrence_data['count'] >= self.min_co_occurrence_threshold:
                    relationship = await self._create_or_update_relationship(
                        project_id, entity1_id, entity2_id, occurrence_data
                    )
                    if relationship:
                        relationships.append(relationship)
            
            logger.info(f"Discovered {len(relationships)} relationships for project {project_id}")
            return relationships
            
        except Exception as e:
            logger.error(f"Error discovering relationships for project {project_id}: {e}")
            raise
    
    async def discover_relationships_for_entities(
        self, 
        project_id: str,
        entity_ids: List[str]
    ) -> List[Relationship]:
        """
        Discover relationships for specific entities
        
        Args:
            project_id: ID of the project
            entity_ids: List of entity IDs to analyze
            
        Returns:
            List of discovered relationships
        """
        try:
            # Get specified entities
            entities = []
            for entity_id in entity_ids:
                entity = await self.entity_repository.get_by_id(entity_id)
                if entity and entity.project_id == project_id:
                    entities.append(entity)
            
            if not entities:
                return []
            
            # Get text chunks that mention these entities
            relevant_chunks = set()
            for entity in entities:
                chunks = await self.text_chunk_repository.get_chunks_by_entity(entity.id)
                relevant_chunks.update(chunks)
            
            relevant_chunks = list(relevant_chunks)
            
            # Analyze co-occurrences
            co_occurrences = await self._analyze_co_occurrences(entities, relevant_chunks)
            
            # Create or update relationships
            relationships = []
            for (entity1_id, entity2_id), occurrence_data in co_occurrences.items():
                if occurrence_data['count'] >= self.min_co_occurrence_threshold:
                    relationship = await self._create_or_update_relationship(
                        project_id, entity1_id, entity2_id, occurrence_data
                    )
                    if relationship:
                        relationships.append(relationship)
            
            return relationships
            
        except Exception as e:
            logger.error(f"Error discovering relationships for entities: {e}")
            raise
    
    async def _analyze_co_occurrences(
        self, 
        entities: List[Entity], 
        text_chunks: List[TextChunk]
    ) -> Dict[Tuple[str, str], Dict[str, Any]]:
        """
        Analyze co-occurrences between entities in text chunks
        
        Args:
            entities: List of entities to analyze
            text_chunks: List of text chunks to search
            
        Returns:
            Dictionary mapping entity pairs to occurrence data
        """
        # Create entity lookup maps
        entity_by_id = {entity.id: entity for entity in entities}
        entity_names_to_ids = {}
        
        for entity in entities:
            # Map entity name and aliases to entity ID
            names = [entity.name.lower()] + [alias.lower() for alias in entity.aliases]
            for name in names:
                if name not in entity_names_to_ids:
                    entity_names_to_ids[name] = []
                entity_names_to_ids[name].append(entity.id)
        
        co_occurrences = defaultdict(lambda: {
            'count': 0,
            'contexts': [],
            'chunk_ids': set(),
            'entity1_type': None,
            'entity2_type': None
        })
        
        # Analyze each text chunk
        for chunk in text_chunks:
            chunk_text = chunk.content.lower()
            entities_in_chunk = []
            
            # Find all entity mentions in this chunk
            for name, entity_ids in entity_names_to_ids.items():
                if self._find_entity_in_text(name, chunk_text):
                    for entity_id in entity_ids:
                        if entity_id not in [e[0] for e in entities_in_chunk]:
                            entities_in_chunk.append((entity_id, name))
            
            # Create co-occurrence pairs
            for i, (entity1_id, name1) in enumerate(entities_in_chunk):
                for j, (entity2_id, name2) in enumerate(entities_in_chunk[i+1:], i+1):
                    if entity1_id != entity2_id:
                        # Ensure consistent ordering (smaller ID first)
                        if entity1_id > entity2_id:
                            entity1_id, entity2_id = entity2_id, entity1_id
                            name1, name2 = name2, name1
                        
                        pair_key = (entity1_id, entity2_id)
                        
                        # Extract context around both entities
                        context = self._extract_co_occurrence_context(
                            chunk.content, name1, name2
                        )
                        
                        co_occurrences[pair_key]['count'] += 1
                        co_occurrences[pair_key]['contexts'].append(context)
                        co_occurrences[pair_key]['chunk_ids'].add(chunk.id)
                        co_occurrences[pair_key]['entity1_type'] = entity_by_id[entity1_id].type
                        co_occurrences[pair_key]['entity2_type'] = entity_by_id[entity2_id].type
        
        # Convert sets to lists for JSON serialization
        for occurrence_data in co_occurrences.values():
            occurrence_data['chunk_ids'] = list(occurrence_data['chunk_ids'])
        
        return dict(co_occurrences)
    
    def _find_entity_in_text(self, entity_name: str, text: str) -> bool:
        """
        Find entity mentions in text using word boundaries
        
        Args:
            entity_name: Name of the entity to find
            text: Text to search in
            
        Returns:
            True if entity is found, False otherwise
        """
        # Use word boundaries to avoid partial matches
        pattern = r'\b' + re.escape(entity_name) + r'\b'
        return bool(re.search(pattern, text, re.IGNORECASE))
    
    def _extract_co_occurrence_context(
        self, 
        text: str, 
        entity1_name: str, 
        entity2_name: str
    ) -> str:
        """
        Extract context around co-occurring entities
        
        Args:
            text: Full text content
            entity1_name: Name of first entity
            entity2_name: Name of second entity
            
        Returns:
            Context string containing both entities
        """
        # Find positions of both entities
        pattern1 = r'\b' + re.escape(entity1_name) + r'\b'
        pattern2 = r'\b' + re.escape(entity2_name) + r'\b'
        
        match1 = re.search(pattern1, text, re.IGNORECASE)
        match2 = re.search(pattern2, text, re.IGNORECASE)
        
        if not match1 or not match2:
            return text[:self.context_window_size]
        
        # Find the span that includes both entities
        start_pos = min(match1.start(), match2.start())
        end_pos = max(match1.end(), match2.end())
        
        # Expand context window
        context_start = max(0, start_pos - self.context_window_size // 2)
        context_end = min(len(text), end_pos + self.context_window_size // 2)
        
        context = text[context_start:context_end].strip()
        
        # Add ellipsis if truncated
        if context_start > 0:
            context = "..." + context
        if context_end < len(text):
            context = context + "..."
        
        return context
    
    async def _create_or_update_relationship(
        self, 
        project_id: str,
        entity1_id: str, 
        entity2_id: str, 
        occurrence_data: Dict[str, Any]
    ) -> Optional[Relationship]:
        """
        Create or update a relationship between two entities
        
        Args:
            project_id: ID of the project
            entity1_id: ID of first entity
            entity2_id: ID of second entity
            occurrence_data: Co-occurrence analysis data
            
        Returns:
            Created or updated relationship
        """
        try:
            # Check if relationship already exists
            existing_relationship = await self.relationship_repository.get_relationship(
                entity1_id, entity2_id
            )
            
            if existing_relationship:
                # Update existing relationship
                existing_relationship.co_occurrence_count += occurrence_data['count']
                
                # Add new context snippets
                for context in occurrence_data['contexts'][-5:]:  # Keep last 5 contexts
                    existing_relationship.add_context_snippet(context)
                
                # Update strength
                existing_relationship.update_strength()
                
                # Save updated relationship
                updated_relationship = await self.relationship_repository.update_by_id(
                    existing_relationship.id,
                    {
                        'co_occurrence_count': existing_relationship.co_occurrence_count,
                        'strength': existing_relationship.strength,
                        'context_snippets': existing_relationship.context_snippets,
                        'updated_at': datetime.utcnow()
                    }
                )
                return updated_relationship
            
            else:
                # Create new relationship
                relationship_type = self._classify_relationship_type(
                    occurrence_data['entity1_type'],
                    occurrence_data['entity2_type'],
                    occurrence_data['contexts']
                )
                
                relationship = Relationship(
                    project_id=project_id,
                    source_entity_id=entity1_id,
                    target_entity_id=entity2_id,
                    relationship_type=relationship_type,
                    co_occurrence_count=occurrence_data['count'],
                    context_snippets=occurrence_data['contexts'][-5:],  # Keep last 5 contexts
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                
                # Calculate initial strength
                relationship.update_strength()
                
                # Save new relationship
                created_relationship = await self.relationship_repository.create(relationship)
                return created_relationship
                
        except Exception as e:
            logger.error(f"Error creating/updating relationship: {e}")
            return None
    
    def _classify_relationship_type(
        self, 
        entity1_type: EntityType, 
        entity2_type: EntityType,
        contexts: List[str]
    ) -> RelationshipType:
        """
        Classify the type of relationship between two entities
        
        Args:
            entity1_type: Type of first entity
            entity2_type: Type of second entity
            contexts: List of context snippets
            
        Returns:
            Classified relationship type
        """
        # Combine all contexts for analysis
        combined_context = " ".join(contexts).lower()
        
        # Character-Location relationships
        if ((entity1_type == EntityType.CHARACTER and entity2_type == EntityType.LOCATION) or
            (entity1_type == EntityType.LOCATION and entity2_type == EntityType.CHARACTER)):
            
            # Check for location indicators
            location_indicators = [
                'in', 'at', 'from', 'to', 'inside', 'outside', 'near', 'around',
                'entered', 'left', 'arrived', 'departed', 'visited', 'went to'
            ]
            
            if any(indicator in combined_context for indicator in location_indicators):
                return RelationshipType.LOCATED_IN
            else:
                return RelationshipType.MENTIONS
        
        # Character-Theme relationships
        elif ((entity1_type == EntityType.CHARACTER and entity2_type == EntityType.THEME) or
              (entity1_type == EntityType.THEME and entity2_type == EntityType.CHARACTER)):
            
            # Check for thematic connection indicators
            theme_indicators = [
                'feels', 'feeling', 'emotion', 'thinks', 'believes', 'struggles with',
                'embodies', 'represents', 'symbolizes', 'experiences'
            ]
            
            if any(indicator in combined_context for indicator in theme_indicators):
                return RelationshipType.RELATED_TO
            else:
                return RelationshipType.MENTIONS
        
        # Character-Character relationships
        elif entity1_type == EntityType.CHARACTER and entity2_type == EntityType.CHARACTER:
            
            # Check for interaction indicators
            interaction_indicators = [
                'spoke to', 'talked to', 'said to', 'told', 'asked', 'replied',
                'met', 'saw', 'looked at', 'with', 'and', 'together'
            ]
            
            if any(indicator in combined_context for indicator in interaction_indicators):
                return RelationshipType.INTERACTS_WITH
            else:
                return RelationshipType.APPEARS_WITH
        
        # Location-Theme relationships
        elif ((entity1_type == EntityType.LOCATION and entity2_type == EntityType.THEME) or
              (entity1_type == EntityType.THEME and entity2_type == EntityType.LOCATION)):
            return RelationshipType.RELATED_TO
        
        # Location-Location relationships
        elif entity1_type == EntityType.LOCATION and entity2_type == EntityType.LOCATION:
            
            # Check for spatial relationships
            spatial_indicators = ['near', 'next to', 'inside', 'outside', 'between', 'across from']
            
            if any(indicator in combined_context for indicator in spatial_indicators):
                return RelationshipType.RELATED_TO
            else:
                return RelationshipType.APPEARS_WITH
        
        # Theme-Theme relationships
        elif entity1_type == EntityType.THEME and entity2_type == EntityType.THEME:
            return RelationshipType.RELATED_TO
        
        # Default relationship type
        return RelationshipType.APPEARS_WITH
    
    async def calculate_relationship_strength(
        self, 
        relationship_id: str,
        additional_factors: Optional[Dict[str, Any]] = None
    ) -> float:
        """
        Calculate relationship strength using multiple factors
        
        Args:
            relationship_id: ID of the relationship
            additional_factors: Additional factors to consider
            
        Returns:
            Calculated strength score (0.0 to 1.0)
        """
        try:
            relationship = await self.relationship_repository.get_by_id(relationship_id)
            if not relationship:
                return 0.0
            
            # Base strength from co-occurrence count
            base_strength = self._calculate_co_occurrence_strength(relationship.co_occurrence_count)
            
            # Context quality factor
            context_quality = self._calculate_context_quality(relationship.context_snippets)
            
            # Relationship type factor
            type_factor = self._get_relationship_type_factor(relationship.relationship_type)
            
            # Combine factors
            final_strength = base_strength * context_quality * type_factor
            
            # Apply additional factors if provided
            if additional_factors:
                for factor_name, factor_value in additional_factors.items():
                    if isinstance(factor_value, (int, float)) and 0.0 <= factor_value <= 2.0:
                        final_strength *= factor_value
            
            # Ensure strength is within bounds
            final_strength = max(0.0, min(1.0, final_strength))
            
            # Update relationship strength
            await self.relationship_repository.update_strength(relationship_id, final_strength)
            
            return final_strength
            
        except Exception as e:
            logger.error(f"Error calculating relationship strength: {e}")
            return 0.0
    
    def _calculate_co_occurrence_strength(self, co_occurrence_count: int) -> float:
        """Calculate strength based on co-occurrence frequency"""
        if co_occurrence_count <= 0:
            return 0.0
        elif co_occurrence_count == 1:
            return 0.1
        elif co_occurrence_count <= 5:
            return min(0.5, co_occurrence_count * 0.1)
        else:
            # Logarithmic scaling for higher counts
            return min(1.0, 0.5 + 0.1 * math.log(co_occurrence_count - 4))
    
    def _calculate_context_quality(self, context_snippets: List[str]) -> float:
        """Calculate quality factor based on context richness"""
        if not context_snippets:
            return 0.5
        
        total_quality = 0.0
        
        for context in context_snippets:
            context_lower = context.lower()
            quality = 0.5  # Base quality
            
            # Boost for meaningful words
            meaningful_words = [
                'said', 'told', 'asked', 'replied', 'spoke', 'talked',
                'met', 'saw', 'looked', 'went', 'came', 'with', 'and'
            ]
            meaningful_count = sum(1 for word in meaningful_words if word in context_lower)
            quality += min(0.3, meaningful_count * 0.05)
            
            # Boost for dialogue indicators
            if '"' in context or "'" in context:
                quality += 0.1
            
            # Reduce for very short contexts
            if len(context) < 50:
                quality *= 0.8
            
            total_quality += quality
        
        # Average quality across all contexts
        avg_quality = total_quality / len(context_snippets)
        return min(1.0, avg_quality)
    
    def _get_relationship_type_factor(self, relationship_type: RelationshipType) -> float:
        """Get strength multiplier based on relationship type"""
        type_factors = {
            RelationshipType.INTERACTS_WITH: 1.2,
            RelationshipType.LOCATED_IN: 1.1,
            RelationshipType.RELATED_TO: 1.0,
            RelationshipType.APPEARS_WITH: 0.9,
            RelationshipType.MENTIONS: 0.8,
            RelationshipType.BELONGS_TO: 1.1
        }
        return type_factors.get(relationship_type, 1.0)
    
    async def get_entity_relationship_network(
        self, 
        entity_id: str, 
        max_depth: int = 2,
        min_strength: float = 0.1
    ) -> Dict[str, Any]:
        """
        Get relationship network for an entity
        
        Args:
            entity_id: ID of the central entity
            max_depth: Maximum relationship depth to explore
            min_strength: Minimum relationship strength threshold
            
        Returns:
            Network data structure
        """
        try:
            network = {
                'nodes': {},
                'edges': [],
                'center_entity_id': entity_id
            }
            
            visited_entities = set()
            current_level = {entity_id}
            
            # Get center entity
            center_entity = await self.entity_repository.get_by_id(entity_id)
            if not center_entity:
                return network
            
            network['nodes'][entity_id] = {
                'id': entity_id,
                'name': center_entity.name,
                'type': center_entity.type,
                'depth': 0
            }
            
            # Explore relationships level by level
            for depth in range(max_depth):
                next_level = set()
                
                for current_entity_id in current_level:
                    if current_entity_id in visited_entities:
                        continue
                    
                    visited_entities.add(current_entity_id)
                    
                    # Get relationships for current entity
                    relationships = await self.relationship_repository.get_by_entity(current_entity_id)
                    
                    for relationship in relationships:
                        if relationship.strength < min_strength:
                            continue
                        
                        # Determine the other entity in the relationship
                        other_entity_id = (
                            relationship.target_entity_id 
                            if relationship.source_entity_id == current_entity_id 
                            else relationship.source_entity_id
                        )
                        
                        # Add other entity to network if not already present
                        if other_entity_id not in network['nodes']:
                            other_entity = await self.entity_repository.get_by_id(other_entity_id)
                            if other_entity:
                                network['nodes'][other_entity_id] = {
                                    'id': other_entity_id,
                                    'name': other_entity.name,
                                    'type': other_entity.type,
                                    'depth': depth + 1
                                }
                                next_level.add(other_entity_id)
                        
                        # Add edge to network
                        edge = {
                            'source': relationship.source_entity_id,
                            'target': relationship.target_entity_id,
                            'type': relationship.relationship_type,
                            'strength': relationship.strength,
                            'co_occurrence_count': relationship.co_occurrence_count
                        }
                        
                        # Avoid duplicate edges
                        if edge not in network['edges']:
                            network['edges'].append(edge)
                
                current_level = next_level
                if not current_level:
                    break
            
            return network
            
        except Exception as e:
            logger.error(f"Error getting entity relationship network: {e}")
            return {'nodes': {}, 'edges': [], 'center_entity_id': entity_id}
    
    async def get_relationship_statistics(self, project_id: str) -> Dict[str, Any]:
        """
        Get comprehensive relationship statistics for a project
        
        Args:
            project_id: ID of the project
            
        Returns:
            Dictionary containing relationship statistics
        """
        try:
            # Get basic relationship stats
            basic_stats = await self.relationship_repository.get_relationship_stats_by_project(project_id)
            
            # Get entity count
            entities = await self.entity_repository.get_by_project(project_id)
            entity_count = len(entities)
            
            # Calculate additional metrics
            stats = {
                **basic_stats,
                'entity_count': entity_count,
                'relationship_density': 0.0,
                'avg_relationships_per_entity': 0.0,
                'strong_relationships': 0,
                'weak_relationships': 0
            }
            
            if entity_count > 1:
                # Calculate relationship density (actual relationships / possible relationships)
                max_possible_relationships = (entity_count * (entity_count - 1)) / 2
                stats['relationship_density'] = basic_stats['total_relationships'] / max_possible_relationships
                
                # Calculate average relationships per entity
                stats['avg_relationships_per_entity'] = basic_stats['total_relationships'] / entity_count
            
            # Count strong vs weak relationships
            relationships = await self.relationship_repository.get_by_project(project_id)
            for relationship in relationships:
                if relationship.strength >= 0.5:
                    stats['strong_relationships'] += 1
                else:
                    stats['weak_relationships'] += 1
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting relationship statistics: {e}")
            return {
                'total_relationships': 0,
                'entity_count': 0,
                'relationship_density': 0.0,
                'avg_relationships_per_entity': 0.0,
                'strong_relationships': 0,
                'weak_relationships': 0
            }