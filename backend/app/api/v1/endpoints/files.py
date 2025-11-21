from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, Query
from fastapi.responses import StreamingResponse
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime
import asyncio
from io import BytesIO

from app.core.security import get_current_user
from app.models.user import User
from app.models.file import ProjectFile, FileResponse, UploadStatus, ProcessingStatus
from app.models.project import Project
from app.services.file_service import FileService
from app.services.text_extraction_service import TextExtractionService
from app.repositories.file_repository import FileRepository
from app.repositories.project_repository import ProjectRepository

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize services
file_service = FileService()
text_extraction_service = TextExtractionService()
file_repository = FileRepository()
project_repository = ProjectRepository()


@router.post("/projects/{project_id}/files/upload", response_model=FileResponse)
async def upload_file(
    project_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a file to a project with progress tracking
    
    - **project_id**: Project ID to upload file to
    - **file**: File to upload (.txt, .md, .docx)
    
    Returns the created file record with upload status
    """
    try:
        # Verify project exists and user has access
        project = await project_repository.get_by_id(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Upload file
        uploaded_file = await file_service.upload_file(project_id, file)
        
        # Schedule background processing
        background_tasks.add_task(
            process_uploaded_file,
            uploaded_file.id,
            project_id
        )
        
        # Convert to response model
        response = FileResponse(
            id=uploaded_file.id,
            project_id=uploaded_file.project_id,
            filename=uploaded_file.filename,
            original_filename=uploaded_file.original_filename,
            content_type=uploaded_file.content_type,
            size=uploaded_file.size,
            upload_status=uploaded_file.upload_status,
            processing_status=uploaded_file.processing_status,
            created_at=uploaded_file.created_at,
            updated_at=uploaded_file.updated_at,
            metadata=uploaded_file.metadata,
            error_message=uploaded_file.error_message,
            text_content=uploaded_file.text_content  # Include text content
        )
        
        logger.info(f"File {uploaded_file.filename} uploaded successfully to project {project_id}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"Error uploading file to project {project_id}: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")


@router.get("/projects/{project_id}/files", response_model=List[FileResponse])
async def list_project_files(
    project_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[UploadStatus] = None,
    processing_status: Optional[ProcessingStatus] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Get list of files in a project with metadata
    
    - **project_id**: Project ID
    - **skip**: Number of files to skip (pagination)
    - **limit**: Maximum number of files to return
    - **status**: Filter by upload status
    - **processing_status**: Filter by processing status
    """
    try:
        # Verify project exists and user has access
        project = await project_repository.get_by_id(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get files with optional filtering
        if status or processing_status:
            files = await file_repository.get_files_by_status(
                upload_status=status,
                processing_status=processing_status,
                skip=skip,
                limit=limit
            )
            # Filter by project
            files = [f for f in files if f.project_id == project_id]
        else:
            files = await file_repository.get_by_project(project_id, skip=skip, limit=limit)
        
        # Convert to response models
        response_files = []
        for file_record in files:
            response = FileResponse(
                id=file_record.id,
                project_id=file_record.project_id,
                filename=file_record.filename,
                original_filename=file_record.original_filename,
                content_type=file_record.content_type,
                size=file_record.size,
                upload_status=file_record.upload_status,
                processing_status=file_record.processing_status,
                created_at=file_record.created_at,
                updated_at=file_record.updated_at,
                metadata=file_record.metadata,
                error_message=file_record.error_message,
                text_content=file_record.text_content  # Include text content
            )
            response_files.append(response)
        
        return response_files
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing files for project {project_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve files")


@router.get("/files/{file_id}", response_model=FileResponse)
async def get_file_metadata(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed file metadata and status
    
    - **file_id**: File ID
    """
    try:
        # Get file record
        file_record = await file_repository.get_by_id(file_id)
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Verify user has access to the project
        project = await project_repository.get_by_id(file_record.project_id)
        if not project or project.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get additional metadata from file service
        extended_metadata = await file_service.get_file_metadata(file_id)
        
        response = FileResponse(
            id=file_record.id,
            project_id=file_record.project_id,
            filename=file_record.filename,
            original_filename=file_record.original_filename,
            content_type=file_record.content_type,
            size=file_record.size,
            upload_status=file_record.upload_status,
            processing_status=file_record.processing_status,
            created_at=file_record.created_at,
            updated_at=file_record.updated_at,
            metadata=file_record.metadata,
            error_message=file_record.error_message
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting file metadata for {file_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve file metadata")


@router.get("/files/{file_id}/content")
async def get_file_content(
    file_id: str,
    format: str = Query("raw", regex="^(raw|text)$"),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve file content
    
    - **file_id**: File ID
    - **format**: Content format ('raw' for original file, 'text' for extracted text)
    """
    try:
        # Get file record
        file_record = await file_repository.get_by_id(file_id)
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Verify user has access to the project
        project = await project_repository.get_by_id(file_record.project_id)
        if not project or project.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        if format == "text":
            # Return extracted text content
            if not file_record.text_content:
                raise HTTPException(status_code=404, detail="Text content not available")
            
            def generate_text():
                yield file_record.text_content.encode('utf-8')
            
            return StreamingResponse(
                generate_text(),
                media_type="text/plain",
                headers={"Content-Disposition": f"attachment; filename={file_record.filename}.txt"}
            )
        
        else:
            # Return raw file content from GridFS
            file_content = await file_service.get_file_content(file_id)
            if not file_content:
                raise HTTPException(status_code=404, detail="File content not found")
            
            def generate_content():
                yield file_content
            
            return StreamingResponse(
                generate_content(),
                media_type=file_record.content_type,
                headers={"Content-Disposition": f"attachment; filename={file_record.original_filename}"}
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving file content for {file_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve file content")


@router.delete("/files/{file_id}")
async def delete_file(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete a file and all associated data
    
    - **file_id**: File ID to delete
    """
    try:
        # Get file record
        file_record = await file_repository.get_by_id(file_id)
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Verify user has access to the project
        project = await project_repository.get_by_id(file_record.project_id)
        if not project or project.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # CASCADE DELETE: Remove all data associated with this file
        
        # Initialize repositories
        from app.repositories.text_chunk_repository import TextChunkRepository
        from app.repositories.entity_repository import EntityRepository
        from app.repositories.relationship_repository import RelationshipRepository
        
        chunk_repository = TextChunkRepository()
        entity_repository = EntityRepository()
        relationship_repository = RelationshipRepository()
        
        # Step 1: Get chunks before deleting (for ChromaDB cleanup)
        chunks_to_delete = await chunk_repository.get_by_file(file_id, limit=10000)
        chunk_ids = [chunk.id for chunk in chunks_to_delete]
        
        # Step 2: Get entities that were first mentioned in this file (we'll delete if only in this file)
        entities_in_file = await entity_repository.get_by_file(file_id)
        entities_to_check = [entity.id for entity in entities_in_file]
        
        # Step 3: Delete text chunks from MongoDB
        deleted_chunks = await chunk_repository.delete_by_file(file_id)
        logger.info(f"Deleted {deleted_chunks} text chunks")
        
        # Step 4: Clean up ChromaDB embeddings
        deleted_embeddings = 0
        try:
            from app.services.chroma_service import ChromaService
            chroma_service = ChromaService()
            if chunk_ids:
                # Delete embeddings from ChromaDB collection
                collection = chroma_service.get_or_create_collection(file_record.project_id)
                try:
                    collection.delete(ids=chunk_ids)
                    deleted_embeddings = len(chunk_ids)
                    logger.info(f"Deleted {deleted_embeddings} embeddings from ChromaDB")
                except Exception as e:
                    logger.warning(f"ChromaDB delete failed: {e}")
        except Exception as e:
            logger.warning(f"Failed to initialize ChromaDB cleanup: {e}")
        
        # Step 5: Delete entities that ONLY appear in this file
        deleted_entities = 0
        for entity_id in entities_to_check:
            entity = await entity_repository.get_by_id(entity_id)
            if entity:
                # Check if entity appears in other files
                # If first_mentioned.file_id == last_mentioned.file_id == this file, delete it
                if (entity.first_mentioned and entity.first_mentioned.file_id == file_id and
                    entity.last_mentioned and entity.last_mentioned.file_id == file_id):
                    await entity_repository.delete_by_id(entity_id)
                    deleted_entities += 1
                    logger.debug(f"Deleted entity {entity.name} (only in deleted file)")
        
        logger.info(f"Deleted {deleted_entities} entities")
        
        # Step 6: Delete relationships involving deleted entities
        # Note: RelationshipRepository might need a method to delete by entity
        # For now, we'll delete relationships where both entities are deleted
        deleted_relationships = 0
        try:
            # This is a simplified approach - ideally we'd have a dedicated method
            all_relationships = await relationship_repository.get_by_project(file_record.project_id, limit=10000)
            for rel in all_relationships:
                # Check if source or target entity was deleted
                source_exists = await entity_repository.get_by_id(rel.source_entity_id)
                target_exists = await entity_repository.get_by_id(rel.target_entity_id)
                
                if not source_exists or not target_exists:
                    await relationship_repository.delete_by_id(rel.id)
                    deleted_relationships += 1
        except Exception as e:
            logger.warning(f"Error cleaning up relationships: {e}")
        
        logger.info(f"Deleted {deleted_relationships} relationships")
        
        # Step 7: Finally, delete the file record itself
        success = await file_service.delete_file(file_id)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete file record")
        
        logger.info(
            f"CASCADE DELETE complete for file {file_id}: "
            f"{deleted_chunks} chunks, {deleted_embeddings} embeddings, "
            f"{deleted_entities} entities, {deleted_relationships} relationships"
        )
        
        return {
            "message": "File and all associated data deleted successfully",
            "file_id": file_id,
            "deleted_chunks": deleted_chunks,
            "deleted_embeddings": deleted_embeddings,
            "deleted_entities": deleted_entities,
            "deleted_relationships": deleted_relationships
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting file {file_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete file")


@router.post("/files/{file_id}/reprocess")
async def reprocess_file(
    file_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    """
    Reprocess a file (re-extract text and recreate chunks)
    
    - **file_id**: File ID to reprocess
    """
    try:
        # Get file record
        file_record = await file_repository.get_by_id(file_id)
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Verify user has access to the project
        project = await project_repository.get_by_id(file_record.project_id)
        if not project or project.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Check if file is in a state that can be reprocessed
        if file_record.upload_status != UploadStatus.COMPLETED:
            raise HTTPException(status_code=400, detail="File must be successfully uploaded before reprocessing")
        
        # Update processing status
        await file_repository.update_processing_status(
            file_id, 
            ProcessingStatus.PENDING,
            None
        )
        
        # Schedule background reprocessing
        background_tasks.add_task(
            process_uploaded_file,
            file_id,
            file_record.project_id,
            reprocess=True
        )
        
        return {
            "message": "File reprocessing started",
            "file_id": file_id,
            "status": "pending"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting reprocessing for file {file_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to start file reprocessing")


@router.get("/projects/{project_id}/files/stats")
async def get_project_file_stats(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get file statistics for a project
    
    - **project_id**: Project ID
    """
    try:
        # Verify project exists and user has access
        project = await project_repository.get_by_id(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get file statistics
        file_stats = await file_repository.get_project_file_stats(project_id)
        
        # Get text processing statistics
        processing_stats = await text_extraction_service.get_processing_statistics(project_id)
        
        return {
            "project_id": project_id,
            "file_statistics": file_stats,
            "processing_statistics": processing_stats,
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting file stats for project {project_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve file statistics")


async def process_uploaded_file(file_id: str, project_id: str, reprocess: bool = False):
    """
    Background task to process uploaded file with full indexing pipeline
    
    Args:
        file_id: File ID to process
        project_id: Project ID
        reprocess: Whether this is a reprocessing operation
    """
    try:
        logger.info(f"Starting {'reprocessing' if reprocess else 'processing'} for file {file_id}")
        
        # Import services here to avoid circular imports
        from app.services.entity_extraction_service import EntityExtractionService
        from app.services.embedding_service import EmbeddingService
        from app.services.relationship_discovery_service import RelationshipDiscoveryService
        from app.repositories.entity_repository import EntityRepository
        from app.repositories.relationship_repository import RelationshipRepository
        from app.repositories.text_chunk_repository import TextChunkRepository
        
        # Update processing status
        await file_repository.update_processing_status(
            file_id, 
            ProcessingStatus.PROCESSING,
            None
        )
        
        # Get file record
        file_record = await file_repository.get_by_id(file_id)
        if not file_record:
            logger.error(f"File {file_id} not found for processing")
            return
        
        # Get text content (should already be extracted during upload)
        content = file_record.text_content
        if not content:
            # Get file content from GridFS and extract
            file_content = await file_service.get_file_content(file_id)
            if not file_content:
                await file_repository.update_processing_status(
                    file_id, 
                    ProcessingStatus.FAILED,
                    "Could not retrieve file content"
                )
                return
            
            # Process file incrementally
            results = await text_extraction_service.process_file_incrementally(
                file_record, 
                file_content
            )
            content = results["extracted_text"]
            
            # Update file record with extracted text
            await file_repository.update_text_content(
                file_id,
                content,
                results["metadata"].dict()
            )
        
        logger.info(f"Processing file {file_id} with {len(content)} characters")
        
        # Initialize repositories and services for indexing
        entity_repo = EntityRepository()
        relationship_repo = RelationshipRepository()
        text_chunk_repo = TextChunkRepository()
        
        entity_service = EntityExtractionService(entity_repo)
        embedding_service = EmbeddingService(text_chunk_repo)
        relationship_service = RelationshipDiscoveryService(
            entity_repo, relationship_repo, text_chunk_repo
        )
        
        # Step 1: Chunk the text
        logger.info(f"Chunking text for file {file_id}")
        text_chunks = await text_extraction_service.chunk_text(file_id, project_id, content)
        logger.info(f"Created {len(text_chunks)} text chunks")
        
        # Step 2: Extract entities
        logger.info(f"Extracting entities from file {file_id}")
        entities = await entity_service.extract_entities_from_text(content, file_id, project_id)
        logger.info(f"Extracted {len(entities)} entities")
        
        # Save entities to database (update if exists, create if new)
        saved_entities = []
        for entity in entities:
            # Check if entity already exists
            existing = await entity_repo.get_by_name(project_id, entity.name, entity.type)
            if existing:
                # Update existing entity (merge mentions, update confidence)
                existing.mention_count += entity.mention_count
                existing.confidence_score = (existing.confidence_score + entity.confidence_score) / 2
                existing.last_mentioned = entity.last_mentioned
                updated = await entity_repo.update_by_id(existing.id, existing)
                saved_entities.append(updated)
                logger.debug(f"Updated existing entity: {entity.name}")
            else:
                # Create new entity
                saved_entity = await entity_repo.create(entity)
                saved_entities.append(saved_entity)
                logger.debug(f"Created new entity: {entity.name}")
        logger.info(f"Saved {len(saved_entities)} entities to database")
        
        # Step 3: Generate embeddings and store chunks
        logger.info(f"Generating embeddings for file {file_id}")
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
        
        created_chunks = await embedding_service.store_text_chunks_with_embeddings(
            file_id, project_id, chunk_data
        )
        logger.info(f"Generated embeddings for {len(created_chunks)} chunks")
        
        # Step 4: Discover relationships between entities
        logger.info(f"Discovering relationships for file {file_id}")
        relationships = await relationship_service.discover_relationships_for_project(
            project_id
        )
        logger.info(f"Discovered {len(relationships)} relationships")
        
        # Update processing status to completed
        await file_repository.update_processing_status(
            file_id, 
            ProcessingStatus.COMPLETED,
            None
        )
        
        logger.info(
            f"Successfully {'reprocessed' if reprocess else 'processed'} file {file_id}: "
            f"{len(text_chunks)} chunks, {len(saved_entities)} entities, {len(relationships)} relationships"
        )
        
    except Exception as e:
        logger.error(f"Error processing file {file_id}: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        await file_repository.update_processing_status(
            file_id, 
            ProcessingStatus.FAILED,
            str(e)
        )


@router.get("/files/{file_id}/processing-status")
async def get_file_processing_status(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get real-time processing status for a file
    
    - **file_id**: File ID
    """
    try:
        # Get file record
        file_record = await file_repository.get_by_id(file_id)
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Verify user has access to the project
        project = await project_repository.get_by_id(file_record.project_id)
        if not project or project.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get processing statistics if completed
        processing_stats = None
        if file_record.processing_status == ProcessingStatus.COMPLETED:
            processing_stats = await text_extraction_service.get_processing_statistics(
                file_record.project_id
            )
        
        return {
            "file_id": file_id,
            "upload_status": file_record.upload_status,
            "processing_status": file_record.processing_status,
            "error_message": file_record.error_message,
            "metadata": file_record.metadata.dict() if file_record.metadata else {},
            "processing_statistics": processing_stats,
            "last_updated": file_record.updated_at.isoformat() if file_record.updated_at else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting processing status for file {file_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve processing status")