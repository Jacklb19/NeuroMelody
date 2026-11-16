import { isAmbienceId, type AmbienceId } from '../audio/core/ambienceCatalog';
import { isInstrumentId, type InstrumentId } from '../audio/core/instrumentCatalog';
import { MAX_START_AT_S, SYNTHESIS_VERSION } from '../audio/core/SynthesisCore';
import { SECONDS_PER_MINUTE } from '../../shared/time';
import { LEVEL_IDS, type LevelId } from '../audio/engine/levels';
import { isSoundProfile, type SoundProfile } from '../audio/engine/soundProfile';
import { isUuid, uuidv7 } from '../records/uuidv7';
import { DEFAULT_LISTEN_DURATION_MIN, LISTEN_DURATIONS_MIN, type ListenDurationMin } from './listenCatalog';

/**
 * A melody saved from the listening screen (P-17): what the synthesizer
 * needs to play a piece again, and the point where it was saved. No pulse,
 * no session and nothing about the person but the name they give it.
 */
export interface Melody {
  readonly id: string;
  /** The account it belongs to, on this device only; it never travels (ADR-61). */
  readonly ownerId: string;
  readonly name: string;
  readonly seed: number;
  readonly instrument: InstrumentId;
  readonly ambience: AmbienceId;
  readonly profile: SoundProfile;
  readonly level: LevelId;
  /** Whole seconds of the piece heard when it was saved; marked on its time bar. */
  readonly positionS: number;
  /** Length of the piece, the one it was played for when saved (ADR-67). */
  readonly durationMin: ListenDurationMin;
  readonly musicMix: number;
  readonly ambienceMix: number;
  /** What a seed plays changes with the synthesizer: an older melody may sound a little different. */
  readonly synthesisVersion: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Longest name; the API and the database hold the same (`MELODY_NAME_MAX_CHARS`). */
export const MELODY_NAME_LIMIT = 60;
/** Most melodies one account keeps; the cloud holds the same (`MAX_MELODIES_PER_ACCOUNT`). */
export const MAX_MELODIES = 50;
/** Seeds are non-negative 32-bit integers (mulberry32). */
export const MAX_SEED = 2 ** 31 - 1;

/** What a melody is made of before it has an id, an owner and its dates. */
export type MelodyContent = Pick<Melody, 'name' | 'seed' | 'instrument' | 'ambience' | 'profile' | 'level' | 'positionS' | 'durationMin' | 'musicMix' | 'ambienceMix'>;

const isLevelId = (value: unknown): value is LevelId => LEVEL_IDS.some((id) => id === value);
const isInteger = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
const isShare = (value: unknown): value is number => typeof value === 'number' && value >= 0 && value <= 1;
const isInstant = (value: unknown): value is string => typeof value === 'string' && !Number.isNaN(Date.parse(value));
/** A melody saved before lengths existed (ADR-67) plays for the default length, as the cloud lists it. */
const lengthOf = (value: unknown): ListenDurationMin | null =>
  value === undefined ? DEFAULT_LISTEN_DURATION_MIN : LISTEN_DURATIONS_MIN.find((minutes) => minutes === value) ?? null;

/** A name the store accepts: trimmed, not empty and within the limit. */
export function isMelodyName(value: unknown): value is string {
  return typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= MELODY_NAME_LIMIT;
}

/** Validates a melody read from storage, a backup or the network; anything else is `null`. */
export function readMelody(value: unknown): Melody | null {
  if (typeof value !== 'object' || value === null) return null;
  const melody = value as Record<string, unknown>;
  const durationMin = lengthOf(melody.durationMin);
  if (durationMin === null || !isUuid(melody.id) || typeof melody.ownerId !== 'string' || melody.ownerId === '' || !isMelodyName(melody.name) ||
    !isInteger(melody.seed, 0, MAX_SEED) || !isInstrumentId(melody.instrument) || !isAmbienceId(melody.ambience) ||
    !isSoundProfile(melody.profile) || !isLevelId(melody.level) || !isInteger(melody.positionS, 0, MAX_START_AT_S) ||
    !isShare(melody.musicMix) || !isShare(melody.ambienceMix) || !isInteger(melody.synthesisVersion, 1, Number.MAX_SAFE_INTEGER) ||
    !isInstant(melody.createdAt) || !isInstant(melody.updatedAt) || Date.parse(melody.updatedAt) < Date.parse(melody.createdAt) ||
    melody.positionS > durationMin * SECONDS_PER_MINUTE) {
    return null;
  }
  return {
    id: melody.id,
    ownerId: melody.ownerId,
    name: melody.name,
    seed: melody.seed,
    instrument: melody.instrument,
    ambience: melody.ambience,
    profile: melody.profile,
    level: melody.level,
    positionS: melody.positionS,
    durationMin,
    musicMix: melody.musicMix,
    ambienceMix: melody.ambienceMix,
    synthesisVersion: melody.synthesisVersion,
    createdAt: new Date(melody.createdAt).toISOString(),
    updatedAt: new Date(melody.updatedAt).toISOString(),
  };
}

/** A new melody of `owner`, saved now with the synthesizer of this build. */
export function createMelody(content: MelodyContent, owner: string, now: Date = new Date()): Melody {
  const at = now.toISOString();
  return {
    ...content,
    name: content.name.trim().slice(0, MELODY_NAME_LIMIT),
    positionS: Math.min(content.durationMin * SECONDS_PER_MINUTE, Math.max(0, Math.round(content.positionS))),
    id: uuidv7(now.getTime()),
    ownerId: owner,
    synthesisVersion: SYNTHESIS_VERSION,
    createdAt: at,
    updatedAt: at,
  };
}

/** The same melody with another name; the change is dated, so the newest name wins on every device. */
export function renameMelody(melody: Melody, name: string, now: Date = new Date()): Melody {
  const updatedAt = new Date(Math.max(now.getTime(), Date.parse(melody.updatedAt) + 1)).toISOString();
  return { ...melody, name: name.trim().slice(0, MELODY_NAME_LIMIT), updatedAt };
}

/** Whether the synthesizer of this build plays the melody as it sounded when saved. */
export function soundsAsSaved(melody: Melody): boolean {
  return melody.synthesisVersion === SYNTHESIS_VERSION;
}

/** Most recently changed first, as the cloud lists them. */
export function byNewest(a: Melody, b: Melody): number {
  return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
}
