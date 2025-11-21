'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface MobileLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  sidebarWidth?: 'sm' | 'md' | 'lg';
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

const sidebarWidths = {
  sm: 'w-64',
  md: 'w-72',
  lg: 'w-80',
};

export default function MobileLayout({
  children,
  sidebar,
  header,
  footer,
  className = '',
  sidebarWidth = 'md',
  collapsible = true,
  defaultCollapsed = false,
}: MobileLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(!defaultCollapsed);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  return (
    <div className={cn('flex h-screen bg-surface', className)}>
      {/* Mobile sidebar backdrop */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      {sidebar && (
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex flex-col bg-surface-elevated border-r border-default transition-transform duration-300 ease-in-out md:relative md:translate-x-0',
            sidebarWidths[sidebarWidth],
            isMobile
              ? sidebarOpen
                ? 'translate-x-0'
                : '-translate-x-full'
              : sidebarOpen
              ? 'translate-x-0'
              : collapsible
              ? '-translate-x-full'
              : 'translate-x-0'
          )}
        >
          {sidebar}
        </aside>
      )}

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        {header && (
          <header className="flex-shrink-0 bg-surface-elevated border-b border-default">
            {header}
          </header>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>

        {/* Footer */}
        {footer && (
          <footer className="flex-shrink-0 bg-surface-elevated border-t border-default">
            {footer}
          </footer>
        )}
      </div>

      {/* Sidebar toggle for mobile */}
      {sidebar && collapsible && (
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={cn(
            'fixed bottom-4 left-4 z-50 rounded-full bg-primary-600 p-3 text-white shadow-lg transition-all duration-200 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
            isMobile ? 'block' : 'hidden'
          )}
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {sidebarOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      )}
    </div>
  );
}