import { useCallback, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

/**
 * The session as a path of slides (ADR-47): the pulse, how the person
 * arrives, and the listening itself. The dictionary words each one.
 */
export const SLIDE_IDS = ['pulse', 'arrival', 'listening'] as const;

export type SlideId = (typeof SLIDE_IDS)[number];

/** Pause after the pulse connects before the next slide comes in, so "connected" can be read. */
export const AUTO_ADVANCE_MS = 700;

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export interface Slides {
  readonly slide: SlideId;
  readonly goTo: (next: SlideId) => void;
}

/**
 * The current slide and the way to move to another. Where the browser can,
 * the change is drawn as a view transition: the old slide slides out and the
 * new one slides in, forwards or backwards (session.css reads the direction
 * from the document). Without that support, or with reduced motion, the
 * slide simply changes.
 */
export function useSlides(initial: SlideId): Slides {
  const [slide, setSlide] = useState<SlideId>(initial);
  const currentRef = useRef<SlideId>(initial);
  const goTo = useCallback((next: SlideId): void => {
    const current = currentRef.current;
    if (current === next) return;
    currentRef.current = next;
    document.documentElement.dataset.slideDirection =
      SLIDE_IDS.indexOf(next) > SLIDE_IDS.indexOf(current) ? 'forwards' : 'backwards';
    if (typeof document.startViewTransition === 'function' && !prefersReducedMotion()) {
      // The transition photographs the page before and after a synchronous update.
      document.startViewTransition(() => {
        flushSync(() => { setSlide(next); });
      });
    } else {
      setSlide(next);
    }
  }, []);
  return { slide, goTo };
}
