"""
Timeline Extraction Service

Extracts temporal information from narrative text:
- Time markers ("three days later", "Monday morning")
- Chronological ordering
- Flashback detection
- Story duration
"""

import re
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
from collections import defaultdict


class TimelineEvent:
    """Represents a temporal event in the narrative"""
    def __init__(
        self,
        text: str,
        position: int,
        scene_number: int,
        time_type: str,
        time_value: Optional[str] = None,
        relative_order: Optional[int] = None,
        is_flashback: bool = False
    ):
        self.text = text
        self.position = position
        self.scene_number = scene_number
        self.time_type = time_type
        self.time_value = time_value
        self.relative_order = relative_order
        self.is_flashback = is_flashback


class TimelineExtractionService:
    """Service for extracting timeline information from narrative text"""
    
    # Time marker patterns
    TIME_MARKERS = {
        'specific_time': [
            r'\b(\d{1,2}:\d{2}\s*(?:am|pm|AM|PM))\b',
            r'\b(morning|afternoon|evening|night|midnight|noon|dawn|dusk)\b',
        ],
        'day_of_week': [
            r'\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b',
        ],
        'date': [
            r'\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\b',
            r'\b\d{1,2}/\d{1,2}/\d{2,4}\b',
        ],
        'relative_time': [
            r'\b(the next day|next day|the following day|following day)\b',
            r'\b(the next morning|next morning|that morning)\b',
            r'\b(later that day|later that evening|later that night)\b',
            r'\b(the next week|next week|the following week)\b',
            r'\b(earlier|later|afterward|afterwards|meanwhile|simultaneously)\b',
            r'\b(\d+)\s+(seconds?|minutes?|hours?|days?|weeks?|months?|years?)\s+(later|ago|earlier|before|after)\b',
            r'\b(a few|several|some)\s+(seconds?|minutes?|hours?|days?|weeks?|months?|years?)\s+(later|ago|earlier|before|after)\b',
        ],
        'season': [
            r'\b(spring|summer|fall|autumn|winter)\b',
        ],
        'year': [
            r'\b(19\d{2}|20\d{2})\b',  # Years 1900-2099
        ]
    }
    
    # Flashback indicators
    FLASHBACK_PATTERNS = [
        r'\b(flashback|flash back)\b',
        r'\b(remembered|recalled|memory|memories)\b',
        r'\b(years? ago|months? ago|weeks? ago|days? ago)\b',
        r'\b(in the past|back then|back when|those days)\b',
        r'\b(used to|had been|had done|had gone)\b',
        r'\b(earlier|before|previously)\b',
    ]
    
    # Future indicators
    FUTURE_PATTERNS = [
        r'\b(tomorrow|next day|the next day)\b',
        r'\b(will|would|going to)\b',
        r'\b(in the future|later on)\b',
        r'\b(years? later|months? later|weeks? later|days? later)\b',
    ]
    
    def __init__(self):
        """Initialize the timeline extraction service"""
        # Compile regex patterns
        self.compiled_patterns = {}
        for time_type, patterns in self.TIME_MARKERS.items():
            self.compiled_patterns[time_type] = [
                re.compile(pattern, re.IGNORECASE) for pattern in patterns
            ]
        
        self.flashback_regexes = [re.compile(p, re.IGNORECASE) for p in self.FLASHBACK_PATTERNS]
        self.future_regexes = [re.compile(p, re.IGNORECASE) for p in self.FUTURE_PATTERNS]
    
    def extract_time_markers(self, text: str, scene_number: int = 1) -> List[TimelineEvent]:
        """
        Extract time markers from text
        
        Args:
            text: The text to analyze
            scene_number: Scene number for tracking
            
        Returns:
            List of TimelineEvent objects
        """
        events = []
        
        # Check for each type of time marker
        for time_type, regexes in self.compiled_patterns.items():
            for regex in regexes:
                for match in regex.finditer(text):
                    event = TimelineEvent(
                        text=match.group(0),
                        position=match.start(),
                        scene_number=scene_number,
                        time_type=time_type,
                        time_value=match.group(0)
                    )
                    events.append(event)
        
        # Check for flashbacks
        for event in events:
            if self._is_flashback(text, event.position):
                event.is_flashback = True
        
        # Sort by position
        events.sort(key=lambda e: e.position)
        
        return events
    
    def _is_flashback(self, text: str, position: int, context_size: int = 200) -> bool:
        """
        Determine if a time marker indicates a flashback
        
        Args:
            text: Full text
            position: Position of time marker
            context_size: Characters to check before/after
            
        Returns:
            True if flashback detected
        """
        # Get context around the marker
        start = max(0, position - context_size)
        end = min(len(text), position + context_size)
        context = text[start:end].lower()
        
        # Check for flashback indicators
        flashback_score = 0
        for regex in self.flashback_regexes:
            if regex.search(context):
                flashback_score += 1
        
        # Check for future indicators (negative score)
        for regex in self.future_regexes:
            if regex.search(context):
                flashback_score -= 1
        
        return flashback_score > 0
    
    def reconstruct_timeline(
        self,
        events: List[TimelineEvent],
        scene_numbers: List[int]
    ) -> Dict:
        """
        Reconstruct chronological timeline from events
        
        Args:
            events: List of timeline events
            scene_numbers: Scene numbers in narrative order
            
        Returns:
            Dictionary with timeline structure
        """
        if not events:
            return {
                'total_events': 0,
                'chronological_order': [],
                'flashbacks': [],
                'story_duration': 'unknown'
            }
        
        # Separate flashbacks from main timeline
        main_timeline = [e for e in events if not e.is_flashback]
        flashbacks = [e for e in events if e.is_flashback]
        
        # Try to estimate story duration
        duration = self._estimate_duration(main_timeline)
        
        # Build chronological order
        chronological = []
        for event in main_timeline:
            chronological.append({
                'scene_number': event.scene_number,
                'time_marker': event.time_value,
                'time_type': event.time_type,
                'position': event.position
            })
        
        # Add flashback information
        flashback_info = []
        for event in flashbacks:
            flashback_info.append({
                'scene_number': event.scene_number,
                'time_marker': event.time_value,
                'narrative_position': event.position
            })
        
        return {
            'total_events': len(events),
            'main_timeline_events': len(main_timeline),
            'flashback_count': len(flashbacks),
            'chronological_order': chronological,
            'flashbacks': flashback_info,
            'story_duration': duration,
            'has_non_linear_narrative': len(flashbacks) > 0
        }
    
    def _estimate_duration(self, events: List[TimelineEvent]) -> str:
        """
        Estimate story duration from time markers
        
        Returns:
            Human-readable duration estimate
        """
        if not events:
            return "unknown"
        
        # Look for explicit duration markers
        duration_pattern = re.compile(
            r'(\d+)\s+(days?|weeks?|months?|years?)',
            re.IGNORECASE
        )
        
        max_duration = 0
        max_unit = None
        
        for event in events:
            if event.time_value:
                match = duration_pattern.search(event.time_value)
                if match:
                    value = int(match.group(1))
                    unit = match.group(2).lower().rstrip('s')
                    
                    # Convert to days for comparison
                    days = value
                    if unit == 'week':
                        days = value * 7
                    elif unit == 'month':
                        days = value * 30
                    elif unit == 'year':
                        days = value * 365
                    
                    if days > max_duration:
                        max_duration = days
                        max_unit = unit
        
        if max_duration > 0 and max_unit:
            if max_duration >= 365:
                return f"~{max_duration // 365} year(s)"
            elif max_duration >= 30:
                return f"~{max_duration // 30} month(s)"
            elif max_duration >= 7:
                return f"~{max_duration // 7} week(s)"
            else:
                return f"~{max_duration} day(s)"
        
        # Fallback: estimate from number of day transitions
        day_transitions = sum(1 for e in events if e.time_type == 'relative_time' and 'day' in str(e.time_value).lower())
        
        if day_transitions > 0:
            return f"~{day_transitions} day(s)"
        
        return "unknown"
    
    def get_scene_time_info(self, text: str, scene_number: int) -> Dict:
        """
        Get time information for a specific scene
        
        Args:
            text: Scene text
            scene_number: Scene number
            
        Returns:
            Dictionary with time info
        """
        events = self.extract_time_markers(text, scene_number)
        
        # Get time of day if present
        time_of_day = None
        for event in events:
            if event.time_type == 'specific_time':
                time_of_day = event.time_value
                break
        
        # Check if it's a flashback scene
        is_flashback = any(e.is_flashback for e in events)
        
        # Get relative position (beginning, middle, end of story)
        relative_marker = None
        if events:
            relative_marker = events[0].time_value
        
        return {
            'scene_number': scene_number,
            'time_of_day': time_of_day,
            'is_flashback': is_flashback,
            'time_markers': [e.time_value for e in events],
            'relative_marker': relative_marker,
            'total_markers': len(events)
        }
    
    def detect_temporal_structure(self, scenes_text: List[Tuple[int, str]]) -> Dict:
        """
        Analyze temporal structure across multiple scenes
        
        Args:
            scenes_text: List of (scene_number, text) tuples
            
        Returns:
            Dictionary with temporal structure analysis
        """
        all_events = []
        scene_times = []
        
        for scene_num, text in scenes_text:
            events = self.extract_time_markers(text, scene_num)
            all_events.extend(events)
            
            time_info = self.get_scene_time_info(text, scene_num)
            scene_times.append(time_info)
        
        # Reconstruct timeline
        timeline = self.reconstruct_timeline(all_events, [s[0] for s in scenes_text])
        
        # Add scene-level time info
        timeline['scene_timeline'] = scene_times
        
        return timeline


