/**
 * Ambiences a person may add under the music of a session (ADR-33, ADR-40).
 * All of them are synthesized in the audio thread: no sound files travel.
 * The dictionary words them; `none` is a session with music alone.
 */
export const AMBIENCE_IDS = ['none', 'rain', 'sea', 'wind'] as const;

export type AmbienceId = (typeof AMBIENCE_IDS)[number];

/** Music alone, as every session was before ambiences existed. */
export const DEFAULT_AMBIENCE_ID: AmbienceId = 'none';

export function isAmbienceId(value: unknown): value is AmbienceId {
  return AMBIENCE_IDS.some((id) => id === value);
}
