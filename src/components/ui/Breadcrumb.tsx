'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  // On mobile, show only the last 2 items to save space
  const mobileItems = items.length > 2 ? items.slice(-2) : items;
  
  return (
    <nav className={`flex ${className}`} aria-label="Breadcrumb">
      {/* Desktop breadcrumbs */}
      <ol className="hidden md:flex items-center space-x-2">
        {/* Home link */}
        <li>
          <Link
            href="/dashboard"
            className="text-secondary-500 hover:text-secondary-700 transition-colors"
            aria-label="Dashboard home"
          >
            <Home className="w-4 h-4" />
          </Link>
        </li>

        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            <ChevronRight className="w-4 h-4 text-secondary-400 mx-2" />
            {item.href && !item.current ? (
              <Link
                href={item.href}
                className="text-sm font-medium text-secondary-500 hover:text-secondary-700 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={`text-sm font-medium ${
                  item.current
                    ? 'text-secondary-900'
                    : 'text-secondary-500'
                }`}
                aria-current={item.current ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>

      {/* Mobile breadcrumbs - simplified */}
      <ol className="flex md:hidden items-center space-x-2">
        {/* Show ellipsis if we're truncating */}
        {items.length > 2 && (
          <>
            <li>
              <Link
                href="/dashboard"
                className="text-secondary-500 hover:text-secondary-700 transition-colors"
                aria-label="Dashboard home"
              >
                <Home className="w-4 h-4" />
              </Link>
            </li>
            <li className="flex items-center">
              <ChevronRight className="w-4 h-4 text-secondary-400 mx-2" />
              <span className="text-sm text-secondary-400">...</span>
            </li>
          </>
        )}

        {mobileItems.map((item, index) => (
          <li key={index} className="flex items-center">
            {(index > 0 || items.length <= 2) && (
              <ChevronRight className="w-4 h-4 text-secondary-400 mx-2" />
            )}
            {item.href && !item.current ? (
              <Link
                href={item.href}
                className="text-sm font-medium text-secondary-500 hover:text-secondary-700 transition-colors truncate max-w-[120px]"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={`text-sm font-medium truncate max-w-[120px] ${
                  item.current
                    ? 'text-secondary-900'
                    : 'text-secondary-500'
                }`}
                aria-current={item.current ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}