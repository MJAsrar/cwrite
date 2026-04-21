'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { themes, type ThemeConfig, type ThemeName } from '@/lib/theme-config';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: ThemeName;
  themeConfig: ThemeConfig;
  isTransitioning: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  enableTransitions?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = 'light',
  storageKey = 'cowrite-theme',
  enableTransitions = true,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ThemeName>('light');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Get current theme configuration
  const themeConfig = themes[resolvedTheme];

  useEffect(() => {
    setMounted(true);
    // Load theme from localStorage on mount
    const savedTheme = localStorage.getItem(storageKey) as Theme | null;
    if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
      setThemeState(savedTheme);
      return;
    }

    setThemeState(defaultTheme);
    localStorage.setItem(storageKey, defaultTheme);
  }, [storageKey]);

  const applyThemeToDocument = useCallback((resolved: ThemeName) => {
    const root = document.documentElement;
    const config = themes[resolved];
    
    // Apply CSS custom properties
    Object.entries(config.colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value);
    });
    
    // Apply theme class
    root.classList.remove('light', 'dark');
    root.classList.add(resolved);
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const bgColors: Record<ThemeName, string> = {
        light: 'oklch(0.96 0.01 85)',
        dark: 'oklch(0.145 0 0)',
      };
      const bgColor = bgColors[resolved];
      metaThemeColor.setAttribute('content', bgColor);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const updateResolvedTheme = () => {
      const resolved: ThemeName = theme === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : theme;
      
      // Handle smooth transitions
      if (enableTransitions && resolvedTheme !== resolved) {
        setIsTransitioning(true);
        
        // Add transition class
        document.documentElement.classList.add('theme-transitioning');
        
        setTimeout(() => {
          setResolvedTheme(resolved);
          applyThemeToDocument(resolved);
          
          setTimeout(() => {
            setIsTransitioning(false);
            document.documentElement.classList.remove('theme-transitioning');
          }, 300);
        }, 50);
      } else {
        setResolvedTheme(resolved);
        applyThemeToDocument(resolved);
      }
    };

    updateResolvedTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        updateResolvedTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, mounted, enableTransitions, resolvedTheme, applyThemeToDocument]);

  const setTheme = useCallback((newTheme: Theme) => {
    const normalizedTheme: Theme =
      newTheme === 'light' || newTheme === 'dark' || newTheme === 'system'
        ? newTheme
        : 'light';
    setThemeState(normalizedTheme);
    localStorage.setItem(storageKey, normalizedTheme);
  }, [storageKey]);

  const toggleTheme = useCallback(() => {
    const order: Theme[] = ['light', 'dark', 'system'];
    const currentIndex = order.indexOf(theme);
    const next = order[(currentIndex + 1) % order.length];
    setTheme(next);
  }, [setTheme]);

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider 
      value={{ 
        theme, 
        setTheme, 
        resolvedTheme, 
        themeConfig,
        isTransitioning,
        toggleTheme
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}