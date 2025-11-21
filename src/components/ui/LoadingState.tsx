'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showSpinner?: boolean;
  fullScreen?: boolean;
}

const sizes = {
  sm: {
    spinner: 'h-4 w-4',
    text: 'text-xs',
    container: 'py-4',
  },
  md: {
    spinner: 'h-6 w-6',
    text: 'text-sm',
    container: 'py-8',
  },
  lg: {
    spinner: 'h-8 w-8',
    text: 'text-base',
    container: 'py-12',
  },
};

export function LoadingState({
  message = 'Loading...',
  size = 'md',
  className,
  showSpinner = true,
  fullScreen = false,
}: LoadingStateProps) {
  const sizeStyle = sizes[size];

  const content = (
    <div className={cn(
      'flex flex-col items-center justify-center text-center',
      sizeStyle.container,
      className
    )}>
      {showSpinner && (
        <Loader2 
          className={cn(
            'animate-spin text-muted-foreground mb-3',
            sizeStyle.spinner
          )} 
        />
      )}
      <p className={cn('text-muted-foreground', sizeStyle.text)}>
        {message}
      </p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn(
      'bg-card border border-border rounded-2xl p-6 animate-pulse',
      className
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className="h-12 w-12 rounded-xl bg-muted" />
        <div className="h-8 w-8 rounded bg-muted" />
      </div>
      <div className="h-6 bg-muted rounded mb-2" />
      <div className="h-4 bg-muted rounded mb-4 w-3/4" />
      <div className="flex justify-between pt-4 border-t border-border">
        <div className="h-3 bg-muted rounded w-20" />
        <div className="h-3 bg-muted rounded w-16" />
      </div>
    </div>
  );
}

export function SkeletonText({ 
  lines = 3, 
  className 
}: { 
  lines?: number; 
  className?: string; 
}) {
  return (
    <div className={cn('space-y-2 animate-pulse', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-4 bg-muted rounded',
            i === lines - 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  );
}

export default LoadingState;