import re
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import asyncio
from io import BytesIO
import docx
from docx.document import Document
from docx.oxml.table import CT_Tbl
from docx.oxml.text.paragraph import CT_P
from docx.table import _Cell, Table
from docx.text.paragraph import Paragraph

from app.models.file import ProjectFile, FileMetadata
from app.models.text_chunk import TextChunk
from app.repositories.text_chunk_repository import TextChunkRepository

logger = logging.getLogger(__name__)


class TextExtractionError(Exception):
    """Custom exception for text extraction errors"""
    pass


class TextExtractionService:
    """Service for extracting and processing text from various file formats"""
    
    def __init__(self):
        self.chunk_repository = TextChunkRepository()
        
        # Text processing configuration (optimized for semantic search)
        self.max_chunk_size = 300  # Target words per chunk (~1-2 paragraphs)
        self.chunk_overlap = 50     # Overlap between chunks (10-20% of chunk size)
        self.min_chunk_size = 100   # Minimum words per chunk (avoid tiny fragments)
        
        # Text cleaning patterns
        self.cleanup_patterns = [
            (r'\r\n', '\n'),                    # Normalize line endings
            (r'\r', '\n'),                      # Normalize line endings
            (r'\n{3,}', '\n\n'),               # Reduce multiple newlines
            (r'[ \t]{2,}', ' '),               # Reduce multiple spaces/tabs
            (r'^\s+', '', re.MULTILINE),       # Remove leading whitespace
            (r'\s+$', '', re.MULTILINE),       # Remove trailing whitespace
            (r'[^\x00-\x7F]+', ''),            # Remove non-ASCII characters (optional)
        ]
        
        # Sentence boundary patterns
        self.sentence_endings = re.compile(r'[.!?]+\s+')
        self.paragraph_breaks = re.compile(r'\n\s*\n')
    
    async def extract_text_from_file(self, file_record: ProjectFile, file_content: bytes) -> Tuple[str, FileMetadata]:
        """
        Extract text content from file based on its type
        
        Args:
            file_record: ProjectFile record
            file_content: Raw file content as bytes
            
        Returns:
            Tuple of (extracted_text, updated_metadata)
            
        Raises:
            TextExtractionError: If extraction fails
        """
        try:
            if file_record.is_text_file():
                text, metadata = await self._extract_from_text_file(file_content)
            elif file_record.is_word_document():
                text, metadata = await self._extract_from_docx_file(file_content)
            else:
                raise TextExtractionError(f"Unsupported file type: {file_record.content_type}")
            
            # Clean and preprocess text
            cleaned_text = self._clean_text(text)
            
            # Update metadata with text statistics
            metadata = self._calculate_text_statistics(cleaned_text, metadata)
            
            logger.info(f"Successfully extracted {len(cleaned_text)} characters from {file_record.filename}")
            return cleaned_text, metadata
            
        except TextExtractionError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error extracting text from {file_record.filename}: {e}")
            raise TextExtractionError(f"Text extraction failed: {str(e)}")
    
    async def chunk_text(
        self, 
        file_id: str, 
        project_id: str, 
        text: str,
        start_position: int = 0,
        start_chunk_index: int = 0
    ) -> List[TextChunk]:
        """
        Split text into semantic chunks using sentence-aware boundaries
        
        Strategy:
        - Chunk at natural boundaries (sentences/paragraphs)
        - 10-20% overlap for context preservation
        - Prioritize semantic coherence over exact length
        
        Args:
            file_id: File ID
            project_id: Project ID
            text: Text content to chunk
            start_position: Starting position in the full document (for incremental updates)
            start_chunk_index: Starting chunk index (for incremental updates)
            
        Returns:
            List of TextChunk objects
        """
        try:
            # Split into sentences using multiple delimiters
            sentences = self._split_into_sentences(text)
            
            chunks = []
            current_chunk_sentences = []
            current_word_count = 0
            chunk_index = start_chunk_index
            
            for i, sentence in enumerate(sentences):
                sentence_words = len(sentence.split())
                
                # Check if adding this sentence exceeds target size
                if current_word_count + sentence_words > self.max_chunk_size and current_chunk_sentences:
                    # Finalize current chunk
                    chunk_text = ' '.join(current_chunk_sentences)
                    relative_start_pos = text.find(current_chunk_sentences[0])
                    absolute_start_pos = start_position + max(0, relative_start_pos)
                    
                    chunk = await self._create_text_chunk(
                        file_id=file_id,
                        project_id=project_id,
                        content=chunk_text,
                        chunk_index=chunk_index,
                        start_position=absolute_start_pos,
                        word_count=current_word_count
                    )
                    chunks.append(chunk)
                    
                    # Create overlap: Keep last 10-20% of sentences for context
                    overlap_sentence_count = max(1, len(current_chunk_sentences) // 5)  # ~20%
                    overlap_sentences = current_chunk_sentences[-overlap_sentence_count:]
                    
                    # Start new chunk with overlap
                    current_chunk_sentences = overlap_sentences + [sentence]
                    current_word_count = sum(len(s.split()) for s in current_chunk_sentences)
                    chunk_index += 1
                else:
                    # Add sentence to current chunk
                    current_chunk_sentences.append(sentence)
                    current_word_count += sentence_words
            
            # Add final chunk if it has content
            if current_chunk_sentences and current_word_count >= self.min_chunk_size:
                chunk_text = ' '.join(current_chunk_sentences)
                relative_start_pos = text.find(current_chunk_sentences[0])
                absolute_start_pos = start_position + max(0, relative_start_pos)
                
                chunk = await self._create_text_chunk(
                    file_id=file_id,
                    project_id=project_id,
                    content=chunk_text,
                    chunk_index=chunk_index,
                    start_position=absolute_start_pos,
                    word_count=current_word_count
                )
                chunks.append(chunk)
            
            logger.info(f"Created {len(chunks)} text chunks for file {file_id}")
            return chunks
            
        except Exception as e:
            logger.error(f"Error chunking text for file {file_id}: {e}")
            raise TextExtractionError(f"Text chunking failed: {str(e)}")
    
    async def process_file_incrementally(self, file_record: ProjectFile, file_content: bytes) -> Dict[str, Any]:
        """
        Process file incrementally with progress tracking
        
        Args:
            file_record: ProjectFile record
            file_content: Raw file content
            
        Returns:
            Dict containing processing results and statistics
        """
        try:
            processing_start = datetime.utcnow()
            
            # Step 1: Extract text
            logger.info(f"Starting text extraction for {file_record.filename}")
            extracted_text, metadata = await self.extract_text_from_file(file_record, file_content)
            
            # Step 2: Create text chunks
            logger.info(f"Creating text chunks for {file_record.filename}")
            chunks = await self.chunk_text(file_record.id, file_record.project_id, extracted_text)
            
            # Step 3: Store chunks in database
            logger.info(f"Storing {len(chunks)} chunks for {file_record.filename}")
            stored_chunks = []
            for chunk in chunks:
                stored_chunk = await self.chunk_repository.create(chunk)
                if stored_chunk:
                    stored_chunks.append(stored_chunk)
            
            processing_end = datetime.utcnow()
            processing_time = (processing_end - processing_start).total_seconds()
            
            results = {
                "extracted_text": extracted_text,
                "metadata": metadata,
                "chunks_created": len(stored_chunks),
                "total_words": metadata.word_count,
                "total_characters": metadata.character_count,
                "processing_time_seconds": processing_time,
                "chunks_per_second": len(stored_chunks) / processing_time if processing_time > 0 else 0
            }
            
            logger.info(f"Successfully processed {file_record.filename} in {processing_time:.2f} seconds")
            return results
            
        except Exception as e:
            logger.error(f"Error in incremental processing for {file_record.filename}: {e}")
            raise TextExtractionError(f"Incremental processing failed: {str(e)}")
    
    async def _extract_from_text_file(self, content: bytes) -> Tuple[str, FileMetadata]:
        """Extract text from plain text or markdown files"""
        try:
            # Try different encodings
            encodings = ['utf-8', 'utf-16', 'latin-1', 'cp1252']
            text = None
            used_encoding = 'utf-8'
            
            for encoding in encodings:
                try:
                    text = content.decode(encoding)
                    used_encoding = encoding
                    break
                except UnicodeDecodeError:
                    continue
            
            if text is None:
                # Fallback: decode with errors='replace'
                text = content.decode('utf-8', errors='replace')
                used_encoding = 'utf-8'
            
            metadata = FileMetadata(encoding=used_encoding)
            return text, metadata
            
        except Exception as e:
            raise TextExtractionError(f"Failed to extract text from text file: {str(e)}")
    
    async def _extract_from_docx_file(self, content: bytes) -> Tuple[str, FileMetadata]:
        """Extract text from Word document (.docx)"""
        try:
            # Load document from bytes
            doc_stream = BytesIO(content)
            document = docx.Document(doc_stream)
            
            # Extract text from all elements
            text_parts = []
            
            # Process document body
            for element in document.element.body:
                if isinstance(element, CT_P):
                    # Paragraph
                    paragraph = Paragraph(element, document)
                    if paragraph.text.strip():
                        text_parts.append(paragraph.text)
                elif isinstance(element, CT_Tbl):
                    # Table
                    table = Table(element, document)
                    table_text = self._extract_table_text(table)
                    if table_text:
                        text_parts.append(table_text)
            
            # Join all text parts
            full_text = '\n\n'.join(text_parts)
            
            # Create metadata
            metadata = FileMetadata(
                encoding='utf-8',
                # Add Word-specific metadata if available
            )
            
            # Try to get document properties
            try:
                core_props = document.core_properties
                if hasattr(core_props, 'author') and core_props.author:
                    metadata.author = core_props.author
                if hasattr(core_props, 'title') and core_props.title:
                    metadata.title = core_props.title
            except Exception as e:
                logger.warning(f"Could not extract document properties: {e}")
            
            return full_text, metadata
            
        except Exception as e:
            raise TextExtractionError(f"Failed to extract text from Word document: {str(e)}")
    
    def _extract_table_text(self, table: Table) -> str:
        """Extract text from a Word table"""
        try:
            table_text = []
            for row in table.rows:
                row_text = []
                for cell in row.cells:
                    cell_text = cell.text.strip()
                    if cell_text:
                        row_text.append(cell_text)
                if row_text:
                    table_text.append(' | '.join(row_text))
            
            return '\n'.join(table_text)
            
        except Exception as e:
            logger.warning(f"Error extracting table text: {e}")
            return ""
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize text content"""
        try:
            cleaned = text
            
            # Apply cleanup patterns
            for pattern, replacement, *flags in self.cleanup_patterns:
                if flags:
                    cleaned = re.sub(pattern, replacement, cleaned, flags=flags[0])
                else:
                    cleaned = re.sub(pattern, replacement, cleaned)
            
            # Remove excessive whitespace
            cleaned = re.sub(r'\s+', ' ', cleaned)
            
            # Normalize quotes and dashes
            cleaned = cleaned.replace('"', '"').replace('"', '"')
            cleaned = cleaned.replace(''', "'").replace(''', "'")
            cleaned = cleaned.replace('—', '--').replace('–', '-')
            
            return cleaned.strip()
            
        except Exception as e:
            logger.warning(f"Error cleaning text: {e}")
            return text
    
    def _calculate_text_statistics(self, text: str, metadata: FileMetadata) -> FileMetadata:
        """Calculate text statistics and update metadata"""
        try:
            # Basic counts
            metadata.character_count = len(text)
            metadata.word_count = len(text.split())
            metadata.line_count = text.count('\n') + 1
            
            # Estimate chapters (look for chapter markers)
            chapter_patterns = [
                r'^\s*chapter\s+\d+',
                r'^\s*ch\.\s*\d+',
                r'^\s*\d+\.\s*[A-Z]',
                r'^\s*part\s+\d+',
            ]
            
            chapter_count = 0
            for pattern in chapter_patterns:
                matches = re.findall(pattern, text, re.IGNORECASE | re.MULTILINE)
                chapter_count = max(chapter_count, len(matches))
            
            metadata.chapter_count = max(1, chapter_count)  # At least 1 chapter
            
            # Detect language (simple heuristic)
            if re.search(r'\b(the|and|or|but|in|on|at|to|for|of|with|by)\b', text, re.IGNORECASE):
                metadata.language = 'en'
            else:
                metadata.language = 'unknown'
            
            return metadata
            
        except Exception as e:
            logger.warning(f"Error calculating text statistics: {e}")
            return metadata
    
    def _split_into_sentences(self, text: str) -> List[str]:
        """
        Split text into sentences at natural boundaries
        
        Uses multiple sentence delimiters and preserves context
        """
        try:
            # Split on common sentence endings
            # Pattern: . ! ? followed by space and capital letter, or end of string
            sentence_pattern = r'(?<=[.!?])\s+(?=[A-Z])|(?<=[.!?])$'
            
            # First split by paragraph to preserve structure
            paragraphs = self.paragraph_breaks.split(text)
            
            all_sentences = []
            for para in paragraphs:
                para = para.strip()
                if not para:
                    continue
                
                # Split paragraph into sentences
                sentences = re.split(sentence_pattern, para)
                sentences = [s.strip() for s in sentences if s.strip()]
                
                # If a sentence is still too long (no punctuation), split by length
                final_sentences = []
                for sent in sentences:
                    if len(sent.split()) > self.max_chunk_size:
                        # Split long sentences at commas or semicolons
                        sub_sentences = re.split(r'[,;]\s+', sent)
                        final_sentences.extend([s.strip() + ',' for s in sub_sentences[:-1]])
                        final_sentences.append(sub_sentences[-1].strip())
                    else:
                        final_sentences.append(sent)
                
                all_sentences.extend(final_sentences)
            
            return [s for s in all_sentences if s]
            
        except Exception as e:
            logger.warning(f"Error splitting into sentences: {e}, falling back to simple split")
            # Fallback: simple split by paragraph
            return [p.strip() for p in self.paragraph_breaks.split(text) if p.strip()]
    
    def _get_overlap_text(self, text: str, overlap_words: int) -> str:
        """Get the last N words from text for chunk overlap"""
        try:
            words = text.split()
            if len(words) <= overlap_words:
                return text
            
            overlap_text = ' '.join(words[-overlap_words:])
            return overlap_text
            
        except Exception as e:
            logger.warning(f"Error getting overlap text: {e}")
            return ""
    
    async def _create_text_chunk(self, file_id: str, project_id: str, content: str, 
                                chunk_index: int, start_position: int, word_count: int) -> TextChunk:
        """Create a TextChunk object"""
        try:
            end_position = start_position + len(content)
            
            chunk = TextChunk(
                file_id=file_id,
                project_id=project_id,
                content=content,
                start_position=start_position,
                end_position=end_position,
                chunk_index=chunk_index,
                word_count=word_count,
                created_at=datetime.utcnow()
            )
            
            return chunk
            
        except Exception as e:
            logger.error(f"Error creating text chunk: {e}")
            raise TextExtractionError(f"Failed to create text chunk: {str(e)}")
    
    async def reprocess_file(self, file_id: str) -> Dict[str, Any]:
        """
        Reprocess a file (delete existing chunks and recreate)
        
        Args:
            file_id: File ID to reprocess
            
        Returns:
            Dict containing reprocessing results
        """
        try:
            # Delete existing chunks
            deleted_count = await self.chunk_repository.delete_by_file(file_id)
            logger.info(f"Deleted {deleted_count} existing chunks for file {file_id}")
            
            # Note: This method would need the file content to be retrieved
            # and then call process_file_incrementally
            # For now, return a placeholder result
            
            return {
                "deleted_chunks": deleted_count,
                "status": "ready_for_reprocessing"
            }
            
        except Exception as e:
            logger.error(f"Error reprocessing file {file_id}: {e}")
            raise TextExtractionError(f"File reprocessing failed: {str(e)}")
    
    async def get_processing_statistics(self, project_id: str) -> Dict[str, Any]:
        """
        Get text processing statistics for a project
        
        Args:
            project_id: Project ID
            
        Returns:
            Dict containing processing statistics
        """
        try:
            stats = await self.chunk_repository.get_project_chunk_stats(project_id)
            return stats
            
        except Exception as e:
            logger.error(f"Error getting processing statistics for project {project_id}: {e}")
            return {
                "total_chunks": 0,
                "total_words": 0,
                "average_chunk_size": 0,
                "files_processed": 0
            }