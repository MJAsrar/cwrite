'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, Clock, Sparkles, AlertCircle } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  suggestions: string[];
  searchHistory: string[];
  placeholder?: string;
  loading?: boolean;
  onClearHistory?: () => void;
  onSuggestionsFetch?: (query: string) => void;
  debounceMs?: number;
  maxSuggestions?: number;
  maxHistory?: number;
  validateQuery?: (query: string) => string | null;
}

export default function SearchInput({
  value,
  onChange,
  onSearch,
  suggestions,
  searchHistory,
  placeholder = "Search your content using natural language...",
  loading = false,
  onClearHistory,
  onSuggestionsFetch,
  debounceMs = 500,
  maxSuggestions = 5,
  maxHistory = 10,
  validateQuery
}: SearchInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced suggestions fetch
  const debouncedFetchSuggestions = useCallback((query: string) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      if (query.length > 2 && onSuggestionsFetch) {
        onSuggestionsFetch(query);
      }
      setIsTyping(false);
    }, debounceMs);
  }, [debounceMs, onSuggestionsFetch]);

  // Query validation
  const validateInput = useCallback((query: string): string | null => {
    if (!validateQuery) return null;
    
    // Basic validation rules
    if (query.length > 500) {
      return 'Search query is too long (max 500 characters)';
    }
    
    if (query.trim().length === 0 && query.length > 0) {
      return 'Search query cannot be empty';
    }

    // Custom validation
    return validateQuery(query);
  }, [validateQuery]);

  // Combine suggestions and history with limits
  const limitedSuggestions = suggestions.slice(0, maxSuggestions);
  const limitedHistory = searchHistory.slice(0, maxHistory);
  
  const allSuggestions = [
    ...limitedSuggestions.map(s => ({ text: s, type: 'suggestion' as const })),
    ...limitedHistory.map(h => ({ text: h, type: 'history' as const }))
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // Validate input
    const error = validateInput(newValue);
    setValidationError(error);
    
    onChange(newValue);
    setSelectedIndex(-1);
    setIsTyping(true);
    
    // Show suggestions if there's content or history
    setShowSuggestions(newValue.length > 0 || limitedHistory.length > 0);
    
    // Debounced suggestions fetch
    if (newValue.length > 2) {
      debouncedFetchSuggestions(newValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < allSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > -1 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          const selectedSuggestion = allSuggestions[selectedIndex];
          onChange(selectedSuggestion.text);
          onSearch(selectedSuggestion.text);
        } else if (value.trim()) {
          onSearch(value.trim());
        }
        setShowSuggestions(false);
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    onSearch(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedValue = value.trim();
    const error = validateInput(trimmedValue);
    
    if (error) {
      setValidationError(error);
      return;
    }
    
    if (trimmedValue) {
      onSearch(trimmedValue);
      setShowSuggestions(false);
      setValidationError(null);
    }
  };

  const clearInput = () => {
    onChange('');
    setShowSuggestions(false);
    setValidationError(null);
    setIsTyping(false);
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    inputRef.current?.focus();
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" />
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(value.length > 0 || limitedHistory.length > 0)}
            placeholder={placeholder}
            className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-secondary-900 placeholder-secondary-500 transition-colors ${
              validationError 
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                : 'border-secondary-300'
            }`}
            disabled={loading}
          />
          {value && (
            <button
              type="button"
              onClick={clearInput}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-secondary-400 hover:text-secondary-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {(loading || isTyping) && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-500 border-t-transparent"></div>
            </div>
          )}
          
          {validationError && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <AlertCircle className="w-4 h-4 text-red-500" />
            </div>
          )}
        </div>
      </form>

      {/* Validation Error */}
      {validationError && (
        <div className="mt-2 flex items-center space-x-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Suggestions Dropdown */}
      {showSuggestions && allSuggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-secondary-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
        >
          {limitedSuggestions.length > 0 && (
            <div className="p-2 border-b border-secondary-100">
              <div className="flex items-center space-x-2 px-2 py-1 text-xs font-medium text-secondary-600 uppercase tracking-wide">
                <Sparkles className="w-3 h-3" />
                <span>Suggestions</span>
              </div>
              {limitedSuggestions.map((suggestion, index) => (
                <button
                  key={`suggestion-${index}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedIndex === index
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-secondary-700 hover:bg-secondary-50'
                  }`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {limitedHistory.length > 0 && (
            <div className="p-2">
              <div className="flex items-center justify-between px-2 py-1 mb-1">
                <div className="flex items-center space-x-2 text-xs font-medium text-secondary-600 uppercase tracking-wide">
                  <Clock className="w-3 h-3" />
                  <span>Recent Searches</span>
                </div>
                {onClearHistory && (
                  <button
                    onClick={onClearHistory}
                    className="text-xs text-secondary-500 hover:text-secondary-700 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              {limitedHistory.map((historyItem, index) => (
                <button
                  key={`history-${index}`}
                  onClick={() => handleSuggestionClick(historyItem)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedIndex === limitedSuggestions.length + index
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-secondary-600 hover:bg-secondary-50'
                  }`}
                >
                  {historyItem}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}