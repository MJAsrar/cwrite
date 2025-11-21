"""
Entity Extraction Service

This service handles the extraction of entities (characters, locations, themes) 
from text content using spaCy NLP pipeline.
"""

import spacy
import re
from typing import List, Dict, Set, Tuple, Optional
from collections import Counter, defaultdict
import logging
from datetime import datetime

from ..models.entity import Entity, EntityType, EntityMention, EntityCreate
from ..models.entity_mention import DetailedEntityMention
from ..models.scene import Scene
from ..repositories.entity_repository import EntityRepository
from ..repositories.entity_mention_repository import EntityMentionRepository

logger = logging.getLogger(__name__)


class EntityExtractionService:
    """Service for extracting entities from text content"""
    
    def __init__(self, entity_repository: EntityRepository, entity_mention_repository: Optional[EntityMentionRepository] = None):
        self.entity_repository = entity_repository
        self.entity_mention_repository = entity_mention_repository
        self._nlp = None
        self._character_patterns = None
        self._location_patterns = None
        self._theme_keywords = None
        
    def _load_nlp_model(self):
        """Load spaCy NLP model lazily"""
        if self._nlp is None:
            try:
                # Try to load the English model
                self._nlp = spacy.load("en_core_web_sm")
                logger.info("Loaded spaCy English model successfully")
            except OSError:
                logger.error("spaCy English model not found. Please install with: python -m spacy download en_core_web_sm")
                raise RuntimeError("spaCy English model not available")
        return self._nlp
    
    def _initialize_patterns(self):
        """Initialize regex patterns for entity extraction"""
        if self._character_patterns is None:
            # Patterns for character names (proper nouns, titles, etc.)
            self._character_patterns = [
                r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b',  # Proper nouns
                r'\b(?:Mr|Mrs|Ms|Dr|Professor|Captain|Sir|Lady|Lord)\s+[A-Z][a-z]+\b',  # Titles
                r'\b[A-Z][a-z]+(?:\'s|\')\b',  # Possessive forms
            ]
            
        if self._location_patterns is None:
            # Patterns for locations
            self._location_patterns = [
                r'\b(?:in|at|from|to|near|around)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b',
                r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:City|Town|Village|Castle|Palace|Forest|Mountain|River|Lake|Ocean|Sea|Desert|Valley|Hill|Road|Street|Avenue|Boulevard)\b',
            ]
            
        if self._theme_keywords is None:
            # Common thematic keywords for literature
            self._theme_keywords = {
                'love': ['love', 'romance', 'affection', 'passion', 'heart', 'beloved', 'crush', 'attraction'],
                'death': ['death', 'dying', 'funeral', 'grave', 'cemetery', 'mortality', 'corpse', 'deceased'],
                'power': ['power', 'authority', 'control', 'dominance', 'rule', 'command', 'influence', 'leadership'],
                'betrayal': ['betrayal', 'betray', 'treachery', 'deception', 'backstab', 'double-cross', 'unfaithful'],
                'friendship': ['friendship', 'friend', 'companion', 'ally', 'buddy', 'comrade', 'fellowship'],
                'family': ['family', 'mother', 'father', 'parent', 'sibling', 'brother', 'sister', 'child', 'son', 'daughter'],
                'war': ['war', 'battle', 'conflict', 'fight', 'combat', 'warfare', 'soldier', 'army', 'weapon'],
                'justice': ['justice', 'fairness', 'right', 'wrong', 'moral', 'ethical', 'law', 'court', 'judge'],
                'freedom': ['freedom', 'liberty', 'independence', 'escape', 'prison', 'captivity', 'chains', 'bound'],
                'sacrifice': ['sacrifice', 'give up', 'surrender', 'offer', 'devotion', 'selfless', 'martyr'],
                'revenge': ['revenge', 'vengeance', 'retaliation', 'payback', 'retribution', 'avenge'],
                'hope': ['hope', 'optimism', 'faith', 'belief', 'trust', 'confidence', 'aspiration', 'dream'],
                'fear': ['fear', 'afraid', 'terror', 'horror', 'anxiety', 'panic', 'dread', 'frightened'],
                'identity': ['identity', 'self', 'who am i', 'personality', 'character', 'nature', 'essence'],
                'coming_of_age': ['growing up', 'maturity', 'adolescence', 'childhood', 'adult', 'responsibility']
            }
    
    async def extract_entities_from_text(
        self, 
        text: str, 
        file_id: str, 
        project_id: str,
        confidence_threshold: float = 0.5
    ) -> List[Entity]:
        """
        Extract entities from text content
        
        Args:
            text: The text content to analyze
            file_id: ID of the source file
            project_id: ID of the project
            confidence_threshold: Minimum confidence score for entities
            
        Returns:
            List of extracted entities
        """
        try:
            nlp = self._load_nlp_model()
            self._initialize_patterns()
            
            # Process text with spaCy
            doc = nlp(text)
            
            # Extract different types of entities
            characters = await self._extract_characters(doc, text, file_id, project_id)
            locations = await self._extract_locations(doc, text, file_id, project_id)
            themes = await self._extract_themes(doc, text, file_id, project_id)
            
            # Combine all entities and filter by confidence
            all_entities = characters + locations + themes
            filtered_entities = [
                entity for entity in all_entities 
                if entity.confidence_score >= confidence_threshold
            ]
            
            logger.info(f"Extracted {len(filtered_entities)} entities from text (file_id: {file_id})")
            return filtered_entities
            
        except Exception as e:
            logger.error(f"Error extracting entities from text: {str(e)}")
            raise
    
    async def _extract_characters(
        self, 
        doc, 
        text: str, 
        file_id: str, 
        project_id: str
    ) -> List[Entity]:
        """Extract character entities from text"""
        characters = {}
        
        # Extract named entities that could be characters
        for ent in doc.ents:
            if ent.label_ in ['PERSON']:
                name = ent.text.strip()
                if self._is_valid_character_name(name):
                    if name not in characters:
                        characters[name] = {
                            'mentions': [],
                            'aliases': set(),
                            'confidence_scores': []
                        }
                    
                    # Calculate position in text
                    position = ent.start_char
                    context = self._extract_context(text, position, name)
                    confidence = self._calculate_character_confidence(ent, doc)
                    
                    mention = EntityMention(
                        file_id=file_id,
                        position=position,
                        context=context,
                        confidence=confidence
                    )
                    
                    characters[name]['mentions'].append(mention)
                    characters[name]['confidence_scores'].append(confidence)
        
        # Extract characters using regex patterns
        for pattern in self._character_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                name = match.group().strip()
                if self._is_valid_character_name(name) and not self._is_common_word(name):
                    if name not in characters:
                        characters[name] = {
                            'mentions': [],
                            'aliases': set(),
                            'confidence_scores': []
                        }
                    
                    position = match.start()
                    context = self._extract_context(text, position, name)
                    confidence = 0.6  # Lower confidence for regex matches
                    
                    mention = EntityMention(
                        file_id=file_id,
                        position=position,
                        context=context,
                        confidence=confidence
                    )
                    
                    characters[name]['mentions'].append(mention)
                    characters[name]['confidence_scores'].append(confidence)
        
        # Create Entity objects
        entity_list = []
        for name, data in characters.items():
            # Priority Fix 4: Increase minimum mention threshold to 3
            if len(data['mentions']) >= 3:  # Require at least 3 mentions
                avg_confidence = sum(data['confidence_scores']) / len(data['confidence_scores'])
                
                entity = Entity(
                    project_id=project_id,
                    type=EntityType.CHARACTER,
                    name=name,
                    aliases=list(data['aliases']),
                    confidence_score=avg_confidence,
                    mention_count=len(data['mentions']),
                    first_mentioned=data['mentions'][0],
                    last_mentioned=data['mentions'][-1],
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                entity_list.append(entity)
        
        return entity_list
    
    async def _extract_locations(
        self, 
        doc, 
        text: str, 
        file_id: str, 
        project_id: str
    ) -> List[Entity]:
        """Extract location entities from text"""
        locations = {}
        
        # Extract named entities that could be locations
        for ent in doc.ents:
            if ent.label_ in ['GPE', 'LOC', 'FAC']:  # Geopolitical, Location, Facility
                name = ent.text.strip()
                if self._is_valid_location_name(name):
                    if name not in locations:
                        locations[name] = {
                            'mentions': [],
                            'confidence_scores': []
                        }
                    
                    position = ent.start_char
                    context = self._extract_context(text, position, name)
                    confidence = self._calculate_location_confidence(ent, doc)
                    
                    mention = EntityMention(
                        file_id=file_id,
                        position=position,
                        context=context,
                        confidence=confidence
                    )
                    
                    locations[name]['mentions'].append(mention)
                    locations[name]['confidence_scores'].append(confidence)
        
        # Extract locations using regex patterns
        for pattern in self._location_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                # Extract the location name from the match
                if match.groups():
                    name = match.group(1).strip()
                else:
                    name = match.group().strip()
                
                if self._is_valid_location_name(name):
                    if name not in locations:
                        locations[name] = {
                            'mentions': [],
                            'confidence_scores': []
                        }
                    
                    position = match.start()
                    context = self._extract_context(text, position, name)
                    confidence = 0.7  # Moderate confidence for pattern matches
                    
                    mention = EntityMention(
                        file_id=file_id,
                        position=position,
                        context=context,
                        confidence=confidence
                    )
                    
                    locations[name]['mentions'].append(mention)
                    locations[name]['confidence_scores'].append(confidence)
        
        # Create Entity objects
        entity_list = []
        for name, data in locations.items():
            # Dynamic threshold: require 2 mentions, but allow 1 for high-confidence real locations
            min_mentions = 1 if self._looks_like_real_location(name) else 2
            if len(data['mentions']) >= min_mentions:
                avg_confidence = sum(data['confidence_scores']) / len(data['confidence_scores'])
                
                entity = Entity(
                    project_id=project_id,
                    type=EntityType.LOCATION,
                    name=name,
                    aliases=[],
                    confidence_score=avg_confidence,
                    mention_count=len(data['mentions']),
                    first_mentioned=data['mentions'][0],
                    last_mentioned=data['mentions'][-1],
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                entity_list.append(entity)
        
        return entity_list
    
    async def _extract_themes(
        self, 
        doc, 
        text: str, 
        file_id: str, 
        project_id: str
    ) -> List[Entity]:
        """Extract thematic entities from text"""
        theme_scores = defaultdict(list)
        text_lower = text.lower()
        
        # Count theme-related keywords
        for theme, keywords in self._theme_keywords.items():
            total_score = 0
            mentions = []
            
            for keyword in keywords:
                # Find all occurrences of the keyword
                pattern = r'\b' + re.escape(keyword) + r'\b'
                matches = list(re.finditer(pattern, text_lower))
                
                for match in matches:
                    position = match.start()
                    context = self._extract_context(text, position, keyword)
                    
                    # Calculate contextual relevance
                    relevance = self._calculate_theme_relevance(keyword, context, doc)
                    total_score += relevance
                    
                    if relevance > 0.3:  # Only include relevant mentions
                        mention = EntityMention(
                            file_id=file_id,
                            position=position,
                            context=context,
                            confidence=relevance
                        )
                        mentions.append(mention)
            
            if mentions and total_score > 0.5:  # Threshold for theme presence
                theme_scores[theme] = {
                    'score': total_score / len(keywords),  # Normalize by keyword count
                    'mentions': mentions
                }
        
        # Create Entity objects for themes
        entity_list = []
        for theme, data in theme_scores.items():
            if data['score'] > 0.3:  # Minimum theme confidence
                entity = Entity(
                    project_id=project_id,
                    type=EntityType.THEME,
                    name=theme.replace('_', ' ').title(),
                    aliases=[],
                    confidence_score=min(data['score'], 1.0),
                    mention_count=len(data['mentions']),
                    first_mentioned=data['mentions'][0] if data['mentions'] else None,
                    last_mentioned=data['mentions'][-1] if data['mentions'] else None,
                    attributes={'keywords': self._theme_keywords[theme]},
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                entity_list.append(entity)
        
        return entity_list
    
    def _is_valid_character_name(self, name: str) -> bool:
        """Check if a name is a valid character name"""
        # Priority Fix 1: Filter broken contractions/apostrophes
        if "'" in name or "'" in name:  # Both regular and fancy apostrophes
            return False
        
        # Minimum length check
        if len(name) < 2 or len(name) > 50:
            return False
        
        # Must contain at least one letter
        if not re.search(r'[a-zA-Z]', name):
            return False
        
        # Must start with capital letter (proper names)
        if not name[0].isupper():
            return False
        
        # Split into words for multi-word analysis
        words = name.split()
        
        # Filter out phrases starting with pronouns followed by verbs
        # Examples: "He shook his head", "She looked at", "You don"
        pronouns = {
            'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
            'my', 'your', 'his', 'hers', 'its', 'our', 'their', 'mine', 'yours', 'ours', 'theirs',
            'myself', 'yourself', 'himself', 'herself', 'itself', 'ourselves', 'themselves'
        }
        
        # If it starts with a pronoun, it's likely not a name
        if len(words) > 0 and words[0].lower() in pronouns:
            return False
        
        # For single-word names, check against pronouns
        if len(words) == 1 and name.lower() in pronouns:
            return False
        
        # Priority Fix 3: Expanded excluded words (generic/common words)
        excluded_words = {
            # Articles, conjunctions, prepositions
            'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'a', 'an', 'is', 'was', 'were', 'are', 'be', 'been', 'being',
            # Common interjections and fillers
            'oh', 'ah', 'well', 'yes', 'no', 'hmm', 'uh', 'um', 'huh',
            # Demonstratives
            'this', 'that', 'these', 'those', 'here', 'there',
            # Common verbs (dialog tags)
            'said', 'says', 'asked', 'replied', 'answered', 'told', 'spoke',
            # Meta/structural words
            'chapter', 'page', 'book', 'story', 'novel', 'author', 'reader', 'character',
            # Other common non-names
            'something', 'someone', 'anyone', 'everyone', 'nothing', 'everything',
            'all', 'some', 'any', 'many', 'much', 'few', 'little',
            'who', 'what', 'when', 'where', 'why', 'how',
            'think', 'thought', 'know', 'knew', 'mean', 'suppose',
            'just', 'like', 'right', 'so', 'now', 'then', 'may', 'might', 'could', 'would', 'should',
            'thank', 'thanks', 'please', 'sorry', 'excuse', 'pardon',
            'god', 'dear', 'course'
        }
        
        if name.lower() in excluded_words:
            return False
        
        # Filter out multi-word phrases containing common verbs
        # These are likely action descriptions, not character names
        common_action_verbs = {
            'shook', 'looked', 'walked', 'ran', 'jumped', 'sat', 'stood', 'turned', 'moved',
            'took', 'gave', 'made', 'went', 'came', 'got', 'saw', 'heard', 'felt', 'thought',
            'knew', 'wanted', 'tried', 'started', 'stopped', 'continued', 'began', 'finished',
            'opened', 'closed', 'left', 'arrived', 'returned', 'entered', 'exited', 'climbed',
            'fell', 'rose', 'lifted', 'dropped', 'pulled', 'pushed', 'grabbed', 'held',
            'smiled', 'laughed', 'cried', 'screamed', 'whispered', 'shouted', 'nodded',
            'pointed', 'waved', 'touched', 'kissed', 'hugged', 'hit', 'kicked', 'threw',
            'don', 'doesn', 'didn', 'won', 'can', 'will', 'would', 'could', 'should',
        }
        
        if len(words) > 1:
            # Check if any word in the phrase is a common action verb
            for word in words:
                if word.lower() in common_action_verbs:
                    return False
            
            # Check for common body parts in multi-word phrases
            body_parts = {'head', 'hand', 'hands', 'face', 'eyes', 'eye', 'arm', 'arms', 'leg', 'legs', 'body', 'finger', 'fingers'}
            for word in words:
                if word.lower() in body_parts:
                    return False
        
        # Filter out incomplete/fragmented names
        # Names ending with common incomplete words suggest fragments
        if len(words) > 1:
            last_word = words[-1].lower()
            incomplete_endings = {'don', 'doesn', 'didn', 'won', 'can', 'will', 't', 's', 'd'}
            if last_word in incomplete_endings:
                return False
        
        # Filter out single incomplete words that look like fragments
        if len(words) == 1 and len(name) <= 4:
            fragment_words = {'don', 'won', 'can', 'will', 'yes', 'no', 'oh', 'ah'}
            if name.lower() in fragment_words:
                return False
        
        return True
    
    def _looks_like_real_location(self, name: str) -> bool:
        """Check if a name looks like a well-known or real location"""
        name_lower = name.lower()
        
        # Known continents, countries, major cities, and cultural institutions
        well_known_locations = {
            'africa', 'asia', 'europe', 'australia', 'antarctica', 'north america', 'south america',
            'london', 'paris', 'new york', 'tokyo', 'beijing', 'moscow', 'rome', 'berlin',
            'madrid', 'athens', 'cairo', 'delhi', 'mumbai', 'sydney', 'toronto', 'chicago',
            'los angeles', 'hollywood', 'broadway', 'manhattan', 'brooklyn', 'queens',
            'england', 'france', 'germany', 'italy', 'spain', 'china', 'japan', 'india',
            'russia', 'canada', 'mexico', 'brazil', 'argentina', 'egypt', 'greece',
            'middle east', 'far east', 'west end', 'east end', 'north end', 'south end',
            'somerset', 'yorkshire', 'cornwall', 'wales', 'scotland', 'ireland',
            'rada', 'royal academy', 'sunset boulevard',
        }
        
        # Check direct match
        if name_lower in well_known_locations:
            return True
        
        # Check if it contains well-known location
        for location in well_known_locations:
            if location in name_lower:
                return True
        
        # Patterns that suggest real locations
        location_indicators = [
            r'\b(city|town|village|county|state|province|region|district|territory)\b',
            r'\b(north|south|east|west|central)\s+(end|side|coast|region)\b',
            r'\b(mount|mt\.?|lake|river|ocean|sea|bay|island)\s+[A-Z]',
            r'\b[A-Z][a-z]+\s+(Street|Road|Avenue|Boulevard|Lane|Drive|Court)\b',
            r'\b(port|harbor|harbour)\s+[A-Z]',
            # Fictional/fantasy location indicators
            r'\b(kingdom|empire|realm|dominion|republic|federation)\b',
            r'\b[A-Z][a-z]+\s+(Kingdom|Empire|Realm|Dominion|Republic|Federation|Lands|Isles)\b',
            # Theatre/venue names
            r'\b(theatre|theater|playhouse|opera house|concert hall)\b',
        ]
        
        for pattern in location_indicators:
            if re.search(pattern, name, re.IGNORECASE):
                return True
        
        return False
    
    def _is_valid_location_name(self, name: str) -> bool:
        """Check if a name is a valid location name"""
        if len(name) < 2 or len(name) > 100:
            return False
        
        # Must contain at least one letter
        if not re.search(r'[a-zA-Z]', name):
            return False
        
        # Filter out contractions/apostrophes
        if "'" in name or "'" in name:
            return False
        
        # Must start with capital letter (proper noun requirement)
        if not name[0].isupper():
            return False
        
        # If it looks like a real location, do minimal filtering
        if self._looks_like_real_location(name):
            # Still filter body parts and obvious non-locations
            body_parts_pattern = r'\b(face|eye|eyes|hand|hands|head|heads|body|bodies|arm|arms|leg|legs|foot|feet|finger|fingers|cheek|cheeks|forehead|nose|mouth|lips|ear|ears|shoulder|shoulders)\b'
            if re.search(body_parts_pattern, name, re.IGNORECASE):
                return False
            return True
        
        # CRITICAL FIX: Strip "the", "a", "an" from the beginning before further validation
        # This allows us to check the actual content of phrases like "the eye", "the school play"
        name_without_article = re.sub(r'^(the|a|an)\s+', '', name, flags=re.IGNORECASE).strip()
        
        # If stripping the article results in an empty string or too short, reject
        if len(name_without_article) < 2:
            return False
        
        # Check the name without article against filters (for multi-word phrases)
        # Single-word check after article removal
        words_in_name = name_without_article.split()
        
        # Extensive list of common words that are NOT locations
        excluded_words = {
            # Common verbs
            'do', 'does', 'did', 'done', 'doing', 'be', 'been', 'being', 'is', 'are', 'was', 'were',
            'have', 'has', 'had', 'having', 'go', 'goes', 'went', 'going', 'come', 'came', 'coming',
            'make', 'made', 'making', 'get', 'got', 'getting', 'give', 'gave', 'given', 'giving',
            'take', 'took', 'taken', 'taking', 'know', 'knew', 'known', 'knowing', 'think', 'thought',
            'see', 'saw', 'seen', 'seeing', 'look', 'looked', 'looking', 'want', 'wanted', 'wanting',
            'use', 'used', 'using', 'find', 'found', 'finding', 'tell', 'told', 'telling',
            'ask', 'asked', 'asking', 'work', 'worked', 'working', 'seem', 'seemed', 'seeming',
            'feel', 'felt', 'feeling', 'try', 'tried', 'trying', 'leave', 'left', 'leaving',
            'call', 'called', 'calling', 'put', 'putting', 'mean', 'meant', 'meaning',
            'keep', 'kept', 'keeping', 'let', 'letting', 'begin', 'began', 'begun', 'beginning',
            'show', 'showed', 'shown', 'showing', 'hear', 'heard', 'hearing', 'play', 'played', 'playing',
            'run', 'ran', 'running', 'move', 'moved', 'moving', 'live', 'lived', 'living',
            'believe', 'believed', 'believing', 'bring', 'brought', 'bringing', 'happen', 'happened',
            'write', 'wrote', 'written', 'writing', 'sit', 'sat', 'sitting', 'stand', 'stood', 'standing',
            'lose', 'lost', 'losing', 'pay', 'paid', 'paying', 'meet', 'met', 'meeting',
            'include', 'included', 'including', 'continue', 'continued', 'continuing', 'set', 'setting',
            'learn', 'learned', 'learning', 'change', 'changed', 'changing', 'lead', 'led', 'leading',
            'understand', 'understood', 'understanding', 'watch', 'watched', 'watching', 'follow',
            'stop', 'stopped', 'stopping', 'create', 'created', 'creating', 'speak', 'spoke', 'spoken',
            'read', 'reading', 'allow', 'allowed', 'allowing', 'add', 'added', 'adding',
            'spend', 'spent', 'spending', 'grow', 'grew', 'grown', 'growing', 'open', 'opened', 'opening',
            'walk', 'walked', 'walking', 'win', 'won', 'winning', 'offer', 'offered', 'offering',
            'remember', 'remembered', 'remembering', 'love', 'loved', 'loving', 'consider', 'considered',
            'appear', 'appeared', 'appearing', 'buy', 'bought', 'buying', 'wait', 'waited', 'waiting',
            'serve', 'served', 'serving', 'die', 'died', 'dying', 'send', 'sent', 'sending',
            'expect', 'expected', 'expecting', 'build', 'built', 'building', 'stay', 'stayed', 'staying',
            'fall', 'fell', 'fallen', 'falling', 'cut', 'cutting', 'reach', 'reached', 'reaching',
            'kill', 'killed', 'killing', 'remain', 'remained', 'remaining', 'suggest', 'suggested',
            'raise', 'raised', 'raising', 'pass', 'passed', 'passing', 'sell', 'sold', 'selling',
            'require', 'required', 'requiring', 'report', 'reported', 'reporting', 'decide', 'decided',
            'pull', 'pulled', 'pulling', 'saying', 'gauge', 'bore', 'cover', 'unwind', 'stick',
            'turn', 'rub', 'produce', 'waver', 'dab', 'drag', 'visit', 'fuck', 'screw',
            
            # Pronouns
            'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
            'my', 'your', 'his', 'hers', 'its', 'our', 'their', 'mine', 'yours', 'ours', 'theirs',
            'myself', 'yourself', 'himself', 'herself', 'itself', 'ourselves', 'themselves',
            'this', 'that', 'these', 'those',
            
            # Common nouns (not locations)
            'one', 'time', 'year', 'day', 'week', 'month', 'moment', 'hour', 'minute', 'second',
            'way', 'thing', 'man', 'woman', 'child', 'person', 'people', 'life', 'hand', 'part',
            'place', 'case', 'point', 'group', 'problem', 'fact', 'eye', 'face', 'head', 'hand',
            'word', 'side', 'kind', 'number', 'name', 'idea', 'question', 'body', 'area', 'level',
            'room', 'door', 'table', 'chair', 'wall', 'floor', 'window', 'car', 'book', 'water',
            'money', 'story', 'lot', 'end', 'result', 'change', 'morning', 'night', 'reason',
            'difference', 'kind', 'form', 'bit', 'type', 'sort', 'youth', 'age', 'power', 'drink',
            'mirror', 'fingers', 'cheeks', 'forehead', 'gaze', 'smile', 'notes', 'reflection',
            'audition', 'profession', 'lifeline', 'affections', 'feelings', 'virginity', 'childhood',
            
            # Common adjectives/adverbs
            'last', 'next', 'first', 'second', 'third', 'other', 'new', 'old', 'good', 'bad',
            'great', 'little', 'big', 'small', 'high', 'low', 'long', 'short', 'right', 'left',
            'early', 'late', 'best', 'worst', 'same', 'different', 'such', 'own', 'sure', 'least',
            'young', 'beautiful', 'seductive', 'mysterious', 'obvious', 'enough', 'scuffed', 'leather',
            
            # Common prepositions/conjunctions/articles
            'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'from', 'by',
            'about', 'into', 'through', 'over', 'after', 'before', 'between', 'under', 'while',
            'the', 'a', 'an', 'as', 'if', 'when', 'where', 'who', 'what', 'which', 'how', 'why',
            
            # Interjections/fillers
            'oh', 'ah', 'well', 'yes', 'no', 'please', 'thanks', 'thank', 'sorry', 'okay',
            
            # Time-related (not locations)
            'today', 'tomorrow', 'yesterday', 'now', 'then', 'later', 'soon', 'never', 'always',
            'afterwards', 'beginning', 'forever',
            
            # Generic school/work/place words (not specific locations)
            'school', 'college', 'university', 'office', 'work', 'home', 'house', 'building',
            'cinema', 'venue', 'places',
            
            # Modal verbs
            'can', 'could', 'may', 'might', 'will', 'would', 'shall', 'should', 'must', 'ought',
            
            # Demonstratives/quantifiers
            'all', 'some', 'any', 'many', 'much', 'few', 'little', 'more', 'most', 'less',
            'several', 'both', 'each', 'every', 'either', 'neither', 'another', 'other', 'everybody',
            'nobody', 'somebody', 'anybody',
            
            # Misc common words
            'something', 'anything', 'nothing', 'everything', 'someone', 'anyone', 'everyone',
            'somewhere', 'anywhere', 'everywhere', 'nowhere', 'somehow', 'anyway',
            'just', 'only', 'also', 'even', 'still', 'already', 'yet', 'quite', 'very',
            'really', 'actually', 'probably', 'maybe', 'perhaps', 'almost',
            
            # Actions/events (not locations)
            'journalism', 'abortion', 'reaction', 'touch', 'satisfaction', 'compromises',
            'operations', 'powders', 'years', 'acting', 'performing', 'actress',
        }
        
        # Check if it's a single excluded word
        if len(words_in_name) == 1 and name_without_article.lower() in excluded_words:
            return False
        
        # Check if the original full name (with article) is just an excluded word with article
        if name.lower() in excluded_words:
            return False
        
        # Filter out phrases containing body parts or possessives
        body_parts_pattern = r'\b(face|eye|eyes|hand|hands|head|heads|body|bodies|arm|arms|leg|legs|foot|feet|finger|fingers|cheek|cheeks|forehead|nose|mouth|lips|ear|ears|shoulder|shoulders|holdall|chair|mirror)\b'
        if re.search(body_parts_pattern, name, re.IGNORECASE):
            return False
        
        # Filter out common non-location multi-word phrases
        non_location_phrases = [
            'school play', 'school days', 'school years', 'school when',
            'TV journalism', 'my profession', 'my affections', 'my best',
            'old house', 'your childhood', 'your lifeline', 'your life',
            'cinema to see', 'chair beside', 'second act', 'end of', 'beginning of',
            'least there', 'at least', 'this town', 'same town',
            'fact', 'one side', 'touch with', 'terms with', 'forward to',
            'way forever', 'moment', 'day it', 'places connected',
        ]
        
        name_lower = name.lower()
        for phrase in non_location_phrases:
            if phrase in name_lower:
                return False
        
        # Filter out verb phrases (common patterns) - more comprehensive
        verb_phrase_patterns = [
            r'\b(have|had|has)\s+(an|a|the)\s+\w+',  # have an abortion, has a moment, etc.
            r'\b(drag|pull|push|throw|bring|take|put)\s+(it|them|him|her)\s+',  # drag it up
            r'\bgauge\s+(his|her|their|your|my)\s+reaction',  # gauge reaction
            r'\bcover\s+up\b',  # cover up
            r'\bturn\s+(our|your|my|their)\s+hand',  # turn our hand
            r'\bget\s+into\s+(TV|a|the)',  # get into TV
            r'\bget\s+in\s+touch\b',  # get in touch
            r'\bgive\s+(my|your|his|her|their)\s+best',  # give my best
            r'\blook\s+forward\b',  # look forward
            r'\bcome\s+to\s+terms',  # come to terms
            r'\bmake\s+compromises',  # make compromises
            r'\blearn\s+to\s+',  # learn to relax
            r'\bstay\s+that\s+way',  # stay that way
            r'\brub\s+it\s+in',  # rub it in
            r'\bperform\s+(in|at|on)',  # performing in/at
            r'\bproduced?\s+(by|mysterious)',  # produce/produced
            r'\bask\s+you\s+is',  # ask you is
            r'\bleave\s+(that|it)\s+to',  # leave that to
            r'\bstick\s+to\b',  # stick to
            r'\bplay\s+parts\b',  # play parts
        ]
        
        for pattern in verb_phrase_patterns:
            if re.search(pattern, name, re.IGNORECASE):
                return False
        
        # Reject phrases that are clearly fragments or sentence parts
        # Check for presence of common verbs in multi-word phrases
        if len(words_in_name) > 1:
            common_verbs_in_phrases = {
                'do', 'be', 'have', 'get', 'give', 'make', 'take', 'know', 'think', 'see',
                'come', 'go', 'want', 'look', 'use', 'find', 'tell', 'ask', 'work', 'seem',
                'feel', 'try', 'leave', 'call', 'put', 'mean', 'turn', 'show', 'play', 'run',
                'buy', 'pay', 'meet', 'learn', 'stay', 'rub', 'gauge', 'bore', 'drag', 'cover',
                'unwind', 'waver', 'produce', 'stick', 'visit', 'say', 'fuck', 'screw',
            }
            
            for word in words_in_name:
                if word.lower() in common_verbs_in_phrases:
                    return False
        
        return True
    
    def _is_common_word(self, word: str) -> bool:
        """Check if a word is too common to be a character name"""
        common_words = {
            'said', 'says', 'asked', 'replied', 'answered', 'told', 'spoke', 'whispered',
            'thought', 'knew', 'felt', 'saw', 'looked', 'went', 'came', 'left', 'arrived'
        }
        return word.lower() in common_words
    
    def _extract_context(self, text: str, position: int, entity_name: str, context_size: int = 100) -> str:
        """Extract context around an entity mention"""
        start = max(0, position - context_size)
        end = min(len(text), position + len(entity_name) + context_size)
        return text[start:end].strip()
    
    def _calculate_character_confidence(self, ent, doc) -> float:
        """Calculate confidence score for character entities"""
        base_confidence = 0.8 if ent.label_ == 'PERSON' else 0.6
        
        # Boost confidence if entity appears with dialogue
        text_around = doc[max(0, ent.start-10):min(len(doc), ent.end+10)].text
        if '"' in text_around or "'" in text_around:
            base_confidence += 0.1
        
        # Boost confidence if entity has title
        if any(token.text.lower() in ['mr', 'mrs', 'ms', 'dr', 'professor', 'captain', 'sir', 'lady', 'lord'] 
               for token in doc[max(0, ent.start-2):ent.start]):
            base_confidence += 0.1
        
        return min(base_confidence, 1.0)
    
    def _calculate_location_confidence(self, ent, doc) -> float:
        """Calculate confidence score for location entities"""
        base_confidence = 0.7
        
        # Boost confidence based on entity label
        if ent.label_ == 'GPE':  # Geopolitical entity
            base_confidence = 0.8
        elif ent.label_ == 'LOC':  # Location
            base_confidence = 0.9
        elif ent.label_ == 'FAC':  # Facility
            base_confidence = 0.7
        
        # Boost confidence if preceded by location indicators
        text_before = doc[max(0, ent.start-3):ent.start].text.lower()
        location_indicators = ['in', 'at', 'from', 'to', 'near', 'around', 'inside', 'outside']
        if any(indicator in text_before for indicator in location_indicators):
            base_confidence += 0.1
        
        return min(base_confidence, 1.0)
    
    def _calculate_theme_relevance(self, keyword: str, context: str, doc) -> float:
        """Calculate relevance score for theme keywords in context"""
        base_score = 0.5
        context_lower = context.lower()
        
        # Boost score based on context richness
        emotional_words = ['feel', 'emotion', 'heart', 'soul', 'mind', 'spirit', 'deep', 'profound']
        if any(word in context_lower for word in emotional_words):
            base_score += 0.2
        
        # Boost score if keyword appears multiple times in context
        keyword_count = context_lower.count(keyword.lower())
        if keyword_count > 1:
            base_score += 0.1 * (keyword_count - 1)
        
        # Reduce score if context seems too generic
        generic_words = ['said', 'went', 'came', 'looked', 'saw', 'heard']
        generic_count = sum(1 for word in generic_words if word in context_lower)
        if generic_count > 2:
            base_score -= 0.1
        
        return min(max(base_score, 0.0), 1.0)
    
    async def merge_similar_entities(
        self, 
        entities: List[Entity], 
        similarity_threshold: float = 0.8
    ) -> List[Entity]:
        """
        Merge entities that are likely the same (e.g., 'John' and 'John Smith')
        
        Args:
            entities: List of entities to merge
            similarity_threshold: Threshold for considering entities similar
            
        Returns:
            List of merged entities
        """
        merged_entities = []
        processed_indices = set()
        
        for i, entity1 in enumerate(entities):
            if i in processed_indices:
                continue
                
            # Find similar entities
            similar_entities = [entity1]
            processed_indices.add(i)
            
            for j, entity2 in enumerate(entities[i+1:], i+1):
                if j in processed_indices:
                    continue
                    
                if (entity1.type == entity2.type and 
                    self._are_entities_similar(entity1, entity2, similarity_threshold)):
                    similar_entities.append(entity2)
                    processed_indices.add(j)
            
            # Merge similar entities
            if len(similar_entities) > 1:
                merged_entity = self._merge_entity_group(similar_entities)
                merged_entities.append(merged_entity)
            else:
                merged_entities.append(entity1)
        
        return merged_entities
    
    def _are_entities_similar(self, entity1: Entity, entity2: Entity, threshold: float) -> bool:
        """Check if two entities are similar enough to merge"""
        # Simple similarity based on name overlap
        name1_parts = set(entity1.name.lower().split())
        name2_parts = set(entity2.name.lower().split())
        
        # Check if one name is contained in the other
        if (entity1.name.lower() in entity2.name.lower() or 
            entity2.name.lower() in entity1.name.lower()):
            return True
        
        # Check alias overlap
        all_names1 = {entity1.name.lower()} | {alias.lower() for alias in entity1.aliases}
        all_names2 = {entity2.name.lower()} | {alias.lower() for alias in entity2.aliases}
        
        if all_names1 & all_names2:  # If there's any overlap
            return True
        
        # Check Jaccard similarity of name parts
        if name1_parts and name2_parts:
            intersection = len(name1_parts & name2_parts)
            union = len(name1_parts | name2_parts)
            jaccard_similarity = intersection / union
            return jaccard_similarity >= threshold
        
        return False
    
    def _merge_entity_group(self, entities: List[Entity]) -> Entity:
        """Merge a group of similar entities into one"""
        # Use the longest name as the primary name
        primary_entity = max(entities, key=lambda e: len(e.name))
        
        # Collect all aliases
        all_aliases = set()
        for entity in entities:
            if entity.name != primary_entity.name:
                all_aliases.add(entity.name)
            all_aliases.update(entity.aliases)
        
        # Merge mentions and calculate new stats
        total_mentions = sum(entity.mention_count for entity in entities)
        avg_confidence = sum(entity.confidence_score for entity in entities) / len(entities)
        
        # Find first and last mentions
        first_mentioned = min(
            (entity.first_mentioned for entity in entities if entity.first_mentioned),
            key=lambda m: m.position,
            default=None
        )
        last_mentioned = max(
            (entity.last_mentioned for entity in entities if entity.last_mentioned),
            key=lambda m: m.position,
            default=None
        )
        
        # Create merged entity
        merged_entity = Entity(
            project_id=primary_entity.project_id,
            type=primary_entity.type,
            name=primary_entity.name,
            aliases=list(all_aliases),
            confidence_score=avg_confidence,
            mention_count=total_mentions,
            first_mentioned=first_mentioned,
            last_mentioned=last_mentioned,
            attributes=primary_entity.attributes.copy(),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        return merged_entity
    
    async def create_detailed_mentions(
        self,
        entities: List[Entity],
        text: str,
        file_id: str,
        project_id: str,
        scenes: Optional[List[Scene]] = None
    ) -> List[DetailedEntityMention]:
        """
        Create detailed mention records for entities with precise position tracking
        
        Args:
            entities: List of extracted entities
            text: The source text
            file_id: The file ID
            project_id: The project ID
            scenes: Optional list of scenes for linking mentions to scenes
            
        Returns:
            List of DetailedEntityMention objects
        """
        if not self.entity_mention_repository:
            logger.warning("EntityMentionRepository not provided, skipping detailed mention creation")
            return []
        
        detailed_mentions = []
        
        # Build scene lookup for fast position-to-scene mapping
        scene_map = []
        if scenes:
            scene_map = sorted(scenes, key=lambda s: s.start_char_pos)
        
        # Split text into lines for line number tracking
        lines = text.split('\n')
        line_positions = []
        char_pos = 0
        for i, line in enumerate(lines, start=1):
            line_positions.append((i, char_pos, char_pos + len(line)))
            char_pos += len(line) + 1  # +1 for newline
        
        # For each entity, find all mentions in the text
        for entity in entities:
            # Build search terms: entity name + aliases
            search_terms = [entity.name] + entity.aliases
            
            mention_index = 0
            for search_term in search_terms:
                # Use regex to find all occurrences (word boundaries)
                pattern = r'\b' + re.escape(search_term) + r'\b'
                matches = re.finditer(pattern, text, re.IGNORECASE)
                
                for match in matches:
                    mention_index += 1
                    start_pos = match.start()
                    end_pos = match.end()
                    mention_text = match.group()
                    
                    # Find line number
                    line_num = 1
                    paragraph_num = 1
                    for ln, lstart, lend in line_positions:
                        if lstart <= start_pos < lend:
                            line_num = ln
                            break
                    
                    # Rough paragraph estimation (count double newlines before this position)
                    paragraph_num = text[:start_pos].count('\n\n') + 1
                    
                    # Find scene ID
                    scene_id = None
                    if scene_map:
                        for scene in scene_map:
                            if scene.start_char_pos <= start_pos < scene.end_char_pos:
                                scene_id = scene.id
                                break
                    
                    # Extract context
                    context_size = 100
                    context_before = text[max(0, start_pos - context_size):start_pos]
                    context_after = text[end_pos:min(len(text), end_pos + context_size)]
                    
                    # Extract full sentence (simple heuristic)
                    sentence_start = text.rfind('.', max(0, start_pos - 200), start_pos) + 1
                    sentence_end = text.find('.', end_pos, min(len(text), end_pos + 200))
                    if sentence_end == -1:
                        sentence_end = min(len(text), end_pos + 200)
                    full_sentence = text[sentence_start:sentence_end].strip()
                    
                    # Determine if this is a direct mention (vs pronoun)
                    is_direct = mention_text[0].isupper() or search_term == entity.name
                    
                    # Create detailed mention
                    detailed_mention = DetailedEntityMention(
                        entity_id=entity.id,
                        project_id=project_id,
                        file_id=file_id,
                        start_char_pos=start_pos,
                        end_char_pos=end_pos,
                        line_number=line_num,
                        paragraph_number=paragraph_num,
                        scene_id=scene_id,
                        mention_text=mention_text,
                        mention_index=mention_index,
                        context_before=context_before,
                        context_after=context_after,
                        full_sentence=full_sentence if len(full_sentence) < 500 else None,
                        is_direct_mention=is_direct,
                        confidence=1.0,  # Can be refined later
                        created_at=datetime.utcnow()
                    )
                    
                    detailed_mentions.append(detailed_mention)
        
        logger.info(f"Created {len(detailed_mentions)} detailed mentions for {len(entities)} entities")
        return detailed_mentions