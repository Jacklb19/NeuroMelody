import { createContext, useContext } from 'react';
import type { useListeningState } from './useListeningState';

export const ListeningContext = createContext<ReturnType<typeof useListeningState> | null>(null);

export function useListening() {
  const value = useContext(ListeningContext);
  if (value === null) throw new Error('useListening must be used inside ListeningProvider.');
  return value;
}

/** Audio previews also work alone in component tests. */
export function useOptionalListening() { return useContext(ListeningContext); }
