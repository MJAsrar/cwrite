'use client';

import React from 'react';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useTheme } from '@/contexts/ThemeContext';

interface AccessibilitySettingsProps {
  className?: string;
}

export default function AccessibilitySettings({ className = '' }: AccessibilitySettingsProps) {
  const { settings, updateSettings } = useAccessibility();
  const { theme, setTheme } = useTheme();

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-4">
          Accessibility Settings
        </h3>
        
        <div className="space-y-4">
          {/* Theme Selection */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              Theme Preference
            </label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as any)}
              className="input-field"
              aria-describedby="theme-help"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
            <p id="theme-help" className="mt-1 text-sm text-secondary-600 dark:text-secondary-400">
              Choose your preferred color scheme
            </p>
          </div>

          {/* Font Size */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              Font Size
            </label>
            <select
              value={settings.fontSize}
              onChange={(e) => updateSettings({ fontSize: e.target.value as any })}
              className="input-field"
              aria-describedby="font-size-help"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
            <p id="font-size-help" className="mt-1 text-sm text-secondary-600 dark:text-secondary-400">
              Adjust text size for better readability
            </p>
          </div>

          {/* Reduced Motion */}
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="reduced-motion"
                type="checkbox"
                checked={settings.reducedMotion}
                onChange={(e) => updateSettings({ reducedMotion: e.target.checked })}
                className="w-4 h-4 text-primary-600 bg-white border-secondary-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-secondary-800 focus:ring-2 dark:bg-secondary-700 dark:border-secondary-600"
                aria-describedby="reduced-motion-help"
              />
            </div>
            <div className="ml-3">
              <label htmlFor="reduced-motion" className="text-sm font-medium text-secondary-700 dark:text-secondary-300">
                Reduce Motion
              </label>
              <p id="reduced-motion-help" className="text-sm text-secondary-600 dark:text-secondary-400">
                Minimize animations and transitions
              </p>
            </div>
          </div>

          {/* High Contrast */}
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="high-contrast"
                type="checkbox"
                checked={settings.highContrast}
                onChange={(e) => updateSettings({ highContrast: e.target.checked })}
                className="w-4 h-4 text-primary-600 bg-white border-secondary-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-secondary-800 focus:ring-2 dark:bg-secondary-700 dark:border-secondary-600"
                aria-describedby="high-contrast-help"
              />
            </div>
            <div className="ml-3">
              <label htmlFor="high-contrast" className="text-sm font-medium text-secondary-700 dark:text-secondary-300">
                High Contrast
              </label>
              <p id="high-contrast-help" className="text-sm text-secondary-600 dark:text-secondary-400">
                Increase contrast for better visibility
              </p>
            </div>
          </div>

          {/* Screen Reader Optimization */}
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="screen-reader"
                type="checkbox"
                checked={settings.screenReaderOptimized}
                onChange={(e) => updateSettings({ screenReaderOptimized: e.target.checked })}
                className="w-4 h-4 text-primary-600 bg-white border-secondary-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-secondary-800 focus:ring-2 dark:bg-secondary-700 dark:border-secondary-600"
                aria-describedby="screen-reader-help"
              />
            </div>
            <div className="ml-3">
              <label htmlFor="screen-reader" className="text-sm font-medium text-secondary-700 dark:text-secondary-300">
                Screen Reader Optimization
              </label>
              <p id="screen-reader-help" className="text-sm text-secondary-600 dark:text-secondary-400">
                Optimize interface for screen readers
              </p>
            </div>
          </div>

          {/* Keyboard Navigation */}
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="keyboard-nav"
                type="checkbox"
                checked={settings.keyboardNavigation}
                onChange={(e) => updateSettings({ keyboardNavigation: e.target.checked })}
                className="w-4 h-4 text-primary-600 bg-white border-secondary-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-secondary-800 focus:ring-2 dark:bg-secondary-700 dark:border-secondary-600"
                aria-describedby="keyboard-nav-help"
              />
            </div>
            <div className="ml-3">
              <label htmlFor="keyboard-nav" className="text-sm font-medium text-secondary-700 dark:text-secondary-300">
                Enhanced Keyboard Navigation
              </label>
              <p id="keyboard-nav-help" className="text-sm text-secondary-600 dark:text-secondary-400">
                Show enhanced focus indicators and keyboard shortcuts
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="border-t border-secondary-200 dark:border-secondary-700 pt-6">
        <h4 className="text-md font-medium text-secondary-900 dark:text-secondary-100 mb-3">
          Keyboard Shortcuts
        </h4>
        <div className="space-y-2 text-sm text-secondary-600 dark:text-secondary-400">
          <div className="flex justify-between">
            <span>Navigate between elements</span>
            <kbd className="px-2 py-1 bg-secondary-100 dark:bg-secondary-700 rounded text-xs">Tab</kbd>
          </div>
          <div className="flex justify-between">
            <span>Navigate backwards</span>
            <kbd className="px-2 py-1 bg-secondary-100 dark:bg-secondary-700 rounded text-xs">Shift + Tab</kbd>
          </div>
          <div className="flex justify-between">
            <span>Activate button/link</span>
            <kbd className="px-2 py-1 bg-secondary-100 dark:bg-secondary-700 rounded text-xs">Enter</kbd>
          </div>
          <div className="flex justify-between">
            <span>Close modal/menu</span>
            <kbd className="px-2 py-1 bg-secondary-100 dark:bg-secondary-700 rounded text-xs">Escape</kbd>
          </div>
          <div className="flex justify-between">
            <span>Navigate lists</span>
            <kbd className="px-2 py-1 bg-secondary-100 dark:bg-secondary-700 rounded text-xs">↑ ↓</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}