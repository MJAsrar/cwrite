'use client';

import * as React from 'react';
import { AlertCircle, RefreshCw, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export interface ErrorDisplayProps {
  error?: string | Error | null;
  type?: 'error' | 'warning' | 'info' | 'success';
  title?: string;
  retry?: () => void;
  retryText?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const icons = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle,
};

const styles = {
  error: {
    container: 'bg-destructive/10 border-destructive/20 text-destructive',
    icon: 'text-destructive',
  },
  warning: {
    container: 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-300',
    icon: 'text-orange-500',
  },
  info: {
    container: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300',
    icon: 'text-blue-500',
  },
  success: {
    container: 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300',
    icon: 'text-green-500',
  },
};

const sizes = {
  sm: {
    container: 'px-3 py-2 text-xs',
    icon: 'h-3 w-3',
    title: 'text-xs font-medium',
    message: 'text-xs',
  },
  md: {
    container: 'px-4 py-3 text-sm',
    icon: 'h-4 w-4',
    title: 'text-sm font-medium',
    message: 'text-sm',
  },
  lg: {
    container: 'px-6 py-4 text-base',
    icon: 'h-5 w-5',
    title: 'text-base font-medium',
    message: 'text-base',
  },
};

export function ErrorDisplay({
  error,
  type = 'error',
  title,
  retry,
  retryText = 'Try Again',
  className,
  size = 'md',
  showIcon = true,
  dismissible = false,
  onDismiss,
}: ErrorDisplayProps) {
  if (!error) return null;

  const Icon = icons[type];
  const errorMessage = typeof error === 'string' ? error : error.message;
  const style = styles[type];
  const sizeStyle = sizes[size];

  return (
    <div
      className={cn(
        'border rounded-xl flex items-start gap-3 animate-fade-in',
        style.container,
        sizeStyle.container,
        className
      )}
      role="alert"
      aria-live="polite"
    >
      {showIcon && (
        <Icon className={cn('flex-shrink-0 mt-0.5', style.icon, sizeStyle.icon)} />
      )}
      
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className={cn('mb-1', sizeStyle.title)}>
            {title}
          </h4>
        )}
        <p className={cn('leading-relaxed', sizeStyle.message)}>
          {errorMessage}
        </p>
        
        {retry && (
          <div className="mt-3">
            <Button
              onClick={retry}
              variant="outline"
              size={size === 'lg' ? 'default' : 'sm'}
              className="h-auto py-1.5 px-3 text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1.5" />
              {retryText}
            </Button>
          </div>
        )}
      </div>
      
      {dismissible && onDismiss && (
        <button
          onClick={onDismiss}
          className={cn(
            'flex-shrink-0 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors',
            style.icon
          )}
          aria-label="Dismiss"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default ErrorDisplay;