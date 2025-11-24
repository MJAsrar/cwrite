// User types
export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  created_at: string;
  email_verified: boolean;
  settings?: UserSettings;
}

export interface UserSettings {
  theme: 'light' | 'dark';
  notifications: boolean;
  language: string;
}

export interface UserCredentials {
  email: string;
  password: string;
  confirmPassword?: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  token_type: string;
}

// Project types
export interface Project {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  file_count: number;
  entity_count: number;
  indexing_status: 'pending' | 'processing' | 'completed' | 'error';
  settings?: ProjectSettings;
  stats?: ProjectStats;
}

export interface ProjectSettings {
  indexing_enabled: boolean;
  entity_extraction_threshold: number;
  auto_reindex: boolean;
}

export interface ProjectStats {
  total_words: number;
  last_indexed?: string;
}

export interface ProjectCreate {
  name: string;
  description?: string;
  settings?: Partial<ProjectSettings>;
}

// File types
export interface ProjectFile {
  id: string;
  project_id: string;
  filename: string;
  original_filename: string;
  content_type: string;
  size: number;
  text_content?: string;
  upload_status: 'pending' | 'uploading' | 'completed' | 'error';
  processing_status: 'pending' | 'processing' | 'completed' | 'error';
  created_at: string;
  updated_at: string;
  metadata?: FileMetadata;
}

export interface FileMetadata {
  word_count: number;
  chapter_count: number;
  language: string;
}

// Entity types
export interface Entity {
  id: string;
  project_id: string;
  type: 'character' | 'location' | 'theme';
  name: string;
  description?: string;
  aliases: string[];
  confidence_score: number;
  mention_count: number;
  first_mentioned?: EntityMention;
  last_mentioned?: EntityMention;
  attributes?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface EntityMention {
  file_id: string;
  position: number;
  context: string;
}

// Relationship types
export interface Relationship {
  id: string;
  project_id: string;
  source_entity_id: string;
  target_entity_id: string;
  source_entity_name?: string;
  target_entity_name?: string;
  relationship_type: 'appears_with' | 'located_in' | 'related_to';
  strength?: number;
  description?: string;
  evidence?: string[];
  co_occurrence_count?: number;
  context_snippets?: string[];
  created_at: string;
  updated_at: string;
}

// Search types
export interface SearchQuery {
  text: string;
  filters: SearchFilters;
  limit?: number;
  offset?: number;
}

export interface SearchFilters {
  entity_types?: string[];
  date_range?: DateRange;
  projects?: string[];
}

export interface DateRange {
  start: string;
  end: string;
}

export interface SearchResult {
  id: string;
  type: 'document' | 'entity';
  title: string;
  content: string;
  relevance_score: number;
  highlights: string[];
  metadata: Record<string, any>;
}

export interface SearchResponse {
  results: SearchResult[];
  total_count: number;
  query_time_ms: number;
  query: string;
  suggestions: string[];
}

// API types
export interface ApiError {
  error: string;
  message: string;
  category?: 'network' | 'auth' | 'validation' | 'server' | 'unknown';
  status?: number;
  details?: Record<string, any>;
  timestamp: string;
  request_id: string;
}

export interface ValidationError {
  error: string;
  message: string;
  field_errors: Record<string, string[]>;
  timestamp: string;
  request_id: string;
}

// UI types
export interface Feature {
  id: string;
  title: string;
  description: string;
  icon: string;
  benefits: string[];
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  content: string;
  avatar?: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
  popular?: boolean;
}

export interface Activity {
  id: string;
  type: 'file_upload' | 'project_created' | 'search_performed' | 'entity_discovered';
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface SystemStatus {
  status: 'healthy' | 'degraded' | 'down';
  services: {
    database: 'healthy' | 'degraded' | 'down';
    redis: 'healthy' | 'degraded' | 'down';
    indexing: 'healthy' | 'degraded' | 'down';
  };
  last_updated: string;
}