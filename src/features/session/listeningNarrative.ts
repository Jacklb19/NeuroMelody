import type { ConnectionState } from '../acquisition/contract';
import { ACTIVATION_STATE_IDS, type ActivationState } from '../adaptation/activationStates';

/**
 * Situations the simple view can describe. Each accepted state is its own
 * situation; the words for every id live in the dictionary.
 */
export const LISTENING_NARRATIVE_IDS = [
  'reconnecting',
  'noSource',
  'calibrating',
  'musicStopped',
  'unclearSignal',
  ...ACTIVATION_STATE_IDS,
] as const;

export type ListeningNarrativeId = (typeof LISTENING_NARRATIVE_IDS)[number];

export interface NarrativeInput {
  readonly connection: ConnectionState;
  readonly state: ActivationState | null;
  readonly qualityGood: boolean;
  readonly musicPlaying: boolean;
}

/**
 * Chooses what to tell about the current moment of the session for the
 * simple view (ADR-24).
 *
 * The connection comes first because nothing else is meaningful without a
 * signal. Stopping the music pauses the adaptation, which must not read as
 * a problem with the sensor. The wording itself is in the dictionary, where
 * it stays descriptive, never clinical (R-06).
 */
export function describeListening({ connection, state, qualityGood, musicPlaying }: NarrativeInput): ListeningNarrativeId {
  if (connection === 'reconnecting') return 'reconnecting';
  if (connection !== 'connected') return 'noSource';
  if (state === null) return 'calibrating';
  if (!musicPlaying) return 'musicStopped';
  if (!qualityGood) return 'unclearSignal';
  return state;
}
