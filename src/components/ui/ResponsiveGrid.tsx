import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  autoFit?: boolean;
  minItemWidth?: string;
}

const gapClasses = {
  none: 'gap-0',
  sm: 'gap-2 sm:gap-3',
  md: 'gap-4 sm:gap-6',
  lg: 'gap-6 sm:gap-8',
  xl: 'gap-8 sm:gap-10',
};

export default function ResponsiveGrid({
  children,
  className = '',
  cols = { default: 1, sm: 2, lg: 3 },
  gap = 'md',
  autoFit = false,
  minItemWidth = '280px',
}: ResponsiveGridProps) {
  const getGridCols = () => {
    if (autoFit) {
      return {
        gridTemplateColumns: `repeat(auto-fit, minmax(${minItemWidth}, 1fr))`,
      };
    }

    const colClasses = [];
    
    if (cols.default) colClasses.push(`grid-cols-${cols.default}`);
    if (cols.sm) colClasses.push(`sm:grid-cols-${cols.sm}`);
    if (cols.md) colClasses.push(`md:grid-cols-${cols.md}`);
    if (cols.lg) colClasses.push(`lg:grid-cols-${cols.lg}`);
    if (cols.xl) colClasses.push(`xl:grid-cols-${cols.xl}`);
    if (cols['2xl']) colClasses.push(`2xl:grid-cols-${cols['2xl']}`);

    return { className: colClasses.join(' ') };
  };

  const gridProps = getGridCols();

  return (
    <div
      className={cn(
        'grid',
        gapClasses[gap],
        !autoFit && gridProps.className,
        className
      )}
      style={autoFit ? gridProps : undefined}
    >
      {children}
    </div>
  );
}