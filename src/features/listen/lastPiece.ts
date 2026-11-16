import { isAmbienceId } from '../audio/core/ambienceCatalog';
import { isInstrumentId } from '../audio/core/instrumentCatalog';
import { MAX_START_AT_S } from '../audio/core/SynthesisCore';
import { LEVEL_IDS } from '../audio/engine/levels';
import { isSoundProfile } from '../audio/engine/soundProfile';
import type { PlaybackPiece } from '../audio/ui/PlaybackPanel';
import { MAX_SEED } from './melody';

/**
 * The last piece heard on the listening screen (P-17), so leaving the screen
 * loses nothing: coming back finds it paused where it was, ready to resume or
 * to be saved. One per account, in the storage of the browser tab, so it
 * ends with the tab and never reaches another account.
 */
export interface LastPiece {
  /** The piece, with `startAtS` at the point where it was left. */
  readonly piece: PlaybackPiece;
  /** The saved melody it is, if it is one. */
  readonly melodyId: string | null;
  readonly mix: { readonly music: number; readonly ambience: number };
}

export const LAST_PIECE_STORAGE_PREFIX = 'neuromelody.last-piece.';

const keyOf = (owner: string): string => `${LAST_PIECE_STORAGE_PREFIX}${owner}`;

/** The tab's storage; merely touching it can throw when the browser blocks it. */
function tabStorage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

const isShare = (value: unknown): value is number => typeof value === 'number' && value >= 0 && value <= 1;

/** Validates what was kept: the tab's storage is as untrusted as any other input. */
export function readLastPieceValue(value: unknown): LastPiece | null {
  if (typeof value !== 'object' || value === null) return null;
  const { piece, melodyId, mix } = value as Record<string, unknown>;
  if (typeof piece !== 'object' || piece === null || typeof mix !== 'object' || mix === null) return null;
  const p = piece as Record<string, unknown>;
  const m = mix as Record<string, unknown>;
  if (typeof p.seed !== 'number' || !Number.isInteger(p.seed) || p.seed < 0 || p.seed > MAX_SEED ||
    !LEVEL_IDS.some((id) => id === p.initialLevel) || !isInstrumentId(p.instrument) || !isAmbienceId(p.ambience) ||
    !isSoundProfile(p.profile) || typeof p.startAtS !== 'number' || !(p.startAtS >= 0 && p.startAtS <= MAX_START_AT_S) ||
    (melodyId !== null && typeof melodyId !== 'string') || !isShare(m.music) || !isShare(m.ambience)) {
    return null;
  }
  const level = LEVEL_IDS.find((id) => id === p.initialLevel) ?? 'target';
  return {
    piece: { seed: p.seed, initialLevel: level, instrument: p.instrument, ambience: p.ambience, profile: p.profile, startAtS: p.startAtS },
    melodyId,
    mix: { music: m.music, ambience: m.ambience },
  };
}

export function readLastPiece(owner: string, storage: Pick<Storage, 'getItem'> | null = tabStorage()): LastPiece | null {
  try {
    return readLastPieceValue(JSON.parse(storage?.getItem(keyOf(owner)) ?? 'null'));
  } catch {
    return null;
  }
}

export function writeLastPiece(owner: string, last: LastPiece, storage: Pick<Storage, 'setItem'> | null = tabStorage()): void {
  try {
    storage?.setItem(keyOf(owner), JSON.stringify(last));
  } catch {
    // Without storage, coming back simply starts with nothing paused.
  }
}

export function forgetLastPiece(owner: string, storage: Pick<Storage, 'removeItem'> | null = tabStorage()): void {
  try {
    storage?.removeItem(keyOf(owner));
  } catch {
    // Nothing could be read from blocked storage either.
  }
}
