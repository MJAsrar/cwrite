#!/usr/bin/env python3
"""
Test script for relationship discovery service
"""

import asyncio
import sys
import os
from datetime import datetime

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from app.core.database import connect_to_mongo, close_mongo_connection
from app.services.relationship_discovery_service import RelationshipDiscoveryService
from app.repositories.entity_repository import EntityRepository
from app.repositories.relationship_repository import RelationshipRepository
from app.repositories.text_chunk_repository import TextChunkRepository
from app.models.entity import Entity, EntityType, EntityMention
from app.models.text_chunk import TextChunk


async def test_relationship_discovery():
    """Test relationship discovery functionality"""
    
    print("🔗 Testing Relationship Discovery Service")
    print("=" * 50)
    
    try:
        # Connect to database
        await connect_to_mongo()
        
        # Initialize repositories and service
        entity_repo = EntityRepository()
        relationship_repo = RelationshipRepository()
        text_chunk_repo = TextChunkRepository()
        
        discovery_service = RelationshipDiscoveryService(
            entity_repo, relationship_repo, text_chunk_repo
        )
        
        # Test project ID
        test_project_id = "507f1f77bcf86cd799439011"
        
        print(f"📊 Testing with project ID: {test_project_id}")
        
        # Create test entities
        print("\n1. Creating test entities...")
        
        entities = [
            Entity(
                project_id=test_project_id,
                type=EntityType.CHARACTER,
                name="John Smith",
                aliases=["John", "Johnny"],
                confidence_score=0.9,
                mention_count=5,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            ),
            Entity(
                project_id=test_project_id,
                type=EntityType.CHARACTER,
                name="Mary Johnson",
                aliases=["Mary"],
                confidence_score=0.8,
                mention_count=3,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            ),
            Entity(
                project_id=test_project_id,
                type=EntityType.LOCATION,
                name="Central Park",
                aliases=["the park"],
                confidence_score=0.7,
                mention_count=2,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            ),
            Entity(
                project_id=test_project_id,
                type=EntityType.THEME,
                name="Love",
                aliases=[],
                confidence_score=0.6,
                mention_count=4,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
        ]
        
        # Store entities
        created_entities = []
        for entity in entities:
            created_entity = await entity_repo.create(entity)
            created_entities.append(created_entity)
            print(f"   ✅ Created entity: {created_entity.name} ({created_entity.type})")
        
        # Create test text chunks with co-occurrences
        print("\n2. Creating test text chunks...")
        
        text_chunks = [
            TextChunk(
                file_id="507f1f77bcf86cd799439012",
                project_id=test_project_id,
                content="John Smith met Mary Johnson at Central Park. They talked about love and life.",
                start_position=0,
                end_position=80,
                chunk_index=0,
                word_count=14,
                entities_mentioned=[created_entities[0].id, created_entities[1].id, created_entities[2].id],
                created_at=datetime.utcnow()
            ),
            TextChunk(
                file_id="507f1f77bcf86cd799439012",
                project_id=test_project_id,
                content="Mary and John walked together through the park, discussing their feelings of love.",
                start_position=81,
                end_position=160,
                chunk_index=1,
                word_count=13,
                entities_mentioned=[created_entities[0].id, created_entities[1].id, created_entities[2].id, created_entities[3].id],
                created_at=datetime.utcnow()
            ),
            TextChunk(
                file_id="507f1f77bcf86cd799439012",
                project_id=test_project_id,
                content="John thought about Mary often when he was alone in Central Park.",
                start_position=161,
                end_position=225,
                chunk_index=2,
                word_count=12,
                entities_mentioned=[created_entities[0].id, created_entities[1].id, created_entities[2].id],
                created_at=datetime.utcnow()
            )
        ]
        
        # Store text chunks
        created_chunks = []
        for chunk in text_chunks:
            created_chunk = await text_chunk_repo.create(chunk)
            created_chunks.append(created_chunk)
            print(f"   ✅ Created chunk: {created_chunk.content[:50]}...")
        
        # Test relationship discovery
        print("\n3. Testing relationship discovery...")
        
        relationships = await discovery_service.discover_relationships_for_project(test_project_id)
        
        print(f"   📈 Discovered {len(relationships)} relationships:")
        for rel in relationships:
            source_entity = next((e for e in created_entities if e.id == rel.source_entity_id), None)
            target_entity = next((e for e in created_entities if e.id == rel.target_entity_id), None)
            
            if source_entity and target_entity:
                print(f"   🔗 {source_entity.name} --[{rel.relationship_type}]--> {target_entity.name}")
                print(f"      Strength: {rel.strength:.2f}, Co-occurrences: {rel.co_occurrence_count}")
                print(f"      Context: {rel.context_snippets[0][:100] if rel.context_snippets else 'No context'}...")
        
        # Test relationship strength calculation
        print("\n4. Testing relationship strength calculation...")
        
        if relationships:
            test_relationship = relationships[0]
            old_strength = test_relationship.strength
            
            new_strength = await discovery_service.calculate_relationship_strength(
                test_relationship.id,
                additional_factors={'context_quality': 1.2}
            )
            
            print(f"   📊 Relationship strength updated:")
            print(f"      Old strength: {old_strength:.3f}")
            print(f"      New strength: {new_strength:.3f}")
        
        # Test entity network
        print("\n5. Testing entity network...")
        
        if created_entities:
            network = await discovery_service.get_entity_relationship_network(
                created_entities[0].id, max_depth=2, min_strength=0.1
            )
            
            print(f"   🕸️  Network for {created_entities[0].name}:")
            print(f"      Nodes: {len(network['nodes'])}")
            print(f"      Edges: {len(network['edges'])}")
            
            for node_id, node_data in network['nodes'].items():
                print(f"      📍 {node_data['name']} ({node_data['type']}) - Depth: {node_data['depth']}")
        
        # Test relationship statistics
        print("\n6. Testing relationship statistics...")
        
        stats = await discovery_service.get_relationship_statistics(test_project_id)
        
        print(f"   📈 Project relationship statistics:")
        print(f"      Total relationships: {stats['total_relationships']}")
        print(f"      Entity count: {stats['entity_count']}")
        print(f"      Relationship density: {stats['relationship_density']:.3f}")
        print(f"      Avg relationships per entity: {stats['avg_relationships_per_entity']:.2f}")
        print(f"      Strong relationships: {stats['strong_relationships']}")
        print(f"      Weak relationships: {stats['weak_relationships']}")
        
        # Cleanup test data
        print("\n7. Cleaning up test data...")
        
        # Delete relationships
        deleted_relationships = await relationship_repo.delete_by_project(test_project_id)
        print(f"   🗑️  Deleted {deleted_relationships} relationships")
        
        # Delete text chunks
        deleted_chunks = await text_chunk_repo.delete_by_project(test_project_id)
        print(f"   🗑️  Deleted {deleted_chunks} text chunks")
        
        # Delete entities
        deleted_entities = await entity_repo.delete_by_project(test_project_id)
        print(f"   🗑️  Deleted {deleted_entities} entities")
        
        print("\n✅ All relationship discovery tests completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        await close_mongo_connection()
    
    return True


async def main():
    """Main test function"""
    print("🚀 Starting Relationship Discovery Service Tests")
    print("=" * 60)
    
    success = await test_relationship_discovery()
    
    if success:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print("\n💥 Some tests failed!")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)