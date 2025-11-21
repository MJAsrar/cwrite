'use client';

import React, { useCallback, useRef } from 'react';

type AnnouncementPriority = 'polite' | 'assertive';

export function useAnnouncer() {
  const politeRef = useRef<HTMLDivElement>(null);
  const assertiveRef = useRef<HTMLDivElement>(null);

  const announce = useCallback((message: string, priority: AnnouncementPriority = 'polite') => {
    const targetRef = priority === 'assertive' ? assertiveRef : politeRef;
    
    if (targetRef.current) {
      // Clear previous message
      targetRef.current.textContent = '';
      
      // Set new message after a brief delay to ensure screen readers pick it up
      setTimeout(() => {
        if (targetRef.current) {
          targetRef.current.textContent = message;
        }
      }, 100);
    }
  }, []);

  const AnnouncerRegion = React.memo(() => (
    <>
      <div
        ref={politeRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      <div
        ref={assertiveRef}
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />
    </>
  ));

  AnnouncerRegion.displayName = 'AnnouncerRegion';

  return { announce, AnnouncerRegion };
}