import { useCallback, useRef, useState } from 'react';
import { withViewTransition } from '../../shared/viewTransition';

/**
 * The session as a path of slides (ADR-47): the pulse, how the person
 * arrives, and the listening itself. The dictionary words each one.
 */
export const SLIDE_IDS = ['pulse', 'arrival', 'listening'] as const;

export type SlideId = (typeof SLIDE_IDS)[number];

/** Pause after the pulse connects before the next slide comes in, so "connected" can be read. */
export const AUTO_ADVANCE_MS = 700;

export interface Slides {
  readonly slide: SlideId;
  readonly goTo: (next: SlideId) => void;
}

/**
 * The current slide and the way to move to another. Where the browser can,
 * the change is drawn as a view transition: the old slide fades out and the
 * new one fades in. Without that support, or with reduced motion, the
 * slide simply changes.
 */
export function useSlides(initial: SlideId): Slides {
  const [slide, setSlide] = useState<SlideId>(initial);
  const currentRef = useRef<SlideId>(initial);
  const goTo = useCallback((next: SlideId): void => {
    const current = currentRef.current;
    if (current === next) return;
    currentRef.current = next;
    withViewTransition(() => { setSlide(next); });
  }, []);
  return { slide, goTo };
}
