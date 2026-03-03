"""
Style Profile Models

Data models for writer and character style profiles.
Supports advanced style adaptation and voice consistency.
"""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, validator
from datetime import datetime
from bson import ObjectId


class StyleFeatures(BaseModel):
    """Linguistic and stylistic features extracted from text"""
    
    # Sentence Structure
    avg_sentence_length: float = Field(ge=0, description="Average words per sentence")
    sentence_length_variance: float = Field(ge=0, description="Variance in sentence lengths")
    complex_sentence_ratio: float = Field(ge=0, le=1, description="Ratio of complex sentences")
    
    # Vocabulary & Language
    vocabulary_richness: float = Field(ge=0, description="Type-token ratio")
    formality_score: float = Field(ge=0, le=10, description="Formality level (0=casual, 10=formal)")
    readability_score: float = Field(ge=0, description="Flesch reading ease score")
    
    # Narrative Style
    descriptive_density: float = Field(ge=0, le=1, description="Ratio of descriptive to action text")
    dialogue_ratio: float = Field(ge=0, le=1, description="Percentage of text that is dialogue")
    emotional_intensity: float = Field(ge=0, le=10, description="Emotional language intensity")
    
    # Tense & Voice
    past_tense_ratio: float = Field(ge=0, le=1, description="Usage of past tense")
    present_tense_ratio: float = Field(ge=0, le=1, description="Usage of present tense")
    first_person_ratio: float = Field(ge=0, le=1, description="First person perspective usage")
    third_person_ratio: float = Field(ge=0, le=1, description="Third person perspective usage")
    
    # Punctuation & Style
    exclamation_frequency: float = Field(ge=0, description="Exclamation marks per 1000 words")
    question_frequency: float = Field(ge=0, description="Questions per 1000 words")
    ellipsis_frequency: float = Field(ge=0, description="Ellipsis usage per 1000 words")
    
    # Dialogue Specific (for character voices)
    contraction_usage: float = Field(ge=0, le=1, description="Usage of contractions")
    interruption_frequency: float = Field(ge=0, description="Interrupted speech patterns")
    tag_variety: float = Field(ge=0, description="Variety in dialogue tags")
    
    class Config:
        json_encoders = {ObjectId: str}


