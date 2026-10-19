import {
  browserStorage,
  writePreference,
  type PreferenceStorage,
} from '../../app/preferences/preferences';
import { parseOption } from '../../shared/parseOption';
import { AMBIENCE_IDS, DEFAULT_AMBIENCE_ID, type AmbienceId } from '../audio/core/ambienceCatalog';
import { DEFAULT_INSTRUMENT_ID, INSTRUMENT_IDS, type InstrumentId } from '../audio/core/instrumentCatalog';

/** Where the last choices are kept on the device, next to the theme and the language. */
export const AMBIENCE_STORAGE_KEY = 'neuromelody.ambience';
export const INSTRUMENT_STORAGE_KEY = 'neuromelody.instrument';

function stored(storage: PreferenceStorage | null, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/**
 * A sound choice of a session: the one its link carries or, when the link
 * says nothing (a session started straight from the home screen), the last
 * one the person made on this device. Both are validated like any outside input.
 */
function readChoice<T extends string>(options: readonly T[], fallback: T, key: string, linked: string | null, storage: PreferenceStorage | null): T {
  return parseOption(options, linked ?? stored(storage, key), fallback);
}

/** The ambience under the music (ADR-40). */
export function readAmbience(linked: string | null, storage: PreferenceStorage | null = browserStorage()): AmbienceId {
  return readChoice(AMBIENCE_IDS, DEFAULT_AMBIENCE_ID, AMBIENCE_STORAGE_KEY, linked, storage);
}

/** The instrument the music is played with (ADR-46). */
export function readInstrument(linked: string | null, storage: PreferenceStorage | null = browserStorage()): InstrumentId {
  return readChoice(INSTRUMENT_IDS, DEFAULT_INSTRUMENT_ID, INSTRUMENT_STORAGE_KEY, linked, storage);
}

/** Remembers a choice for the next session; without storage it holds for this one only. */
export function rememberAmbience(ambience: AmbienceId, storage: PreferenceStorage | null = browserStorage()): void {
  writePreference(storage, AMBIENCE_STORAGE_KEY, ambience);
}

export function rememberInstrument(instrument: InstrumentId, storage: PreferenceStorage | null = browserStorage()): void {
  writePreference(storage, INSTRUMENT_STORAGE_KEY, instrument);
}
