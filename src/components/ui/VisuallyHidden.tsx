import React from 'react';

interface VisuallyHiddenProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export default function VisuallyHidden({ children, asChild = false }: VisuallyHiddenProps) {
  if (asChild) {
    return React.cloneElement(children as React.ReactElement, {
      className: 'sr-only',
    });
  }

  return <span className="sr-only">{children}</span>;
}