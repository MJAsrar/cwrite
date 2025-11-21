from celery import current_task
from app.core.celery import celery_app
from app.services.embedding_service import EmbeddingService
from app.services.entity_extraction_service import EntityExtractionService
from app.services.text_extraction_service import TextExtractionService
from app.services.relationship_discovery_service import RelationshipDiscoveryService
from app.services.scene_detection_service import SceneDetectionService
from app.services.position_indexing_service import PositionIndexingService
from app.services.pov_detection_service import POVDetectionService
from app.services.timeline_extraction_service import TimelineExtractionService
from app.services.scene_type_detection_service import SceneTypeDetectionService
from app.repositories.text_chunk_repository import TextChunkRepository
from app.repositories.entity_repository import EntityRepository
from app.repositories.relationship_repository import RelationshipRepository
from app.repositories.file_repository import FileRepository
from app.repositories.indexing_status_repository import IndexingStatusRepository
from app.repositories.scene_repository import SceneRepository
from app.repositories.entity_mention_repository import EntityMentionRepository
from app.repositories.position_index_repository import PositionIndexRepository
from app.models.scene import Scene, SceneCreate
import logging
import asyncio
from datetime import datetime

logger = logging.getLogger(__name__)


@celery_app.task(bind=True)
def index_document_task(self, file_id: str, project_id: str):
    """
    Background task for document indexing with embedding generation
    """
    async def _async_index_document():
        try:
            # Initialize repositories and services
            file_repo = FileRepository()
            text_chunk_repo = TextChunkRepository()
            entity_repo = EntityRepository()
            relationship_repo = RelationshipRepository()
            status_repo = IndexingStatusRepository()
            scene_repo = SceneRepository()
            entity_mention_repo = EntityMentionRepository()
            position_index_repo = PositionIndexRepository()
            
            embedding_service = EmbeddingService(text_chunk_repo)
            entity_service = EntityExtractionService(entity_repo, entity_mention_repo)
            text_service = TextExtractionService()
            relationship_service = RelationshipDiscoveryService(
                entity_repo, relationship_repo, text_chunk_repo
            )
            scene_detection_service = SceneDetectionService()
            position_indexing_service = PositionIndexingService()
            pov_detection_service = POVDetectionService()
            timeline_service = TimelineExtractionService()
            scene_type_service = SceneTypeDetectionService()
            
            # Update status to started
            await status_repo.mark_task_started(self.request.id)
            
            # Update task progress
            current_task.update_state(
                state='PROGRESS',
                meta={'current': 10, 'total': 100, 'status': 'Loading file content...'}
            )
            
            # Get file and extract content
            file_obj = await file_repo.get_by_id(file_id)
            if not file_obj:
                raise ValueError(f"File {file_id} not found")
            
            content = file_obj.text_content
            if not content:
                # Extract text if not already extracted
                content = await text_service.extract_text_from_file(file_obj)
                await file_repo.update_by_id(file_id, {"text_content": content})
            
            logger.info(f"Starting indexing for file {file_id} with {len(content)} characters")
            
            # Step 1: Chunk the text
            current_task.update_state(
                state='PROGRESS',
                meta={'current': 20, 'total': 100, 'status': 'Chunking text...'}
            )
            
            text_chunks = await text_service.chunk_text(file_id, project_id, content)
            logger.info(f"Created {len(text_chunks)} text chunks")
            
            # Step 2: Detect scenes (PHASE 1)
            current_task.update_state(
                state='PROGRESS',
                meta={'current': 30, 'total': 100, 'status': 'Detecting scenes and chapters...'}
            )
            
            scene_boundaries = scene_detection_service.detect_scenes(content, file_obj.filename)
            logger.info(f"Detected {len(scene_boundaries)} scene boundaries")
            
            # Create Scene records
            scenes = []
            for idx, boundary in enumerate(scene_boundaries):
                # Get scene text
                scene_text = scene_detection_service.get_scene_text(content, scene_boundaries, idx)
                
                # Determine end position
                if idx + 1 < len(scene_boundaries):
                    end_pos = scene_boundaries[idx + 1].position
                else:
                    end_pos = len(content)
                
                scene = Scene(
                    file_id=file_id,
                    project_id=project_id,
                    scene_number=idx + 1,
                    chapter_number=boundary.chapter_number,
                    start_char_pos=boundary.position,
                    end_char_pos=end_pos,
                    start_line=boundary.line_number,
                    end_line=content[:end_pos].count('\n') + 1,
                    break_type=boundary.break_type,
                    time_marker=boundary.time_marker,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                
                # Calculate scene stats
                scene.calculate_stats(scene_text)
                
                # PHASE 2: POV Detection
                pov_analysis = pov_detection_service.detect_pov(scene_text)
                scene.pov_type = pov_analysis['pov_type']
                scene.pov_character = pov_analysis.get('pov_character')
                scene.pov_confidence = pov_analysis.get('confidence')
                scene.pov_shifts = pov_analysis.get('shifts', [])
                
                # PHASE 2: Timeline Extraction
                timeline_data = timeline_service.extract_timeline_info(scene_text)
                scene.time_markers = [m['text'] for m in timeline_data.get('time_markers', [])]
                scene.is_flashback = timeline_data.get('is_flashback', False)
                
                # PHASE 2: Scene Type Detection
                scene_type_data = scene_type_service.detect_scene_type(
                    scene_text, 
                    scene.dialogue_percentage
                )
                scene.scene_type = scene_type_data['scene_type']
                scene.characteristics = scene_type_data.get('characteristics', [])
                scene.avg_sentence_length = scene_type_data.get('avg_sentence_length')
                
                # PHASE 2: Scene Significance
                scene.scene_significance = scene_type_service.detect_scene_significance(
                    scene_text,
                    scene_number=idx + 1,
                    total_scenes=len(scene_boundaries),
                    is_first_scene=(idx == 0),
                    is_last_scene=(idx == len(scene_boundaries) - 1)
                )
                
                # PHASE 2: Emotional Tone
                scene.emotional_tone = scene_type_service.get_emotional_tone(scene_text)
                
                # Store scene
                created_scene = await scene_repo.create(scene)
                scenes.append(created_scene)
            
            logger.info(f"Created {len(scenes)} scene records")
            
            # PHASE 2: Timeline Reconstruction (set temporal order)
            current_task.update_state(
                state='PROGRESS',
                meta={'current': 32, 'total': 100, 'status': 'Reconstructing timeline...'}
            )
            
            # Extract all timeline data from scenes
            scene_timeline_data = []
            for scene in scenes:
                scene_text = scene_detection_service.get_scene_text(
                    content, 
                    scene_boundaries, 
                    scene.scene_number - 1
                )
                timeline_info = timeline_service.extract_timeline_info(scene_text)
                scene_timeline_data.append(timeline_info)
            
            # Reconstruct chronological order
            timeline_reconstruction = timeline_service.reconstruct_timeline(
                scene_timeline_data, 
                [s.scene_number for s in scenes]
            )
            
            # Update scenes with temporal order and story time
            for i, scene in enumerate(scenes):
                temporal_order = timeline_reconstruction['chronological_order'].get(
                    scene.scene_number, 
                    scene.scene_number
                )
                scene.temporal_order = temporal_order
                
                # Update scene in database
                await scene_repo.update(scene.id, {
                    'temporal_order': temporal_order,
                    'story_time': timeline_reconstruction.get('scene_times', {}).get(scene.scene_number)
                })
            
            logger.info(f"Timeline reconstructed: {len(timeline_reconstruction.get('flashbacks', []))} flashbacks detected")
            
            # Step 3: Create position index (PHASE 1)
            current_task.update_state(
                state='PROGRESS',
                meta={'current': 35, 'total': 100, 'status': 'Building position index...'}
            )
            
            position_indexes = position_indexing_service.create_position_index(
                content, file_id, project_id, scenes
            )
            
            # Store position indexes
            for idx in position_indexes:
                await position_index_repo.create(idx)
            
            logger.info(f"Created {len(position_indexes)} position index entries")
            
            # Step 4: Extract entities
            current_task.update_state(
                state='PROGRESS',
                meta={'current': 45, 'total': 100, 'status': 'Extracting entities...'}
            )
            
            entities = await entity_service.extract_entities_from_text(content, file_id, project_id)
            logger.info(f"Extracted {len(entities)} entities")
            
            # Step 5: Create detailed entity mentions (PHASE 1)
            current_task.update_state(
                state='PROGRESS',
                meta={'current': 50, 'total': 100, 'status': 'Tracking entity mentions...'}
            )
            
            detailed_mentions = await entity_service.create_detailed_mentions(
                entities, content, file_id, project_id, scenes
            )
            
            # Store detailed mentions
            for mention in detailed_mentions:
                await entity_mention_repo.create(mention)
            
            logger.info(f"Created {len(detailed_mentions)} detailed entity mentions")
            
            # Step 6: Generate embeddings and store chunks
            current_task.update_state(
                state='PROGRESS',
                meta={'current': 60, 'total': 100, 'status': 'Generating embeddings...'}
            )
            
            # Prepare chunk data for embedding service
            chunk_data = []
            for chunk in text_chunks:
                chunk_data.append({
                    'content': chunk.content,
                    'start_position': chunk.start_position,
                    'end_position': chunk.end_position,
                    'chunk_index': chunk.chunk_index,
                    'word_count': chunk.word_count,
                    'entities_mentioned': []  # Will be populated later
                })
            
            # Generate embeddings and store chunks
            created_chunks = await embedding_service.store_text_chunks_with_embeddings(
                file_id, project_id, chunk_data
            )
            
            logger.info(f"Stored {len(created_chunks)} text chunks with embeddings")
            
            # Step 4: Discover relationships between entities
            current_task.update_state(
                state='PROGRESS',
                meta={'current': 80, 'total': 100, 'status': 'Discovering relationships...'}
            )
            
            relationships = []
            if entities:
                entity_ids = [entity.id for entity in entities if entity.id]
                relationships = await relationship_service.discover_relationships_for_entities(
                    project_id, entity_ids
                )
                logger.info(f"Discovered {len(relationships)} relationships")
            
            # Step 5: Update indexing status
            current_task.update_state(
                state='PROGRESS',
                meta={'current': 90, 'total': 100, 'status': 'Finalizing indexing...'}
            )
            
            # Update file processing status
            await file_repo.update_by_id(file_id, {
                "processing_status": "completed",
                "updated_at": datetime.utcnow()
            })
            
            current_task.update_state(
                state='SUCCESS',
                meta={'current': 100, 'total': 100, 'status': 'Indexing completed'}
            )
            
            # Phase 2 statistics
            phase2_stats = {
                'pov_types': set(s.pov_type for s in scenes if s.pov_type),
                'scene_types': set(s.scene_type for s in scenes if s.scene_type),
                'flashback_count': sum(1 for s in scenes if s.is_flashback),
                'pov_shift_count': sum(len(s.pov_shifts) for s in scenes if s.pov_shifts),
            }
            
            return {
                'status': 'completed', 
                'file_id': file_id,
                'scenes_detected': len(scenes),
                'position_indexes_created': len(position_indexes),
                'chunks_created': len(created_chunks),
                'entities_extracted': len(entities),
                'entity_mentions_tracked': len(detailed_mentions),
                'relationships_discovered': len(relationships),
                'phase2_analysis': {
                    'pov_types': list(phase2_stats['pov_types']),
                    'scene_types': list(phase2_stats['scene_types']),
                    'flashback_count': phase2_stats['flashback_count'],
                    'pov_shift_count': phase2_stats['pov_shift_count']
                }
            }
            
        except Exception as exc:
            logger.error(f"Indexing failed for file {file_id}: {exc}")
            
            # Update file status to error
            try:
                file_repo = FileRepository()
                await file_repo.update_by_id(file_id, {
                    "processing_status": "error",
                    "updated_at": datetime.utcnow()
                })
            except:
                pass
            
            current_task.update_state(
                state='FAILURE',
                meta={'error': str(exc)}
            )
            raise
    
    # Run the async function
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        return loop.run_until_complete(_async_index_document())
    finally:
        loop.close()


@celery_app.task(bind=True)
def discover_relationships_task(self, project_id: str, force_rediscovery: bool = False):
    """
    Background task for relationship discovery
    """
    async def _async_discover_relationships():
        try:
            # Initialize repositories and services
            entity_repo = EntityRepository()
            relationship_repo = RelationshipRepository()
            text_chunk_repo = TextChunkRepository()
            status_repo = IndexingStatusRepository()
            
            relationship_service = RelationshipDiscoveryService(
                entity_repo, relationship_repo, text_chunk_repo
            )
            
            # Update status to started
            await status_repo.mark_task_started(self.request.id)
            
            # Update task progress
            current_task.update_state(
                state='PROGRESS',
                meta={'current': 10, 'total': 100, 'status': 'Starting relationship discovery...'}
            )
            
            logger.info(f"Starting relationship discovery for project {project_id}")
            
            # Discover relationships
            relationships = await relationship_service.discover_relationships_for_project(
                project_id, force_rediscovery
            )
            
            current_task.update_state(
                state='SUCCESS',
                meta={'current': 100, 'total': 100, 'status': 'Relationship discovery completed'}
            )
            
            return {
                'status': 'completed',
                'project_id': project_id,
                'relationships_discovered': len(relationships)
            }
            
        except Exception as exc:
            logger.error(f"Relationship discovery failed for project {project_id}: {exc}")
            
            current_task.update_state(
                state='FAILURE',
                meta={'error': str(exc)}
            )
            raise
    
    # Run the async function
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        return loop.run_until_complete(_async_discover_relationships())
    finally:
        loop.close()


@celery_app.task(bind=True)
def reindex_project_task(self, project_id: str, incremental: bool = False):
    """
    Background task for full or incremental project reindexing
    """
    async def _async_reindex_project():
        try:
            # Initialize repositories and services
            file_repo = FileRepository()
            text_chunk_repo = TextChunkRepository()
            entity_repo = EntityRepository()
            relationship_repo = RelationshipRepository()
            
            embedding_service = EmbeddingService(text_chunk_repo)
            entity_service = EntityExtractionService(entity_repo)
            text_service = TextExtractionService()
            relationship_service = RelationshipDiscoveryService(
                entity_repo, relationship_repo, text_chunk_repo
            )
            
            # Update task progress
            current_task.update_state(
                state='PROGRESS',
                meta={'current': 5, 'total': 100, 'status': 'Starting project reindexing...'}
            )
            
            logger.info(f"Starting {'incremental' if incremental else 'full'} reindexing for project {project_id}")
            
            # Get all files in the project
            files = await file_repo.get_by_project(project_id)
            if not files:
                logger.info(f"No files found for project {project_id}")
                return {'status': 'completed', 'project_id': project_id, 'files_processed': 0}
            
            # Update progress
            current_task.update_state(
                state='PROGRESS',
                meta={'current': 10, 'total': 100, 'status': f'Found {len(files)} files to process...'}
            )
            
            processed_files = 0
            total_chunks = 0
            total_entities = 0
            total_relationships = 0
            
            # Process each file
            for i, file_obj in enumerate(files):
                try:
                    # Skip files that don't need reprocessing in incremental mode
                    if incremental and file_obj.processing_status == "completed":
                        continue
                    
                    # Update progress
                    progress = 10 + (i / len(files)) * 70  # 10-80% for file processing
                    current_task.update_state(
                        state='PROGRESS',
                        meta={
                            'current': int(progress), 
                            'total': 100, 
                            'status': f'Processing file {i+1}/{len(files)}: {file_obj.filename}'
                        }
                    )
                    
                    # Clear existing data for this file if full reindex
                    if not incremental:
                        await text_chunk_repo.delete_by_file(file_obj.id)
                        # Note: Entities and relationships are project-wide, handled separately
                    
                    # Extract text content
                    content = file_obj.text_content
                    if not content:
                        content = await text_service.extract_text_from_file(file_obj)
                        await file_repo.update_by_id(file_obj.id, {"text_content": content})
                    
                    # Create text chunks
                    text_chunks = await text_service.chunk_text(file_obj.id, project_id, content)
                    
                    # Prepare chunk data for embedding service
                    chunk_data = []
                    for chunk in text_chunks:
                        chunk_data.append({
                            'content': chunk.content,
                            'start_position': chunk.start_position,
                            'end_position': chunk.end_position,
                            'chunk_index': chunk.chunk_index,
                            'word_count': chunk.word_count,
                            'entities_mentioned': []
                        })
                    
                    # Generate embeddings and store chunks
                    created_chunks = await embedding_service.store_text_chunks_with_embeddings(
                        file_obj.id, project_id, chunk_data
                    )
                    
                    # Extract entities from this file
                    entities = await entity_service.extract_entities_from_text(
                        content, file_obj.id, project_id
                    )
                    
                    # Update file status
                    await file_repo.update_by_id(file_obj.id, {
                        "processing_status": "completed",
                        "updated_at": datetime.utcnow()
                    })
                    
                    processed_files += 1
                    total_chunks += len(created_chunks)
                    total_entities += len(entities)
                    
                    logger.info(f"Processed file {file_obj.filename}: {len(created_chunks)} chunks, {len(entities)} entities")
                    
                except Exception as e:
                    logger.error(f"Error processing file {file_obj.filename}: {e}")
                    await file_repo.update_by_id(file_obj.id, {
                        "processing_status": "error",
                        "updated_at": datetime.utcnow()
                    })
            
            # Discover relationships for the entire project
            current_task.update_state(
                state='PROGRESS',
                meta={'current': 85, 'total': 100, 'status': 'Discovering entity relationships...'}
            )
            
            relationships = await relationship_service.discover_relationships_for_project(
                project_id, force_rediscovery=not incremental
            )
            total_relationships = len(relationships)
            
            # Final progress update
            current_task.update_state(
                state='SUCCESS',
                meta={'current': 100, 'total': 100, 'status': 'Project reindexing completed'}
            )
            
            result = {
                'status': 'completed',
                'project_id': project_id,
                'incremental': incremental,
                'files_processed': processed_files,
                'total_files': len(files),
                'chunks_created': total_chunks,
                'entities_extracted': total_entities,
                'relationships_discovered': total_relationships
            }
            
            logger.info(f"Project reindexing completed: {result}")
            return result
            
        except Exception as exc:
            logger.error(f"Project reindexing failed for {project_id}: {exc}")
            
            current_task.update_state(
                state='FAILURE',
                meta={'error': str(exc)}
            )
            raise
    
    # Run the async function
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        return loop.run_until_complete(_async_reindex_project())
    finally:
        loop.close()


@celery_app.task(bind=True)
def batch_generate_embeddings_task(self, project_id: str, batch_size: int = 50):
    """
    Background task for batch embedding generation
    """
    async def _async_batch_embeddings():
        try:
            # Initialize services
            text_chunk_repo = TextChunkRepository()
            embedding_service = EmbeddingService(text_chunk_repo)
            
            current_task.update_state(
                state='PROGRESS',
                meta={'current': 10, 'total': 100, 'status': 'Starting batch embedding generation...'}
            )
            
            logger.info(f"Starting batch embedding generation for project {project_id}")
            
            total_generated = 0
            batch_count = 0
            
            while True:
                # Generate embeddings for a batch
                generated_count = await embedding_service.batch_generate_missing_embeddings(
                    project_id, batch_size
                )
                
                if generated_count == 0:
                    break  # No more chunks without embeddings
                
                total_generated += generated_count
                batch_count += 1
                
                # Update progress (estimate based on batches processed)
                progress = min(90, 10 + batch_count * 10)
                current_task.update_state(
                    state='PROGRESS',
                    meta={
                        'current': progress, 
                        'total': 100, 
                        'status': f'Generated embeddings for {total_generated} chunks...'
                    }
                )
                
                logger.info(f"Batch {batch_count}: Generated {generated_count} embeddings")
            
            current_task.update_state(
                state='SUCCESS',
                meta={'current': 100, 'total': 100, 'status': 'Batch embedding generation completed'}
            )
            
            return {
                'status': 'completed',
                'project_id': project_id,
                'total_embeddings_generated': total_generated,
                'batches_processed': batch_count
            }
            
        except Exception as exc:
            logger.error(f"Batch embedding generation failed for project {project_id}: {exc}")
            
            current_task.update_state(
                state='FAILURE',
                meta={'error': str(exc)}
            )
            raise
    
    # Run the async function
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        return loop.run_until_complete(_async_batch_embeddings())
    finally:
        loop.close()


@celery_app.task(bind=True)
def cleanup_orphaned_data_task(self, project_id: str):
    """
    Background task for cleaning up orphaned data
    """
    async def _async_cleanup():
        try:
            # Initialize repositories
            file_repo = FileRepository()
            text_chunk_repo = TextChunkRepository()
            entity_repo = EntityRepository()
            relationship_repo = RelationshipRepository()
            
            current_task.update_state(
                state='PROGRESS',
                meta={'current': 10, 'total': 100, 'status': 'Starting data cleanup...'}
            )
            
            logger.info(f"Starting data cleanup for project {project_id}")
            
            # Get all files in the project
            files = await file_repo.get_by_project(project_id)
            file_ids = {file.id for file in files}
            
            # Clean up orphaned text chunks
            current_task.update_state(
                state='PROGRESS',
                meta={'current': 30, 'total': 100, 'status': 'Cleaning up orphaned text chunks...'}
            )
            
            all_chunks = await text_chunk_repo.get_by_project(project_id)
            orphaned_chunks = [chunk for chunk in all_chunks if chunk.file_id not in file_ids]
            
            deleted_chunks = 0
            for chunk in orphaned_chunks:
                await text_chunk_repo.delete_by_id(chunk.id)
                deleted_chunks += 1
            
            # Clean up orphaned relationships (entities that no longer exist)
            current_task.update_state(
                state='PROGRESS',
                meta={'current': 60, 'total': 100, 'status': 'Cleaning up orphaned relationships...'}
            )
            
            all_entities = await entity_repo.get_by_project(project_id)
            entity_ids = {entity.id for entity in all_entities}
            
            all_relationships = await relationship_repo.get_by_project(project_id)
            orphaned_relationships = [
                rel for rel in all_relationships 
                if rel.source_entity_id not in entity_ids or rel.target_entity_id not in entity_ids
            ]
            
            deleted_relationships = 0
            for relationship in orphaned_relationships:
                await relationship_repo.delete_by_id(relationship.id)
                deleted_relationships += 1
            
            current_task.update_state(
                state='SUCCESS',
                meta={'current': 100, 'total': 100, 'status': 'Data cleanup completed'}
            )
            
            result = {
                'status': 'completed',
                'project_id': project_id,
                'deleted_chunks': deleted_chunks,
                'deleted_relationships': deleted_relationships
            }
            
            logger.info(f"Data cleanup completed: {result}")
            return result
            
        except Exception as exc:
            logger.error(f"Data cleanup failed for project {project_id}: {exc}")
            
            current_task.update_state(
                state='FAILURE',
                meta={'error': str(exc)}
            )
            raise
    
    # Run the async function
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        return loop.run_until_complete(_async_cleanup())
    finally:
        loop.close()