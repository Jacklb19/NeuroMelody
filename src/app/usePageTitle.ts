import { useEffect } from 'react';

/** Título del documento por pantalla (WCAG 2.4.2): los lectores de pantalla lo anuncian al navegar. */
export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} · NeuroMelody`;
  }, [title]);
}
