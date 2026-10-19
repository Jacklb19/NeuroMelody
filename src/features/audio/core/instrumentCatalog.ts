/**
 * Instruments a person may choose for the music of a session (ADR-46). The
 * notes and the guidance are the same for all of them; what changes is how
 * each note sounds and how the chords are played. The dictionary words them.
 */
export const INSTRUMENT_IDS = ['warm', 'piano', 'bowls'] as const;

export type InstrumentId = (typeof INSTRUMENT_IDS)[number];

/** The sound every session had before instruments existed: warm pads and soft keys. */
export const DEFAULT_INSTRUMENT_ID: InstrumentId = 'warm';

export function isInstrumentId(value: unknown): value is InstrumentId {
  return INSTRUMENT_IDS.some((id) => id === value);
}