class WriterStyleProfile(BaseModel):
    """Complete style profile for a writer/author"""
    
    id: Optional[str] = Field(None, alias="_id")
    project_id: str = Field(..., description="Associated project ID")
    user_id: str = Field(..., description="Writer's user ID")
    
    # Profile Metadata
    profile_name: str = Field(..., description="Name for this style profile")
    description: Optional[str] = Field(None, description="Profile description")
    is_active: bool = Field(True, description="Whether this profile is currently active")
    
    # Style Features
    style_features: StyleFeatures = Field(..., description="Extracted linguistic features")
    
    # Genre & Context
    primary_genre: Optional[str] = Field(None, description="Primary writing genre")
    writing_context: Optional[str] = Field(None, description="Context (novel, short story, etc.)")
    target_audience: Optional[str] = Field(None, description="Intended audience")
    
    # Analysis Metadata
    sample_word_count: int = Field(ge=0, description="Words analyzed to create profile")
    confidence_score: float = Field(ge=0, le=1, description="Confidence in profile accuracy")
    last_analyzed: datetime = Field(default_factory=datetime.utcnow)
    
    # Style Examples
    representative_samples: List[str] = Field(default=[], description="Example text snippets")
    
    # Adaptation Settings
    adaptation_strength: float = Field(0.7, ge=0, le=1, description="How strongly to apply style")
    allow_style_evolution: bool = Field(True, description="Allow profile to evolve over time")
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    @validator('project_id', 'user_id')
    def validate_object_id(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError('Invalid ObjectId')
        return v
    
    class Config:
        allow_population_by_field_name = True
        json_encoders = {ObjectId: str}


class CharacterVoiceProfile(BaseModel):
    """Voice profile for a specific character"""
    
    id: Optional[str] = Field(None, alias="_id")
    project_id: str = Field(..., description="Associated project ID")
    entity_id: str = Field(..., description="Character entity ID")
    
    # Character Info
    character_name: str = Field(..., description="Character's name")
    character_role: Optional[str] = Field(None, description="Protagonist, antagonist, etc.")
    
    # Voice Features
    voice_features: StyleFeatures = Field(..., description="Character's speech patterns")
    
    # Character-Specific Attributes
    education_level: Optional[str] = Field(None, description="Character's education background")
    social_class: Optional[str] = Field(None, description="Socioeconomic background")
    regional_background: Optional[str] = Field(None, description="Geographic/cultural origin")
    age_group: Optional[str] = Field(None, description="Age category")
    personality_traits: List[str] = Field(default=[], description="Key personality traits")
    
    # Speech Patterns
    signature_phrases: List[str] = Field(default=[], description="Character's catchphrases")
    vocabulary_quirks: List[str] = Field(default=[], description="Unique word choices")
    speech_impediments: List[str] = Field(default=[], description="Speech patterns or impediments")
    
    # Contextual Variations
    formal_speech_sample: Optional[str] = Field(None, description="How they speak formally")
    casual_speech_sample: Optional[str] = Field(None, description="How they speak casually")
    emotional_speech_samples: Dict[str, str] = Field(default={}, description="Speech when emotional")
    
    # Analysis Metadata
    dialogue_sample_count: int = Field(ge=0, description="Number of dialogue samples analyzed")
    confidence_score: float = Field(ge=0, le=1, description="Confidence in voice accuracy")
    last_analyzed: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationship Context
    speech_variations: Dict[str, str] = Field(default={}, description="How they speak to different characters")
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    @validator('project_id', 'entity_id')
    def validate_object_id(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError('Invalid ObjectId')
        return v
    
    class Config:
        allow_population_by_field_name = True
        json_encoders = {ObjectId: str}


class StyleAdaptationRequest(BaseModel):
    """Request for style-adapted content generation"""
    
    content_type: str = Field(..., description="narrative, dialogue, description, etc.")
    base_text: str = Field(..., description="Text to adapt or continue from")
    
    # Style Context
    writer_profile_id: Optional[str] = Field(None, description="Writer style to emulate")
    character_profile_id: Optional[str] = Field(None, description="Character voice to use")
    
    # Generation Context
    scene_context: Optional[str] = Field(None, description="Current scene context")
    emotional_context: Optional[str] = Field(None, description="Emotional tone")
    relationship_context: Optional[str] = Field(None, description="Character relationships")
    
    # Adaptation Settings
    adaptation_strength: float = Field(0.7, ge=0, le=1, description="How strongly to apply style")
    creativity_level: float = Field(0.7, ge=0, le=1, description="Balance between style and creativity")
    
    # Generation Parameters
    max_length: int = Field(200, ge=1, le=2000, description="Maximum words to generate")
    temperature: float = Field(0.7, ge=0, le=2, description="Generation randomness")
    
    class Config:
        json_encoders = {ObjectId: str}


class StyleAdaptationResponse(BaseModel):
    """Response from style adaptation service"""
    
    adapted_content: str = Field(..., description="Generated content with style adaptation")
    
    # Quality Metrics
    style_consistency_score: float = Field(ge=0, le=1, description="How well it matches the style")
    confidence_score: float = Field(ge=0, le=1, description="Generation confidence")
    
    # Applied Profiles
    writer_profile_used: Optional[str] = Field(None, description="Writer profile ID used")
    character_profile_used: Optional[str] = Field(None, description="Character profile ID used")
    
    # Adaptation Details
    features_applied: List[str] = Field(default=[], description="Style features that were applied")
    adaptation_notes: Optional[str] = Field(None, description="Notes about the adaptation")
    
    # Alternative Options
    alternative_versions: List[str] = Field(default=[], description="Other style variations")
    
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_encoders = {ObjectId: str}


class StyleAnalysisRequest(BaseModel):
    """Request for analyzing text to extract style features"""
    
    text_content: str = Field(..., description="Text to analyze")
    analysis_type: str = Field(..., description="writer_style, character_voice, or mixed")
    
    # Context
    project_id: str = Field(..., description="Project context")
    character_name: Optional[str] = Field(None, description="Character name if analyzing dialogue")
    
    # Analysis Options
    include_examples: bool = Field(True, description="Extract representative examples")
    minimum_confidence: float = Field(0.5, ge=0, le=1, description="Minimum confidence threshold")
    
    class Config:
        json_encoders = {ObjectId: str}