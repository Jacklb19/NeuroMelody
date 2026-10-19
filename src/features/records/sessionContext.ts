import { AMBIENCE_IDS, type AmbienceId } from '../audio/core/ambienceCatalog';
import { INSTRUMENT_IDS, type InstrumentId } from '../audio/core/instrumentCatalog';

/** Version of the music programs accompanying these local choices. */
export const SESSION_CONTEXT_VERSION = 1;
export const MAX_NOTE_LENGTH = 200;

/** Choices and local clock at the instant listening starts; never reconstructed for older sessions. */
export interface SessionContext {
  readonly version: typeof SESSION_CONTEXT_VERSION;
  readonly instrument: InstrumentId;
  readonly ambience: AmbienceId;
  readonly localHour: number;
  readonly localDate: string;
}

export function createSessionContext(instrument: InstrumentId, ambience: AmbienceId, now = new Date()): SessionContext {
  const year = String(now.getFullYear()).padStart(4, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return { version: SESSION_CONTEXT_VERSION, instrument, ambience, localHour: now.getHours(), localDate: `${year}-${month}-${day}` };
}

export function isSessionContext(value: unknown): value is SessionContext {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return item.version === SESSION_CONTEXT_VERSION
    && INSTRUMENT_IDS.some((id) => id === item.instrument)
    && AMBIENCE_IDS.some((id) => id === item.ambience)
    && Number.isInteger(item.localHour) && Number(item.localHour) >= 0 && Number(item.localHour) < 24
    && typeof item.localDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.localDate)
    && !Number.isNaN(Date.parse(item.localDate))
    && new Date(item.localDate).toISOString().slice(0, 10) === item.localDate;
}

/** Plain text only; no markup is ever interpreted and the note never leaves this device. */
export function isSessionNote(value: unknown): value is string {
  return typeof value === 'string' && value.length <= MAX_NOTE_LENGTH;
}
