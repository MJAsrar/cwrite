"""
Scene Type Detection Service

Classifies narrative scenes by type and characteristics:
- Action scenes (short sentences, movement verbs)
- Dialogue scenes (high dialogue percentage)
- Description scenes (sensory details)
- Introspection scenes (character thoughts)
- Opening hooks, climaxes, cliffhangers
"""

import re
from typing import Dict, List, Set
from collections import Counter


class SceneType:
    """Scene type enumeration"""
    ACTION = "action"
    DIALOGUE = "dialogue"
    DESCRIPTION = "description"
    INTROSPECTION = "introspection"
    EXPOSITION = "exposition"
    TRANSITION = "transition"
    MIXED = "mixed"


class SceneSignificance:
    """Scene significance levels"""
    OPENING = "opening"
    CLIMAX = "climax"
    CLIFFHANGER = "cliffhanger"
    RESOLUTION = "resolution"
    SETUP = "setup"
    FILLER = "filler"
    NORMAL = "normal"


class SceneTypeDetectionService:
    """Service for detecting scene types and characteristics"""
    
    # Action indicators
    ACTION_VERBS = {
        'run', 'ran', 'running', 'jump', 'jumped', 'jumping', 'fight', 'fought', 'fighting',
        'hit', 'hitting', 'strike', 'struck', 'striking', 'punch', 'punched', 'punching',
        'kick', 'kicked', 'kicking', 'dodge', 'dodged', 'dodging', 'attack', 'attacked',
        'grab', 'grabbed', 'grabbing', 'throw', 'threw', 'throwing', 'chase', 'chased',
        'flee', 'fled', 'fleeing', 'rush', 'rushed', 'rushing', 'dash', 'dashed', 'dashing'
    }
    
    # Introspection indicators
    THOUGHT_VERBS = {
        'thought', 'think', 'thinking', 'wonder', 'wondered', 'wondering', 'realize',
        'realized', 'realizing', 'remember', 'remembered', 'remembering', 'know', 'knew',
        'believe', 'believed', 'believing', 'understand', 'understood', 'understanding',
        'feel', 'felt', 'feeling', 'sense', 'sensed', 'sensing', 'wish', 'wished', 'wishing'
    }
    
    # Sensory words for description
    SENSORY_WORDS = {
        # Visual
        'see', 'saw', 'seeing', 'look', 'looked', 'looking', 'watch', 'watched', 'watching',
        'stare', 'stared', 'staring', 'glance', 'glanced', 'glancing', 'appear', 'appeared',
        'color', 'colored', 'bright', 'dark', 'light', 'shadow', 'gleam', 'shine', 'glow',
        # Auditory
        'hear', 'heard', 'hearing', 'listen', 'listened', 'listening', 'sound', 'sounded',
        'noise', 'quiet', 'loud', 'whisper', 'whispered', 'echo', 'echoed', 'silence',
        # Tactile
        'touch', 'touched', 'touching', 'feel', 'felt', 'feeling', 'soft', 'hard', 'rough',
        'smooth', 'cold', 'warm', 'hot', 'cool', 'texture', 'grip', 'gripped',
        # Olfactory
        'smell', 'smelled', 'smelling', 'scent', 'odor', 'fragrance', 'aroma', 'stink',
        # Gustatory
        'taste', 'tasted', 'tasting', 'flavor', 'sweet', 'bitter', 'sour', 'salty'
    }
    
    # Dialogue indicators (beyond just quotes)
    DIALOGUE_TAGS = {
        'said', 'says', 'saying', 'asked', 'ask', 'asking', 'replied', 'reply', 'replying',
        'answered', 'answer', 'answering', 'whispered', 'whisper', 'whispering',
        'shouted', 'shout', 'shouting', 'yelled', 'yell', 'yelling', 'muttered', 'mutter',
        'murmured', 'murmur', 'exclaimed', 'exclaim', 'declared', 'declare'
    }
    
    # Cliffhanger indicators
    CLIFFHANGER_PATTERNS = [
        r'\.\.\.$',  # Ends with ellipsis
        r'[?!]$',    # Ends with question or exclamation
        r'\bbut\s+then\b',
        r'\bsuddenly\b',
        r'\bwithout warning\b',
        r'\bjust then\b',
    ]
    
    def __init__(self):
        """Initialize the scene type detection service"""
        self.cliffhanger_regexes = [re.compile(p, re.IGNORECASE) for p in self.CLIFFHANGER_PATTERNS]
    
    def detect_scene_type(self, text: str, dialogue_percentage: float = 0.0) -> Dict:
        """
        Detect the primary type of a scene
        
        Args:
            text: Scene text
            dialogue_percentage: Pre-calculated dialogue percentage (0.0-1.0)
            
        Returns:
            Dictionary with scene type and confidence
        """
        if not text or len(text.strip()) < 50:
            return {
                'scene_type': SceneType.MIXED,
                'confidence': 0.0,
                'characteristics': []
            }
        
        # Calculate various scores
        action_score = self._calculate_action_score(text)
        introspection_score = self._calculate_introspection_score(text)
        description_score = self._calculate_description_score(text)
        dialogue_score = dialogue_percentage
        
        # Determine primary type
        scores = {
            SceneType.ACTION: action_score,
            SceneType.INTROSPECTION: introspection_score,
            SceneType.DESCRIPTION: description_score,
            SceneType.DIALOGUE: dialogue_score
        }
        
        max_score = max(scores.values())
        scene_type = max(scores, key=scores.get)
        
        # If no clear winner or multiple high scores, it's mixed
        high_scores = [k for k, v in scores.items() if v >= 0.3]
        if len(high_scores) >= 3 or max_score < 0.3:
            scene_type = SceneType.MIXED
        
        # Get characteristics
        characteristics = []
        if action_score >= 0.3:
            characteristics.append('action-oriented')
        if dialogue_score >= 0.4:
            characteristics.append('dialogue-heavy')
        if introspection_score >= 0.3:
            characteristics.append('introspective')
        if description_score >= 0.3:
            characteristics.append('descriptive')
        
        # Check pace
        avg_sentence_length = self._average_sentence_length(text)
        if avg_sentence_length < 15:
            characteristics.append('fast-paced')
        elif avg_sentence_length > 25:
            characteristics.append('slow-paced')
        
        return {
            'scene_type': scene_type,
            'confidence': round(max_score, 3),
            'scores': {k: round(v, 3) for k, v in scores.items()},
            'characteristics': characteristics,
            'avg_sentence_length': round(avg_sentence_length, 1)
        }
    
    def _calculate_action_score(self, text: str) -> float:
        """Calculate action content score"""
        words = re.findall(r'\b\w+\b', text.lower())
        if not words:
            return 0.0
        
        action_word_count = sum(1 for word in words if word in self.ACTION_VERBS)
        
        # Short sentences indicate action
        sentences = re.split(r'[.!?]+', text)
        short_sentences = sum(1 for s in sentences if 0 < len(s.split()) < 12)
        
        # Calculate score
        action_word_ratio = action_word_count / len(words)
        short_sentence_ratio = short_sentences / len(sentences) if sentences else 0
        
        return (action_word_ratio * 0.6 + short_sentence_ratio * 0.4)
    
    def _calculate_introspection_score(self, text: str) -> float:
        """Calculate introspection/thought content score"""
        words = re.findall(r'\b\w+\b', text.lower())
        if not words:
            return 0.0
        
        thought_word_count = sum(1 for word in words if word in self.THOUGHT_VERBS)
        
        # Look for first-person internal thoughts
        internal_patterns = [
            r'\bI\s+(?:thought|think|wonder|realize|remember|feel|felt)\b',
            r'\bmy\s+(?:mind|thoughts|feelings)\b',
        ]
        
        internal_markers = 0
        for pattern in internal_patterns:
            internal_markers += len(re.findall(pattern, text, re.IGNORECASE))
        
        thought_ratio = thought_word_count / len(words)
        internal_ratio = internal_markers / (len(words) / 50)  # Normalize
        
        return min(1.0, (thought_ratio * 0.6 + internal_ratio * 0.4))
    
    def _calculate_description_score(self, text: str) -> float:
        """Calculate description/sensory detail score"""
        words = re.findall(r'\b\w+\b', text.lower())
        if not words:
            return 0.0
        
        sensory_word_count = sum(1 for word in words if word in self.SENSORY_WORDS)
        
        # Look for descriptive adjectives (words ending in -ly, -ful, -ous, etc.)
        adjective_patterns = [
            r'\b\w+ly\b',   # softly, gently
            r'\b\w+ful\b',  # beautiful, colorful
            r'\b\w+ous\b',  # gorgeous, luminous
        ]
        
        adjective_count = 0
        for pattern in adjective_patterns:
            adjective_count += len(re.findall(pattern, text.lower()))
        
        sensory_ratio = sensory_word_count / len(words)
        adjective_ratio = adjective_count / len(words)
        
        # Long sentences often indicate description
        avg_sentence_length = self._average_sentence_length(text)
        length_factor = min(1.0, avg_sentence_length / 30)
        
        return (sensory_ratio * 0.5 + adjective_ratio * 0.3 + length_factor * 0.2)
    
    def _average_sentence_length(self, text: str) -> float:
        """Calculate average sentence length in words"""
        sentences = re.split(r'[.!?]+', text)
        sentences = [s for s in sentences if s.strip()]
        
        if not sentences:
            return 0.0
        
        total_words = sum(len(s.split()) for s in sentences)
        return total_words / len(sentences)
    
    def detect_scene_significance(
        self,
        text: str,
        scene_number: int,
        total_scenes: int,
        is_first_scene: bool = False,
        is_last_scene: bool = False
    ) -> str:
        """
        Determine the narrative significance of a scene
        
        Args:
            text: Scene text
            scene_number: Scene number
            total_scenes: Total number of scenes
            is_first_scene: Whether this is the opening scene
            is_last_scene: Whether this is the closing scene
            
        Returns:
            Scene significance level
        """
        # Opening scene
        if is_first_scene or scene_number == 1:
            return SceneSignificance.OPENING
        
        # Resolution scene
        if is_last_scene or scene_number == total_scenes:
            return SceneSignificance.RESOLUTION
        
        # Check for cliffhanger
        if self._is_cliffhanger(text):
            return SceneSignificance.CLIFFHANGER
        
        # Estimate position in story structure (3-act)
        story_position = scene_number / total_scenes
        
        # Climax typically around 75-85% through
        if 0.7 <= story_position <= 0.9:
            # Check for high tension markers
            if self._has_high_tension(text):
                return SceneSignificance.CLIMAX
        
        # Setup scenes (first 25%)
        if story_position < 0.25:
            return SceneSignificance.SETUP
        
        # Default
        return SceneSignificance.NORMAL
    
    def _is_cliffhanger(self, text: str) -> bool:
        """Check if scene ends with a cliffhanger"""
        # Get last 200 characters
        ending = text[-200:] if len(text) > 200 else text
        
        # Check patterns
        for regex in self.cliffhanger_regexes:
            if regex.search(ending):
                return True
        
        return False
    
    def _has_high_tension(self, text: str) -> bool:
        """Check for high tension/intensity markers"""
        tension_words = {
            'suddenly', 'scream', 'screamed', 'terror', 'fear', 'panic', 'desperate',
            'urgent', 'danger', 'threat', 'attack', 'explosion', 'crash', 'blood',
            'death', 'dying', 'killed', 'murder', 'fight', 'battle', 'war', 'weapon'
        }
        
        words = set(re.findall(r'\b\w+\b', text.lower()))
        tension_count = len(words & tension_words)
        
        # Also check for exclamation marks and short, punchy sentences
        exclamations = text.count('!')
        
        return tension_count >= 3 or exclamations >= 5
    
    def get_emotional_tone(self, text: str) -> List[str]:
        """
        Detect emotional tone of a scene
        
        Returns:
            List of emotion tags
        """
        emotion_keywords = {
            'happy': ['happy', 'joy', 'smile', 'smiled', 'laugh', 'laughed', 'delight', 'cheerful'],
            'sad': ['sad', 'sorrow', 'cry', 'cried', 'weep', 'wept', 'tears', 'grief', 'mourn'],
            'angry': ['angry', 'rage', 'fury', 'furious', 'mad', 'irritated', 'annoyed', 'hostile'],
            'fearful': ['fear', 'afraid', 'scared', 'terror', 'terrified', 'panic', 'anxious', 'worried'],
            'tense': ['tense', 'tension', 'nervous', 'uneasy', 'anxious', 'stress', 'pressure'],
            'romantic': ['love', 'loved', 'romance', 'kiss', 'kissed', 'embrace', 'tender', 'passion'],
            'mysterious': ['mystery', 'mysterious', 'strange', 'odd', 'curious', 'enigma', 'puzzle'],
            'hopeful': ['hope', 'hopeful', 'optimistic', 'bright', 'promise', 'promising', 'future']
        }
        
        text_lower = text.lower()
        words = set(re.findall(r'\b\w+\b', text_lower))
        
        detected_emotions = []
        for emotion, keywords in emotion_keywords.items():
            keyword_set = set(keywords)
            if len(words & keyword_set) >= 2:  # At least 2 keyword matches
                detected_emotions.append(emotion)
        
        return detected_emotions if detected_emotions else ['neutral']


