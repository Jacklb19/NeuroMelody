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
}

/**
 * The centre of the listening screen: the orb takes the tone of the
 * estimated state and beats with the person's pulse, inside a ring that
 * closes as the session advances. Decorative: the state, the progress and
 * the time are all in text next to it.
 */
export function SessionOrb({ session, connection, progress, orbRef }: SessionOrbProps): React.JSX.Element {
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const connected = connection === 'connected';
  const tone: OrbTone = !connected ? 'idle' : snapshot.state ?? 'calibrating';
  const clamped = Math.min(Math.max(progress, 0), 1);

  return (
    <div className="session-orb" aria-hidden="true">
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
