import { useImperativeHandle, useRef, type Ref } from 'react';
import './breathingOrb.css';

/** What a caller can ask of the orb. */
export interface OrbHandle {
  /** Swell once, as on a heartbeat. */
  beat(): void;
  /**
   * Follow a guided breath: 0 is the end of breathing out and 1 the end of
   * breathing in. `null` hands the orb back to its own slow breath.
   */
  breathe(fullness: number | null): void;
}

/** Tone of the orb; `idle` breathes slowly on its own. Mirrors the estimated states without alarm colours. */
export type OrbTone = 'idle' | 'calibrating' | 'high' | 'uncertain' | 'low';

interface BreathingOrbProps {
  readonly tone?: OrbTone;
  readonly ref?: Ref<OrbHandle>;
  readonly className?: string;
}

/** Shape of one beat: a quick swell and a slow return, like the first heart sound. */
const BEAT_KEYFRAMES: Keyframe[] = [
  { transform: 'scale(1)', offset: 0 },
  { transform: 'scale(1.09)', offset: 0.18 },
  { transform: 'scale(1)', offset: 1 },
];
const BEAT_DURATION_MS = 620;
/** Read by breathingOrb.css to size the orb while it follows a guided breath. */
const BREATH_FULLNESS_PROPERTY = '--orb-breath-fullness';

/**
 * The living figure of the app: a soft sphere inside the rings of a staff.
 * It breathes on its own and, when told, beats with the person's heart.
 * Decorative: the text beside it says everything it shows.
 */
export function BreathingOrb({ tone = 'idle', ref, className }: BreathingOrbProps): React.JSX.Element {
  const coreRef = useRef<HTMLSpanElement | null>(null);
  const rootRef = useRef<HTMLSpanElement | null>(null);

  useImperativeHandle(ref, () => ({
    breathe(fullness) {
      const root = rootRef.current;
      if (root === null) return;
      // Written straight to the element: it changes every frame and must not re-render the screen.
      if (fullness === null) {
        delete root.dataset.guided;
        root.style.removeProperty(BREATH_FULLNESS_PROPERTY);
        return;
      }
      root.dataset.guided = '';
      root.style.setProperty(BREATH_FULLNESS_PROPERTY, String(fullness));
    },
    beat() {
      const core = coreRef.current;
      // Older engines lack Web Animations; reduced motion keeps the orb still.
      if (core === null || typeof core.animate !== 'function') return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      core.animate(BEAT_KEYFRAMES, { duration: BEAT_DURATION_MS, easing: 'ease-out' });
    },
  }), []);

  return (
    <span className={className === undefined ? 'orb' : `orb ${className}`} data-tone={tone} aria-hidden="true" ref={rootRef}>
      <span className="orb-ring orb-ring-outer" />
      <span className="orb-ring orb-ring-inner" />
      <span className="orb-glow" />
      <span className="orb-core" ref={coreRef} />
    </span>
  );
}
