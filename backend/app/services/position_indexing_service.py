"""
Position Indexing Service

Creates line-by-line indexes for text files with hierarchical structure tracking.
"""

import re
from typing import List, Tuple, Optional, Dict
from datetime import datetime
from app.models.position_index import PositionIndex, PositionIndexCreate
from app.models.scene import Scene
from app.services.scene_detection_service import SceneDetectionService, SceneBoundary


class PositionIndexingService:
    """Service for creating position indexes for text files"""
    
    def __init__(self):
        """Initialize the position indexing service"""
        self.scene_detection = SceneDetectionService()
    
    def create_position_index(
        self,
        text: str,
        file_id: str,
        project_id: str,
        scenes: Optional[List[Scene]] = None
    ) -> List[PositionIndex]:
        """
        Create a complete position index for a text file
        
        Args:
            text: The text content to index
            file_id: The file ID
            project_id: The project ID
            scenes: Optional list of scenes (if already detected)
            
        Returns:
            List of PositionIndex objects, one per line
        """
        indexes = []
        
        # Split text into lines
        lines = text.split('\n')
        
        # Track position and structure
        char_position = 0
        paragraph_number = 1
        current_paragraph_lines = []
        
        # Build scene lookup for fast access
        scene_map = {}
        if scenes:
            for scene in scenes:
                scene_map[scene.scene_number] = scene
        
        for line_num, line_content in enumerate(lines, start=1):
            line_length = len(line_content)
            word_count = len(line_content.split())
            is_empty = len(line_content.strip()) == 0
            is_dialogue = self._is_dialogue_line(line_content)
            
            # Determine which scene this line belongs to
            scene_id = None
            chapter_number = None
            
            if scenes:
                scene = self._find_scene_for_position(char_position, scenes)
                if scene:
                    scene_id = scene.id
                    chapter_number = scene.chapter_number
            
            # Track paragraph numbers
            if is_empty:
                if current_paragraph_lines:
                    # Previous paragraph ended
                    paragraph_number += 1
                    current_paragraph_lines = []
            else:
                current_paragraph_lines.append(line_num)
            
            # Create position index entry
            index = PositionIndex(
                file_id=file_id,
                project_id=project_id,
                line_number=line_num,
                start_char_pos=char_position,
                end_char_pos=char_position + line_length,
                paragraph_number=paragraph_number,
                scene_id=scene_id,
                chapter_number=chapter_number,
                line_content=line_content,
                line_length=line_length,
                word_count=word_count,
                is_empty=is_empty,
                is_dialogue=is_dialogue,
                created_at=datetime.utcnow()
            )
            
            indexes.append(index)
            
            # Update position (add 1 for newline character)
            char_position += line_length + 1
        
        return indexes
    
    def _is_dialogue_line(self, line: str) -> bool:
        """Check if a line contains dialogue"""
        # Simple heuristic: contains quotes (including curly quotes)
        return '"' in line or "'" in line or '"' in line or '"' in line or "'" in line or "'" in line
    
    def _find_scene_for_position(self, char_pos: int, scenes: List[Scene]) -> Optional[Scene]:
        """Find which scene a character position belongs to"""
        for scene in scenes:
            if scene.start_char_pos <= char_pos < scene.end_char_pos:
                return scene
        return None
    
    def get_line_context(
        self,
        indexes: List[PositionIndex],
        line_number: int,
        context_lines: int = 3
    ) -> Dict[str, any]:
        """
        Get a line with surrounding context
        
        Args:
            indexes: List of position indexes
            line_number: The line to get context for
            context_lines: Number of lines before/after to include
            
        Returns:
            Dictionary with line info and context
        """
        # Find the target line
        target_idx = next((i for i, idx in enumerate(indexes) if idx.line_number == line_number), None)
        
        if target_idx is None:
            return None
        
        target_line = indexes[target_idx]
        
        # Get context lines
        start_idx = max(0, target_idx - context_lines)
        end_idx = min(len(indexes), target_idx + context_lines + 1)
        
        context_before = [idx.line_content for idx in indexes[start_idx:target_idx]]
        context_after = [idx.line_content for idx in indexes[target_idx + 1:end_idx]]
        
        return {
            'line_number': target_line.line_number,
            'line_content': target_line.line_content,
            'start_char_pos': target_line.start_char_pos,
            'end_char_pos': target_line.end_char_pos,
            'paragraph_number': target_line.paragraph_number,
            'scene_id': target_line.scene_id,
            'chapter_number': target_line.chapter_number,
            'is_dialogue': target_line.is_dialogue,
            'context_before': context_before,
            'context_after': context_after
        }
    
    def get_paragraph_lines(
        self,
        indexes: List[PositionIndex],
        paragraph_number: int
    ) -> List[PositionIndex]:
        """Get all lines belonging to a specific paragraph"""
        return [idx for idx in indexes if idx.paragraph_number == paragraph_number]
    
    def get_scene_lines(
        self,
        indexes: List[PositionIndex],
        scene_id: str
    ) -> List[PositionIndex]:
        """Get all lines belonging to a specific scene"""
        return [idx for idx in indexes if idx.scene_id == scene_id]
    
    def get_chapter_lines(
        self,
        indexes: List[PositionIndex],
        chapter_number: int
    ) -> List[PositionIndex]:
        """Get all lines belonging to a specific chapter"""
        return [idx for idx in indexes if idx.chapter_number == chapter_number]
    
    def find_lines_by_content(
        self,
        indexes: List[PositionIndex],
        search_term: str,
        case_sensitive: bool = False
    ) -> List[PositionIndex]:
        """Find all lines containing a search term"""
        if not case_sensitive:
            search_term = search_term.lower()
            return [idx for idx in indexes if search_term in idx.line_content.lower()]
        else:
            return [idx for idx in indexes if search_term in idx.line_content]
    
    def get_position_stats(self, indexes: List[PositionIndex]) -> Dict[str, any]:
        """Calculate statistics from position indexes"""
        if not indexes:
            return {}
        
        total_lines = len(indexes)
        non_empty_lines = sum(1 for idx in indexes if not idx.is_empty)
        dialogue_lines = sum(1 for idx in indexes if idx.is_dialogue)
        total_words = sum(idx.word_count for idx in indexes)
        
        # Count unique paragraphs
        unique_paragraphs = len(set(idx.paragraph_number for idx in indexes))
        
        # Count unique scenes
        unique_scenes = len(set(idx.scene_id for idx in indexes if idx.scene_id))
        
        # Count unique chapters
        unique_chapters = len(set(idx.chapter_number for idx in indexes if idx.chapter_number))
        
        return {
            'total_lines': total_lines,
            'non_empty_lines': non_empty_lines,
            'empty_lines': total_lines - non_empty_lines,
            'dialogue_lines': dialogue_lines,
            'dialogue_percentage': dialogue_lines / non_empty_lines if non_empty_lines > 0 else 0,
            'total_words': total_words,
            'average_words_per_line': total_words / non_empty_lines if non_empty_lines > 0 else 0,
            'total_paragraphs': unique_paragraphs,
            'total_scenes': unique_scenes,
            'total_chapters': unique_chapters
        }

