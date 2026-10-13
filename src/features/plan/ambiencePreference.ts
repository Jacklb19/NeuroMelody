import {
  browserStorage,
  writePreference,
  type PreferenceStorage,
} from '../../app/preferences/preferences';
import { parseOption } from '../../shared/parseOption';
import { AMBIENCE_IDS, DEFAULT_AMBIENCE_ID, type AmbienceId } from '../audio/core/ambienceCatalog';

/** Where the last ambience chosen is kept on the device, next to the theme and the language. */
export const AMBIENCE_STORAGE_KEY = 'neuromelody.ambience';

function stored(storage: PreferenceStorage | null): string | null {
  try {
    return storage?.getItem(AMBIENCE_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

/**
 * The ambience of a session: the one its link carries or, when the link says
 * nothing (a session started straight from the home screen), the last one
 * the person chose on this device. Both are validated like any outside input.
 */
export function readAmbience(linked: string | null, storage: PreferenceStorage | null = browserStorage()): AmbienceId {
  return parseOption(AMBIENCE_IDS, linked ?? stored(storage), DEFAULT_AMBIENCE_ID);
}

/** Remembers the choice for the next session; without storage it holds for this one only. */
export function rememberAmbience(ambience: AmbienceId, storage: PreferenceStorage | null = browserStorage()): void {
  writePreference(storage, AMBIENCE_STORAGE_KEY, ambience);
}
