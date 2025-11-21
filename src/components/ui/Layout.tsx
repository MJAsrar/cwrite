'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

// Container component with responsive sizing
interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  centered?: boolean;
}

export function Container({ 
  size = 'lg', 
  centered = true, 
  className, 
  children, 
  ...props 
}: ContainerProps) {
  return (
    <div
      className={cn(
        "w-full px-4 sm:px-6 lg:px-8",
        {
          'max-w-2xl': size === 'sm',
          'max-w-4xl': size === 'md',
          'max-w-6xl': size === 'lg',
          'max-w-7xl': size === 'xl',
          'max-w-none': size === 'full',
        },
        centered && "mx-auto",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Grid component with responsive columns
interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: 1 | 2 | 3 | 4 | 5 | 6;
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  responsive?: boolean;
}

export function Grid({ 
  cols = 1, 
  gap = 'md', 
  responsive = true, 
  className, 
  children, 
  ...props 
}: GridProps) {
  return (
    <div
      className={cn(
        "grid",
        {
          'grid-cols-1': cols === 1,
          'grid-cols-1 sm:grid-cols-2': cols === 2 && responsive,
          'grid-cols-2': cols === 2 && !responsive,
          'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3': cols === 3 && responsive,
          'grid-cols-3': cols === 3 && !responsive,
          'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4': cols === 4 && responsive,
          'grid-cols-4': cols === 4 && !responsive,
          'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5': cols === 5 && responsive,
          'grid-cols-5': cols === 5 && !responsive,
          'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6': cols === 6 && responsive,
          'grid-cols-6': cols === 6 && !responsive,
        },
        {
          'gap-2': gap === 'sm',
          'gap-4': gap === 'md',
          'gap-6': gap === 'lg',
          'gap-8': gap === 'xl',
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Flex component with common patterns
interface FlexProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'row' | 'col';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  wrap?: boolean;
}

export function Flex({ 
  direction = 'row', 
  align = 'start', 
  justify = 'start', 
  gap = 'md', 
  wrap = false,
  className, 
  children, 
  ...props 
}: FlexProps) {
  return (
    <div
      className={cn(
        "flex",
        {
          'flex-row': direction === 'row',
          'flex-col': direction === 'col',
        },
        {
          'items-start': align === 'start',
          'items-center': align === 'center',
          'items-end': align === 'end',
          'items-stretch': align === 'stretch',
        },
        {
          'justify-start': justify === 'start',
          'justify-center': justify === 'center',
          'justify-end': justify === 'end',
          'justify-between': justify === 'between',
          'justify-around': justify === 'around',
          'justify-evenly': justify === 'evenly',
        },
        {
          'gap-2': gap === 'sm',
          'gap-4': gap === 'md',
          'gap-6': gap === 'lg',
          'gap-8': gap === 'xl',
        },
        wrap && 'flex-wrap',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Stack component for vertical layouts
interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: 'sm' | 'md' | 'lg' | 'xl';
  align?: 'start' | 'center' | 'end' | 'stretch';
}

export function Stack({ 
  spacing = 'md', 
  align = 'stretch', 
  className, 
  children, 
  ...props 
}: StackProps) {
  return (
    <div
      className={cn(
        "flex flex-col",
        {
          'space-y-2': spacing === 'sm',
          'space-y-4': spacing === 'md',
          'space-y-6': spacing === 'lg',
          'space-y-8': spacing === 'xl',
        },
        {
          'items-start': align === 'start',
          'items-center': align === 'center',
          'items-end': align === 'end',
          'items-stretch': align === 'stretch',
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Section component for page sections
interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  background?: 'default' | 'muted' | 'card';
}

export function Section({ 
  size = 'lg', 
  background = 'default', 
  className, 
  children, 
  ...props 
}: SectionProps) {
  return (
    <section
      className={cn(
        {
          'py-8': size === 'sm',
          'py-12': size === 'md',
          'py-16': size === 'lg',
          'py-20': size === 'xl',
        },
        {
          'bg-background': background === 'default',
          'bg-muted/30': background === 'muted',
          'bg-card': background === 'card',
        },
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}

// Sidebar layout component
interface SidebarLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  sidebarWidth?: 'sm' | 'md' | 'lg';
  collapsible?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
  className?: string;
}

export function SidebarLayout({
  sidebar,
  children,
  sidebarWidth = 'md',
  collapsible = false,
  collapsed = false,
  onToggle,
  className,
}: SidebarLayoutProps) {
  return (
    <div className={cn("flex h-full overflow-hidden", className)}>
      <aside
        className={cn(
          "border-r border-border bg-card/50 transition-all duration-300",
          {
            'w-64': sidebarWidth === 'sm' && !collapsed,
            'w-80': sidebarWidth === 'md' && !collapsed,
            'w-96': sidebarWidth === 'lg' && !collapsed,
            'w-16': collapsed,
          },
          collapsible && "relative"
        )}
      >
        {collapsible && (
          <button
            onClick={onToggle}
            className="absolute -right-3 top-6 z-10 h-6 w-6 rounded-full border border-border bg-background shadow-sm hover:bg-accent"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <div className={cn(
              "h-4 w-4 transition-transform",
              collapsed ? "rotate-0" : "rotate-180"
            )}>
              →
            </div>
          </button>
        )}
        <div className={cn(
          "h-full overflow-auto",
          collapsed && "overflow-hidden"
        )}>
          {sidebar}
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

// Header layout component
interface HeaderLayoutProps {
  header: React.ReactNode;
  children: React.ReactNode;
  sticky?: boolean;
  className?: string;
}

export function HeaderLayout({
  header,
  children,
  sticky = true,
  className,
}: HeaderLayoutProps) {
  return (
    <div className={cn("min-h-screen bg-background flex flex-col", className)}>
      <header className={cn(
        "border-b border-border bg-card/50 backdrop-blur-sm z-50",
        sticky && "sticky top-0"
      )}>
        {header}
      </header>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}

// Centered layout for auth pages, etc.
interface CenteredLayoutProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CenteredLayout({
  children,
  maxWidth = 'sm',
  className,
}: CenteredLayoutProps) {
  return (
    <div className={cn(
      "min-h-screen flex items-center justify-center p-4",
      className
    )}>
      <div className={cn(
        "w-full",
        {
          'max-w-sm': maxWidth === 'sm',
          'max-w-md': maxWidth === 'md',
          'max-w-lg': maxWidth === 'lg',
        }
      )}>
        {children}
      </div>
    </div>
  );
}

// Responsive breakpoint utilities
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Media query hook
export function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addListener(listener);
    return () => media.removeListener(listener);
  }, [matches, query]);

  return matches;
}

// Responsive helper hooks
export function useIsMobile() {
  return useMediaQuery(`(max-width: ${breakpoints.md})`);
}

export function useIsTablet() {
  return useMediaQuery(`(min-width: ${breakpoints.md}) and (max-width: ${breakpoints.lg})`);
}

export function useIsDesktop() {
  return useMediaQuery(`(min-width: ${breakpoints.lg})`);
}