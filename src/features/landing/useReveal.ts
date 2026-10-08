import { useEffect, type RefObject } from 'react';

/** Class index.css animates in; elements carrying `data-reveal` start hidden only once JS marks the page ready. */
const VISIBLE_CLASS = 'is-visible';

/**
 * Reveals each `[data-reveal]` element inside `root` the first time it
 * scrolls into view. Without IntersectionObserver everything is shown at
 * once, and index.css skips the motion when reduced motion is requested.
 */
export function useReveal(root: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const container = root.current;
    if (container === null) return undefined;
    const targets = Array.from(container.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (typeof IntersectionObserver === 'undefined') {
      targets.forEach((target) => { target.classList.add(VISIBLE_CLASS); });
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add(VISIBLE_CLASS);
        observer.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -10% 0px' });
    targets.forEach((target) => { observer.observe(target); });
    container.classList.add('reveal-ready');
    return () => { observer.disconnect(); };
  }, [root]);
}
