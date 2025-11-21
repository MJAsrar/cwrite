'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { BreadcrumbItem } from '@/components/ui/Breadcrumb';

interface BreadcrumbConfig {
  [key: string]: {
    label: string;
    dynamic?: boolean;
  };
}

const breadcrumbConfig: BreadcrumbConfig = {
  '/dashboard': { label: 'Dashboard' },
  '/dashboard/projects': { label: 'Projects' },
  '/dashboard/projects/[id]': { label: 'Project', dynamic: true },
  '/dashboard/projects/[id]/files': { label: 'Files', dynamic: true },
  '/dashboard/search': { label: 'Search' },
  '/dashboard/settings': { label: 'Settings' },
};

export function useBreadcrumbs(projectName?: string): BreadcrumbItem[] {
  const pathname = usePathname();

  return useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    // Build breadcrumbs from path segments
    let currentPath = '';
    
    for (let i = 0; i < segments.length; i++) {
      currentPath += `/${segments[i]}`;
      const isLast = i === segments.length - 1;
      
      // Handle dynamic routes
      let configKey = currentPath;
      let label = segments[i];
      
      // Check for dynamic project ID
      if (segments[i - 1] === 'projects' && segments[i] !== 'projects') {
        configKey = '/dashboard/projects/[id]';
        label = projectName || 'Project';
      }
      
      // Check for files page under project
      if (segments[i] === 'files' && segments[i - 2] === 'projects') {
        configKey = '/dashboard/projects/[id]/files';
      }
      
      const config = breadcrumbConfig[configKey];
      
      if (config) {
        breadcrumbs.push({
          label: config.label === 'Project' && projectName ? projectName : config.label,
          href: isLast ? undefined : currentPath,
          current: isLast,
        });
      } else if (currentPath !== '/dashboard') {
        // Fallback for unknown routes
        breadcrumbs.push({
          label: label.charAt(0).toUpperCase() + label.slice(1),
          href: isLast ? undefined : currentPath,
          current: isLast,
        });
      }
    }

    return breadcrumbs;
  }, [pathname, projectName]);
}