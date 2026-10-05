import { useEffect } from 'react';

/** Document title per screen (WCAG 2.4.2): screen readers announce it on navigation. */
export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} · NeuroMelody`;
  }, [title]);
}
