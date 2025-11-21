'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, BookOpen, Loader2, AlertCircle, CheckCircle2, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useFormValidation } from '@/hooks/useFormValidation';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (projectData: { name: string; description?: string }) => Promise<void>;
}

export default function CreateProjectModal({ 
  isOpen, 
  onClose, 
  onSubmit 
}: CreateProjectModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'network' | 'validation' | 'server' | 'unknown'>('unknown');
  const [success, setSuccess] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [autoCloseTimer, setAutoCloseTimer] = useState<NodeJS.Timeout | null>(null);

  // Form validation
  const { errors, validateField, validateForm, clearAllErrors } = useFormValidation({
    name: {
      required: true,
      minLength: 2,
      maxLength: 100,
      pattern: /^[a-zA-Z0-9\s\-_]+$/
    },
    description: {
      maxLength: 500
    }
  });

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Enhanced error categorization
  const categorizeError = useCallback((err: any): 'network' | 'validation' | 'server' | 'unknown' => {
    if (!navigator.onLine || err.code === 'NETWORK_ERROR' || err.message?.includes('Network Error')) {
      return 'network';
    }
    if (err.response?.status === 400 || err.response?.status === 422) {
      return 'validation';
    }
    if (err.response?.status >= 500) {
      return 'server';
    }
    return 'unknown';
  }, []);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({ name: '', description: '' });
      setError(null);
      setErrorType('unknown');
      setSuccess(false);
      setRetryCount(0);
      clearAllErrors();
      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
        setAutoCloseTimer(null);
      }
    }
  }, [isOpen, clearAllErrors, autoCloseTimer]);

  const submitWithRetry = useCallback(async (attempt = 0) => {
    const maxRetries = 2;
    const baseDelay = 1000; // 1 second

    try {
      setLoading(true);
      setError(null);
      setErrorType('unknown');
      
      if (attempt > 0) {
        // Exponential backoff: 1s, 2s
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      await onSubmit({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined
      });
      
      // Show success state
      setSuccess(true);
      setRetryCount(0);
      
      // Auto-close modal after success animation
      const timer = setTimeout(() => {
        handleClose();
      }, 2000);
      setAutoCloseTimer(timer);
      
    } catch (err: any) {
      console.error('Failed to create project:', err);
      const errorCategory = categorizeError(err);
      setErrorType(errorCategory);
      
      if (attempt < maxRetries && (errorCategory === 'network' || errorCategory === 'server')) {
        // Auto-retry for network and server errors
        setRetryCount(attempt + 1);
        setTimeout(() => submitWithRetry(attempt + 1), 100);
        return;
      }
      
      // Set final error message
      let errorMessage = 'Failed to create project';
      switch (errorCategory) {
        case 'network':
          errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
          break;
        case 'validation':
          errorMessage = err.response?.data?.message || 'Please check your input and try again.';
          break;
        case 'server':
          errorMessage = 'The server is currently experiencing issues. Please try again in a moment.';
          break;
        default:
          errorMessage = err.message || 'An unexpected error occurred while creating the project.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [formData, onSubmit, categorizeError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const isValid = validateForm(formData);
    if (!isValid) {
      return;
    }

    await submitWithRetry();
  };

  const handleRetry = () => {
    submitWithRetry();
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    validateField(field, value);
    if (error) setError(null);
  };

  const handleClose = () => {
    if (!loading) {
      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
        setAutoCloseTimer(null);
      }
      setFormData({ name: '', description: '' });
      setError(null);
      setErrorType('unknown');
      setSuccess(false);
      setRetryCount(0);
      clearAllErrors();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Enhanced Backdrop with blur */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-all duration-300 animate-fade-in"
        onClick={handleClose}
      />
      
      {/* Enhanced Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-card border border-border rounded-2xl shadow-xl max-w-md w-full animate-scale-in">
          {success ? (
            /* Enhanced Success State */
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-scale-in">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Project Created!</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Your project "{formData.name}" has been created successfully.
              </p>
              <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Redirecting to your projects...</span>
              </div>
            </div>
          ) : (
            <>
              {/* Enhanced Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      Create New Project
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Start your next writing adventure
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  disabled={loading}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Enhanced Form */}
              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-5">
                  <Input
                    label="Project Name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="My Amazing Story"
                    required
                    disabled={loading}
                    error={errors.name}
                    className="transition-all duration-200"
                  />

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Description <span className="text-muted-foreground">(Optional)</span>
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="A brief description of your project..."
                      rows={3}
                      disabled={loading}
                      className="w-full rounded-xl border border-input bg-background px-3 py-3 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none placeholder:text-muted-foreground"
                    />
                    {errors.description && (
                      <p className="mt-1 text-xs text-destructive">{errors.description}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formData.description.length}/500 characters
                    </p>
                  </div>
                </div>

                {/* Enhanced Error Display */}
                {error && (
                  <div className="mt-5 space-y-3">
                    <div className={`p-4 border rounded-xl flex items-start space-x-3 ${
                      errorType === 'network' 
                        ? 'bg-amber-50 border-amber-200' 
                        : 'bg-destructive/10 border-destructive/20'
                    }`}>
                      {errorType === 'network' ? (
                        <WifiOff className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          errorType === 'network' ? 'text-amber-800' : 'text-destructive'
                        }`}>
                          {errorType === 'network' ? 'Connection Problem' : 'Error creating project'}
                        </p>
                        <p className={`text-sm ${
                          errorType === 'network' ? 'text-amber-700' : 'text-destructive/80'
                        }`}>
                          {error}
                        </p>
                        {retryCount > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Retry attempt {retryCount} of 2
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Network status indicator */}
                    {errorType === 'network' && (
                      <div className="flex items-center justify-center">
                        <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg text-sm ${
                          isOnline 
                            ? 'bg-green-50 text-green-700' 
                            : 'bg-red-50 text-red-700'
                        }`}>
                          {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                          <span>{isOnline ? 'Connected' : 'Offline'}</span>
                        </div>
                      </div>
                    )}

                    {/* Retry button for certain error types */}
                    {(errorType === 'network' || errorType === 'server') && (
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={handleRetry}
                          disabled={loading}
                          className="flex items-center space-x-2 px-3 py-2 text-sm bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                          <span>Try Again</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Enhanced Action Buttons */}
                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={loading}
                    className="transition-all duration-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || Object.keys(errors).length > 0 || !formData.name.trim() || (!isOnline && errorType === 'network')}
                    className="transition-all duration-200 min-w-[120px]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {retryCount > 0 ? `Retrying... (${retryCount}/2)` : 'Creating...'}
                      </>
                    ) : (
                      'Create Project'
                    )}
                  </Button>
                </div>

                {/* Offline indicator */}
                {!isOnline && (
                  <div className="mt-3 text-center">
                    <p className="text-xs text-muted-foreground">
                      You're currently offline. Please check your connection.
                    </p>
                  </div>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}