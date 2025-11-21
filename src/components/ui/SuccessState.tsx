'use client';

import * as React from 'react';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export interface SuccessStateProps {
  title?: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  autoHide?: boolean;
  autoHideDelay?: number;
  onAutoHide?: () => void;
}

const sizes = {
  sm: {
    container: 'px-3 py-2',
    icon: 'h-4 w-4',
    title: 'text-sm font-medium',
    message: 'text-xs',
  },
  md: {
    container: 'px-4 py-3',
    icon: 'h-5 w-5',
    title: 'text-base font-medium',
    message: 'text-sm',
  },
  lg: {
    container: 'px-6 py-4',
    icon: 'h-6 w-6',
    title: 'text-lg font-medium',
    message: 'text-base',
  },
};

export function SuccessState({
  title,
  message,
  action,
  className,
  size = 'md',
  showIcon = true,
  autoHide = false,
  autoHideDelay = 5000,
  onAutoHide,
}: SuccessStateProps) {
  const [isVisible, setIsVisible] = React.useState(true);
  const sizeStyle = sizes[size];

  React.useEffect(() => {
    if (autoHide && autoHideDelay > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onAutoHide?.();
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, autoHideDelay, onAutoHide]);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'bg-green-50 border border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300 rounded-xl flex items-start gap-3 animate-fade-in',
        sizeStyle.container,
        className
      )}
      role="status"
      aria-live="polite"
    >
      {showIcon && (
        <CheckCircle className={cn('flex-shrink-0 text-green-500 mt-0.5', sizeStyle.icon)} />
      )}
      
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className={cn('mb-1', sizeStyle.title)}>
            {title}
          </h4>
        )}
        <p className={cn('leading-relaxed', sizeStyle.message)}>
          {message}
        </p>
        
        {action && (
          <div className="mt-3">
            <Button
              onClick={action.onClick}
              variant="outline"
              size={size === 'lg' ? 'default' : 'sm'}
              className="h-auto py-1.5 px-3 text-xs border-green-300 text-green-700 hover:bg-green-100 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-900/30"
            >
              {action.label}
              <ArrowRight className="h-3 w-3 ml-1.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SuccessState;