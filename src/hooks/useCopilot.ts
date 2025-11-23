import { useState, useCallback, useRef } from 'react';
import { api } from '@/lib/api';

interface CopilotSuggestion {
  suggestion: string;
  context_used?: {
    characters?: string[];
    location?: string;
    recent_events?: string;
  };
  confidence?: number;
}

interface UseCopilotOptions {
  projectId: string;
  fileId?: string;
  onSuggestionAccepted?: (suggestion: string) => void;
  onSuggestionRejected?: (suggestion: string) => void;
}

export function useCopilot({
  projectId,
  fileId,
  onSuggestionAccepted,
  onSuggestionRejected
}: UseCopilotOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentSuggestion, setCurrentSuggestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const getSuggestion = useCallback(async (
    textBefore: string,
    textAfter: string,
    cursorPosition: number
  ): Promise<string | null> => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setIsLoading(true);
    setError(null);

    try {
      abortControllerRef.current = new AbortController();

      const response = await api.post<CopilotSuggestion>('/api/v1/copilot/suggest', {
        project_id: projectId,
        file_id: fileId || null,
        text_before: textBefore,
        text_after: textAfter,
        cursor_position: cursorPosition,
        suggestion_type: 'continue',
        max_tokens: 100
      });

      const suggestion = response.suggestion;
      setCurrentSuggestion(suggestion);
      return suggestion;

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Copilot error:', err);
        console.error('Error details:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status
        });
        setError(err.message || 'Failed to get suggestion');
      }
      return null;
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [projectId, fileId]);

  const acceptSuggestion = useCallback(async () => {
    if (currentSuggestion) {
      // Track acceptance (fire and forget, don't block on errors)
      api.post('/api/v1/copilot/accept', {
        project_id: projectId,
        suggestion: currentSuggestion
      }).catch(err => {
        // Silently fail - tracking is not critical
        console.debug('Failed to track acceptance:', err);
      });
      
      onSuggestionAccepted?.(currentSuggestion);
      setCurrentSuggestion(null);
    }
  }, [currentSuggestion, projectId, onSuggestionAccepted]);

  const rejectSuggestion = useCallback(async () => {
    if (currentSuggestion) {
      // Track rejection (fire and forget, don't block on errors)
      api.post('/api/v1/copilot/reject', {
        project_id: projectId,
        suggestion: currentSuggestion
      }).catch(err => {
        // Silently fail - tracking is not critical
        console.debug('Failed to track rejection:', err);
      });
      
      onSuggestionRejected?.(currentSuggestion);
      setCurrentSuggestion(null);
    }
  }, [currentSuggestion, projectId, onSuggestionRejected]);

  const clearSuggestion = useCallback(() => {
    setCurrentSuggestion(null);
    setError(null);
  }, []);

  return {
    getSuggestion,
    acceptSuggestion,
    rejectSuggestion,
    clearSuggestion,
    currentSuggestion,
    isLoading,
    error
  };
}
