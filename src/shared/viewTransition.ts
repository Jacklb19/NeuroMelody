import { flushSync } from 'react-dom';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** Whether the person asked the system for less motion. */
export function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * Applies a state change as a view transition where the browser can: the
 * page is photographed before and after a synchronous update and the two
 * are blended, with whatever each element names in CSS (`view-transition-name`).
 * Without support, or with reduced motion, the change simply happens.
 */
export function withViewTransition(update: () => void): void {
  if (typeof document.startViewTransition !== 'function' || prefersReducedMotion()) {
    update();
    return;
  }
  const transition = document.startViewTransition(() => {
    flushSync(update);
  });
  // A transition cut short (another one starts, the tab is hidden) rejects these promises;
  // the change has happened anyway, so there is nothing to report.
  const ignore = (): void => undefined;
  transition.ready.catch(ignore);
  transition.finished.catch(ignore);
  transition.updateCallbackDone.catch(ignore);
}
