import { useSyncExternalStore, type Ref } from 'react';
import { BreathingOrb, type OrbHandle, type OrbTone } from '../../shared/BreathingOrb';
import type { ConnectionState } from '../acquisition/contract';
import type { AdaptationSession } from '../adaptation/AdaptationSession';

/** The ring is drawn on a 100-unit box; its radius leaves room for the stroke. */
const RING_RADIUS = 47;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

interface SessionOrbProps {
  readonly session: AdaptationSession;
  readonly connection: ConnectionState;
  /** Share of the planned time already listened, from 0 to 1. */
  readonly progress: number;
  /** Lets the page make the orb beat with each heartbeat. */
  readonly orbRef: Ref<OrbHandle>;
  /** Whether the music sounds: only then is there a step of the music to show. */
  readonly playing?: boolean;
}

/**
 * The centre of the listening screen: the orb takes the tone of the
 * estimated state and beats with the person's pulse, inside a ring that
 * closes as the session advances. While the music plays, the halo behind it
 * follows the step of the music: wider and softer as the music calms
 * (ADR-60). Decorative: the state, the step, the progress and the time are
 * all in text next to it.
 */
export function SessionOrb({ session, connection, progress, orbRef, playing = false }: SessionOrbProps): React.JSX.Element {
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const connected = connection === 'connected';
  const tone: OrbTone = !connected ? 'idle' : snapshot.state ?? 'calibrating';
  const clamped = Math.min(Math.max(progress, 0), 1);

  return (
    <div className="session-orb" aria-hidden="true" data-level={playing ? snapshot.level : undefined}>
      <span className="session-halo" />
      <svg className="session-ring" viewBox="0 0 100 100">
        <circle className="session-ring-track" cx="50" cy="50" r={RING_RADIUS} />
        <circle
          className="session-ring-progress"
          cx="50"
          cy="50"
          r={RING_RADIUS}
          strokeDasharray={RING_LENGTH}
          strokeDashoffset={RING_LENGTH * (1 - clamped)}
        />
      </svg>
      <BreathingOrb tone={tone} ref={orbRef} className="session-orb-figure" />
    </div>
  );
}
