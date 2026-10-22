import { useSyncExternalStore } from 'react';

const noop = (): void => undefined;

/**
 * Whether a CSS media query matches right now, kept up to date while the
 * window changes. Without `matchMedia` (older engines, test renderers) it
 * reports no match, so a layout only for narrow screens stays off.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = (onChange: () => void): (() => void) => {
    if (typeof window.matchMedia !== 'function') return noop;
    const list = window.matchMedia(query);
    list.addEventListener('change', onChange);
    return () => { list.removeEventListener('change', onChange); };
  };
  const read = (): boolean => typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
  return useSyncExternalStore(subscribe, read, () => false);
}
