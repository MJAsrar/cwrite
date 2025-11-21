"""
POV (Point of View) Detection Service

Detects narrative perspective in text:
- First person (I, we, me, us)
- Second person (you, your)
- Third person limited (he, she, they - following one character)
- Third person omniscient (multiple character perspectives)
"""

import re
from typing import Dict, List, Tuple, Optional
from collections import Counter


class POVType:
    """POV type enumeration"""
    FIRST_PERSON = "first_person"
    SECOND_PERSON = "second_person"
    THIRD_PERSON_LIMITED = "third_person_limited"
    THIRD_PERSON_OMNISCIENT = "third_person_omniscient"
    MIXED = "mixed"
    UNKNOWN = "unknown"


class POVDetectionService:
    """Service for detecting point of view in narrative text"""
    
    # Pronoun patterns for different POVs
    FIRST_PERSON_PRONOUNS = {
        'i', 'me', 'my', 'mine', 'myself', 'we', 'us', 'our', 'ours', 'ourselves'
    }
    
    SECOND_PERSON_PRONOUNS = {
        'you', 'your', 'yours', 'yourself', 'yourselves'
    }
    
    THIRD_PERSON_PRONOUNS = {
        'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself',
        'they', 'them', 'their', 'theirs', 'themselves'
    }
    
    # First person indicators (beyond pronouns)
    FIRST_PERSON_PATTERNS = [
        r'\bI\s+(?:am|was|have|had|do|did|can|could|will|would|should|must)',
        r'\bI\'(?:m|ve|d|ll)',
        r'\bmy\s+(?:name|life|story|journey|family|mother|father)',
    ]
    
    def __init__(self):
        """Initialize the POV detection service"""
        self.first_person_regexes = [re.compile(pattern, re.IGNORECASE) for pattern in self.FIRST_PERSON_PATTERNS]
    
    def detect_pov(self, text: str, min_confidence: float = 0.6) -> Dict:
        """
        Detect the POV of a text passage
        
        Args:
            text: The text to analyze
            min_confidence: Minimum confidence threshold (0.0-1.0)
            
        Returns:
            Dictionary with POV type, confidence, and details
        """
        if not text or len(text.strip()) < 20:
            return {
                'pov_type': POVType.UNKNOWN,
                'confidence': 0.0,
                'details': {}
            }
        
        # Count pronouns
        pronoun_counts = self._count_pronouns(text)
        
        # Calculate total pronoun count
        total_pronouns = sum(pronoun_counts.values())
        
        if total_pronouns == 0:
            return {
                'pov_type': POVType.UNKNOWN,
                'confidence': 0.0,
                'details': {'reason': 'No pronouns found'}
            }
        
        # Calculate percentages
        first_person_pct = pronoun_counts['first_person'] / total_pronouns
        second_person_pct = pronoun_counts['second_person'] / total_pronouns
        third_person_pct = pronoun_counts['third_person'] / total_pronouns
        
        # Determine POV type
        pov_type = POVType.UNKNOWN
        confidence = 0.0
        details = {
            'pronoun_counts': pronoun_counts,
            'total_pronouns': total_pronouns,
            'percentages': {
                'first_person': round(first_person_pct, 3),
                'second_person': round(second_person_pct, 3),
                'third_person': round(third_person_pct, 3)
            }
        }
        
        # First person dominant
        if first_person_pct >= 0.5:
            pov_type = POVType.FIRST_PERSON
            confidence = first_person_pct
            details['narrator'] = 'I/We narrator'
        
        # Second person (rare)
        elif second_person_pct >= 0.4:
            pov_type = POVType.SECOND_PERSON
            confidence = second_person_pct
            details['narrator'] = 'You narrator'
        
        # Third person dominant
        elif third_person_pct >= 0.5:
            # Check if limited or omniscient
            is_omniscient = self._is_omniscient(text)
            
            if is_omniscient:
                pov_type = POVType.THIRD_PERSON_OMNISCIENT
                details['narrator'] = 'Multiple perspectives'
            else:
                pov_type = POVType.THIRD_PERSON_LIMITED
                details['narrator'] = 'Single character perspective'
            
            confidence = third_person_pct
        
        # Mixed POV
        elif first_person_pct >= 0.3 and third_person_pct >= 0.3:
            pov_type = POVType.MIXED
            confidence = 0.5
            details['narrator'] = 'Mixed perspective'
        
        # Apply confidence threshold
        if confidence < min_confidence:
            pov_type = POVType.UNKNOWN
        
        return {
            'pov_type': pov_type,
            'confidence': round(confidence, 3),
            'details': details
        }
    
    def _count_pronouns(self, text: str) -> Dict[str, int]:
        """Count pronouns by category"""
        # Tokenize (simple word splitting)
        words = re.findall(r'\b\w+\b', text.lower())
        
        counts = {
            'first_person': 0,
            'second_person': 0,
            'third_person': 0
        }
        
        for word in words:
            if word in self.FIRST_PERSON_PRONOUNS:
                counts['first_person'] += 1
            elif word in self.SECOND_PERSON_PRONOUNS:
                counts['second_person'] += 1
            elif word in self.THIRD_PERSON_PRONOUNS:
                counts['third_person'] += 1
        
        return counts
    
    def _is_omniscient(self, text: str) -> bool:
        """
        Heuristic to determine if third person is omniscient vs limited
        
        Omniscient indicators:
        - Multiple characters' thoughts/feelings described
        - Phrases like "he thought", "she felt", "they wondered" for different characters
        - Narrator commentary
        """
        # Check for thought/feeling verbs with multiple subjects
        thought_patterns = [
            r'\b(\w+)\s+(?:thought|felt|wondered|realized|knew|understood|believed)',
            r'\b(\w+)\'s\s+(?:mind|thoughts|feelings|heart)',
        ]
        
        subjects_with_thoughts = set()
        
        for pattern in thought_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                subject = match.group(1).lower()
                if subject in self.THIRD_PERSON_PRONOUNS or subject[0].isupper():
                    subjects_with_thoughts.add(subject)
        
        # If we see thoughts from 2+ different subjects, likely omniscient
        return len(subjects_with_thoughts) >= 2
    
    def detect_pov_character(self, text: str, entities: List[str]) -> Optional[str]:
        """
        Detect which character's POV this scene is from (for third person limited)
        
        Args:
            text: The text to analyze
            entities: List of character names to check
            
        Returns:
            Character name or None
        """
        if not entities:
            return None
        
        # For first person, POV character is the narrator
        pov_result = self.detect_pov(text)
        if pov_result['pov_type'] == POVType.FIRST_PERSON:
            return "narrator"
        
        # For third person, find character most associated with perspective markers
        character_scores = {}
        
        perspective_patterns = [
            r'\b{}\s+(?:thought|felt|wondered|realized|saw|heard|noticed)',
            r'\b{}\'s\s+(?:mind|thoughts|feelings|eyes|perspective)',
            r'from\s+{}\'s\s+(?:point of view|perspective)',
        ]
        
        for character in entities:
            score = 0
            
            # Escape special regex characters in character name
            escaped_name = re.escape(character)
            
            for pattern_template in perspective_patterns:
                pattern = pattern_template.format(escaped_name)
                matches = len(re.findall(pattern, text, re.IGNORECASE))
                score += matches * 2  # Weight perspective markers highly
            
            # Also count regular mentions (lower weight)
            mentions = len(re.findall(r'\b' + escaped_name + r'\b', text, re.IGNORECASE))
            score += mentions
            
            if score > 0:
                character_scores[character] = score
        
        # Return character with highest score
        if character_scores:
            return max(character_scores, key=character_scores.get)
        
        return None
    
    def detect_pov_shift(self, prev_pov: str, current_pov: str) -> bool:
        """
        Detect if there's a POV shift between two text passages
        
        Args:
            prev_pov: Previous POV type
            current_pov: Current POV type
            
        Returns:
            True if there's a shift, False otherwise
        """
        if not prev_pov or not current_pov:
            return False
        
        # Ignore shifts to/from unknown
        if prev_pov == POVType.UNKNOWN or current_pov == POVType.UNKNOWN:
            return False
        
        return prev_pov != current_pov
    
    def get_pov_summary(self, text: str) -> str:
        """
        Get a human-readable POV summary
        
        Args:
            text: The text to analyze
            
        Returns:
            Summary string
        """
        result = self.detect_pov(text)
        pov_type = result['pov_type']
        confidence = result['confidence']
        
        summaries = {
            POVType.FIRST_PERSON: f"First person ('I') - {confidence*100:.0f}% confidence",
            POVType.SECOND_PERSON: f"Second person ('You') - {confidence*100:.0f}% confidence",
            POVType.THIRD_PERSON_LIMITED: f"Third person limited - {confidence*100:.0f}% confidence",
            POVType.THIRD_PERSON_OMNISCIENT: f"Third person omniscient - {confidence*100:.0f}% confidence",
            POVType.MIXED: f"Mixed POV - {confidence*100:.0f}% confidence",
            POVType.UNKNOWN: "POV unclear"
        }
        
        return summaries.get(pov_type, "Unknown POV")


