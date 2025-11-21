'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon, Monitor, Loader2 } from 'lucide-react';

interface ThemeToggleProps {
  variant?: 'button' | 'dropdown';
  className?: string;
}

export default function ThemeToggle({ variant = 'button', className = '' }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme, isTransitioning, toggleTheme } = useTheme();

  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`}>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as any)}
          disabled={isTransitioning}
          className="appearance-none bg-card border border-input rounded-xl px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-colors disabled:opacity-50"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          {isTransitioning ? (
            <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
          ) : (
            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </div>
    );
  }

  const getIcon = () => {
    if (isTransitioning) {
      return <Loader2 className="w-5 h-5 animate-spin" />;
    }
    
    switch (theme) {
      case 'light':
        return <Sun className="w-5 h-5" />;
      case 'dark':
        return <Moon className="w-5 h-5" />;
      case 'system':
        return <Monitor className="w-5 h-5" />;
    }
  };

  const getLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light mode';
      case 'dark':
        return 'Dark mode';
      case 'system':
        return 'System theme';
    }
  };

  return (
    <button
      onClick={toggleTheme}
      disabled={isTransitioning}
      className={`
        inline-flex items-center justify-center p-2 rounded-xl
        bg-card border border-input
        text-foreground
        hover:bg-accent hover:text-accent-foreground
        focus:outline-none focus:ring-1 focus:ring-ring
        transition-all-smooth
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      title={getLabel()}
      aria-label={getLabel()}
    >
      {getIcon()}
    </button>
  );
}