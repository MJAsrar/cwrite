"""
Scene Detection Service

Detects scene and chapter boundaries in narrative text using pattern matching
and heuristic analysis.
"""

import re
from typing import List, Tuple, Optional, Dict
from app.models.scene import SceneBreakType


class SceneBoundary:
    """Represents a detected scene boundary"""
    def __init__(
        self,
        position: int,
        break_type: SceneBreakType,
        chapter_number: Optional[int] = None,
        time_marker: Optional[str] = None,
        line_number: int = 0
    ):
        self.position = position
        self.break_type = break_type
        self.chapter_number = chapter_number
        self.time_marker = time_marker
        self.line_number = line_number


class SceneDetectionService:
    """Service for detecting scenes and chapters in narrative text"""
    
    # Explicit scene break patterns
    SCENE_BREAK_PATTERNS = [
        r'^\s*\*\s*\*\s*\*\s*$',          # ***
        r'^\s*\*{3,}\s*$',                 # Multiple stars
        r'^\s*-{3,}\s*$',                  # ---
        r'^\s*#{3,}\s*$',                  # ###
        r'^\s*~{3,}\s*$',                  # ~~~
        r'^\s*={3,}\s*$',                  # ===
        r'^\s*\*\s+\*\s+\*\s*$',          # * * *
    ]
    
    # Chapter detection patterns
    CHAPTER_PATTERNS = [
        (r'^Chapter\s+(\d+)', 'numeric'),
        (r'^CHAPTER\s+(\d+)', 'numeric'),
        (r'^Chapter\s+([A-Z][a-z]+)', 'word'),  # Chapter One, Chapter Two
        (r'^CHAPTER\s+([A-Z]+)', 'word'),
        (r'^(\d+)\.\s+[A-Z]', 'numbered_title'),  # 1. The Beginning
        (r'^Part\s+(\d+)', 'part'),
        (r'^PART\s+(\d+)', 'part'),
    ]
    
    # Time change indicators
    TIME_MARKERS = [
        'the next day', 'next day', 'the following day', 'following day',
        'later that day', 'later that evening', 'later that night',
        'the next morning', 'next morning', 'that morning',
        'that evening', 'that night', 'that afternoon',
        'hours later', 'days later', 'weeks later', 'months later', 'years later',
        'meanwhile', 'in the meantime',
        'earlier', 'later', 'afterward', 'afterwards',
        'a few hours', 'a few days', 'a few weeks', 'a few months',
        'the next week', 'next week', 'last week',
    ]
    
    # Location change indicators
    LOCATION_MARKERS = [
        'at the', 'in the', 'inside the', 'outside the',
        'back at', 'back in', 'back to',
        'meanwhile at', 'meanwhile in',
    ]
    
    def __init__(self):
        """Initialize the scene detection service"""
        # Compile regex patterns for efficiency
        self.scene_break_regexes = [re.compile(pattern, re.MULTILINE) for pattern in self.SCENE_BREAK_PATTERNS]
        self.chapter_regexes = [(re.compile(pattern, re.MULTILINE), typ) for pattern, typ in self.CHAPTER_PATTERNS]
    
    def detect_scenes(self, text: str, filename: str = "") -> List[SceneBoundary]:
        """
        Detect all scene boundaries in the text
        
        Args:
            text: The narrative text to analyze
            filename: Optional filename for additional context
            
        Returns:
            List of SceneBoundary objects representing detected scene breaks
        """
        boundaries = []
        
        # Always start with a scene at position 0
        boundaries.append(SceneBoundary(
            position=0,
            break_type=SceneBreakType.IMPLICIT,
            line_number=1
        ))
        
        # Detect explicit breaks
        explicit_boundaries = self._detect_explicit_breaks(text)
        boundaries.extend(explicit_boundaries)
        
        # Detect chapter breaks
        chapter_boundaries = self._detect_chapters(text)
        boundaries.extend(chapter_boundaries)
        
        # Detect implicit breaks (heuristic-based)
        implicit_boundaries = self._detect_implicit_breaks(text, explicit_boundaries + chapter_boundaries)
        boundaries.extend(implicit_boundaries)
        
        # Sort by position
        boundaries.sort(key=lambda b: b.position)
        
        # Remove duplicates (boundaries at same position)
        boundaries = self._deduplicate_boundaries(boundaries)
        
        return boundaries
    
    def _detect_explicit_breaks(self, text: str) -> List[SceneBoundary]:
        """Detect explicit scene breaks like ***, ---, ###"""
        boundaries = []
        
        for regex in self.scene_break_regexes:
            for match in regex.finditer(text):
                line_number = text[:match.start()].count('\n') + 1
                boundaries.append(SceneBoundary(
                    position=match.start(),
                    break_type=SceneBreakType.EXPLICIT,
                    line_number=line_number
                ))
        
        return boundaries
    
    def _detect_chapters(self, text: str) -> List[SceneBoundary]:
        """Detect chapter boundaries"""
        boundaries = []
        
        for regex, pattern_type in self.chapter_regexes:
            for match in regex.finditer(text):
                line_number = text[:match.start()].count('\n') + 1
                
                # Extract chapter number
                chapter_num = None
                if pattern_type in ('numeric', 'part', 'numbered_title'):
                    try:
                        chapter_num = int(match.group(1))
                    except (ValueError, IndexError):
                        pass
                elif pattern_type == 'word':
                    # Convert word to number (One -> 1, Two -> 2, etc.)
                    chapter_num = self._word_to_number(match.group(1))
                
                boundaries.append(SceneBoundary(
                    position=match.start(),
                    break_type=SceneBreakType.CHAPTER,
                    chapter_number=chapter_num,
                    line_number=line_number
                ))
        
        return boundaries
    
    def _detect_implicit_breaks(self, text: str, explicit_boundaries: List[SceneBoundary]) -> List[SceneBoundary]:
        """Detect implicit scene breaks using heuristics"""
        boundaries = []
        
        # Get positions of explicit breaks to avoid double-detection
        explicit_positions = {b.position for b in explicit_boundaries}
        
        # Split into paragraphs
        paragraphs = re.split(r'\n\s*\n', text)
        
        current_pos = 0
        prev_paragraph = ""
        
        for i, paragraph in enumerate(paragraphs):
            paragraph = paragraph.strip()
            
            if not paragraph:
                current_pos += len(paragraphs[i]) + 2  # +2 for \n\n
                continue
            
            # Skip if this position already has an explicit break
            if current_pos in explicit_positions:
                prev_paragraph = paragraph
                current_pos += len(paragraphs[i]) + 2
                continue
            
            # Check for scene break indicators
            score = 0
            time_marker = None
            
            # Check for empty lines before this paragraph
            empty_lines = text[current_pos - 10:current_pos].count('\n')
            if empty_lines >= 3:
                score += 3
            elif empty_lines >= 2:
                score += 2
            
            # Check for time markers
            paragraph_lower = paragraph.lower()
            for marker in self.TIME_MARKERS:
                if marker in paragraph_lower[:100]:  # Check first 100 chars
                    score += 2
                    time_marker = marker
                    break
            
            # Check for location markers
            for marker in self.LOCATION_MARKERS:
                if paragraph_lower.startswith(marker):
                    score += 1
                    break
            
            # Check for POV change (new character name at start)
            if self._starts_with_character_name(paragraph):
                score += 1
            
            # Check for significant time/place transition from previous paragraph
            if prev_paragraph and self._is_transition(prev_paragraph, paragraph):
                score += 2
            
            # If score is high enough, mark as implicit scene break
            if score >= 4:
                line_number = text[:current_pos].count('\n') + 1
                boundaries.append(SceneBoundary(
                    position=current_pos,
                    break_type=SceneBreakType.IMPLICIT,
                    time_marker=time_marker,
                    line_number=line_number
                ))
            
            prev_paragraph = paragraph
            current_pos += len(paragraphs[i]) + 2
        
        return boundaries
    
    def _starts_with_character_name(self, paragraph: str) -> bool:
        """Check if paragraph starts with a proper name (potential POV character)"""
        # Simple heuristic: starts with a capitalized word that's not a common sentence starter
        words = paragraph.split()
        if not words:
            return False
        
        first_word = words[0].strip('.,!?;:')
        
        # Exclude common sentence starters
        common_starters = {
            'the', 'a', 'an', 'it', 'he', 'she', 'they', 'there', 'this', 'that',
            'in', 'on', 'at', 'by', 'for', 'with', 'when', 'where', 'why', 'how',
            'but', 'and', 'or', 'so', 'yet', 'as', 'if', 'though', 'although'
        }
        
        return (first_word[0].isupper() and 
                first_word.lower() not in common_starters and 
                len(first_word) > 2)
    
    def _is_transition(self, prev_para: str, curr_para: str) -> bool:
        """Check if there's a significant transition between paragraphs"""
        # Check if current paragraph starts with a transition phrase
        curr_lower = curr_para.lower()
        
        transition_phrases = [
            'later', 'meanwhile', 'elsewhere', 'back at',
            'hours passed', 'days passed', 'weeks passed',
            'the next', 'that night', 'that morning', 'that evening'
        ]
        
        for phrase in transition_phrases:
            if curr_lower.startswith(phrase):
                return True
        
        return False
    
    def _deduplicate_boundaries(self, boundaries: List[SceneBoundary]) -> List[SceneBoundary]:
        """Remove duplicate boundaries at the same position, preferring chapter > explicit > implicit"""
        if not boundaries:
            return []
        
        # Group by position
        position_groups: Dict[int, List[SceneBoundary]] = {}
        for boundary in boundaries:
            if boundary.position not in position_groups:
                position_groups[boundary.position] = []
            position_groups[boundary.position].append(boundary)
        
        # Keep the highest priority boundary at each position
        priority = {
            SceneBreakType.CHAPTER: 3,
            SceneBreakType.EXPLICIT: 2,
            SceneBreakType.IMPLICIT: 1
        }
        
        result = []
        for position in sorted(position_groups.keys()):
            group = position_groups[position]
            best = max(group, key=lambda b: priority[b.break_type])
            result.append(best)
        
        return result
    
    def _word_to_number(self, word: str) -> Optional[int]:
        """Convert word numbers to integers (e.g., 'One' -> 1)"""
        word_map = {
            'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
            'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
            'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
            'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20
        }
        
        return word_map.get(word.lower())
    
    def get_scene_text(self, text: str, boundaries: List[SceneBoundary], scene_index: int) -> str:
        """
        Extract the text for a specific scene
        
        Args:
            text: The full narrative text
            boundaries: List of scene boundaries
            scene_index: Index of the scene to extract (0-based)
            
        Returns:
            The text content of the specified scene
        """
        if scene_index >= len(boundaries):
            return ""
        
        start = boundaries[scene_index].position
        
        if scene_index + 1 < len(boundaries):
            end = boundaries[scene_index + 1].position
        else:
            end = len(text)
        
        return text[start:end].strip()


