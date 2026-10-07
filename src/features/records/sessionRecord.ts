import { SOURCE_KIND_IDS, type SourceKind } from '../acquisition/sourceCatalog';
import { ACTIVATION_STATE_IDS, type ActivationState } from '../adaptation/activationStates';
import { isUuid } from './uuidv7';

/**
 * One sample of a session every 5 s, shaped like a `session_metrics` row so
 * that the local history can be synchronised later without reshaping (S6.2).
 */
export interface SessionSample {
  /** Seconds of signal since the session started; unique within a session. */
  readonly second: number;
  readonly meanHr: number | null;
  readonly rmssd: number | null;
  readonly sdnn: number | null;
  readonly lfHfRatio: number | null;
  readonly estimatedState: ActivationState | null;
  readonly goodQuality: boolean;
}

/** A finished listening session stored on the device (RF-14, ADR-23). */
export interface SessionRecord {
  readonly id: string;
  /** ISO 8601 instants. */
  readonly startedAt: string;
  readonly endedAt: string;
  readonly plannedMinutes: number;
  /** Listening time measured on the audio clock. */
  readonly listenedSeconds: number;
  readonly sourceKind: SourceKind | null;
  /** Self-rating 0–10 before and after listening; `null` when skipped. */
  readonly ratingBefore: number | null;
  readonly ratingAfter: number | null;
  readonly samples: readonly SessionSample[];
}

export const MIN_RATING = 0;
export const MAX_RATING = 10;


type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord => typeof value === 'object' && value !== null;
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isNonNegativeOrNull = (value: unknown): boolean => value === null || (isFiniteNumber(value) && value >= 0);
const isInstant = (value: unknown): value is string => typeof value === 'string' && !Number.isNaN(Date.parse(value));

/** Accepts only whole ratings from 0 to 10, or `null` when the person skipped the question. */
export function isRating(value: unknown): value is number | null {
  return value === null || (Number.isInteger(value) && (value as number) >= MIN_RATING && (value as number) <= MAX_RATING);
}

function isSample(value: unknown): value is SessionSample {
  return isRecord(value)
    && Number.isInteger(value.second) && (value.second as number) >= 0
    && isNonNegativeOrNull(value.meanHr)
    && isNonNegativeOrNull(value.rmssd)
    && isNonNegativeOrNull(value.sdnn)
    && isNonNegativeOrNull(value.lfHfRatio)
    && (value.estimatedState === null || ACTIVATION_STATE_IDS.some((state) => state === value.estimatedState))
    && typeof value.goodQuality === 'boolean';
}

/**
 * Validates a record read from storage. Browser storage can be edited or
 * left over from an older version, so nothing is trusted without checking.
 */
export function isSessionRecord(value: unknown): value is SessionRecord {
  return isRecord(value)
    && isUuid(value.id)
    && isInstant(value.startedAt)
    && isInstant(value.endedAt)
    && Date.parse(value.endedAt) >= Date.parse(value.startedAt)
    && Number.isInteger(value.plannedMinutes) && (value.plannedMinutes as number) > 0
    && isFiniteNumber(value.listenedSeconds) && value.listenedSeconds >= 0
    && (value.sourceKind === null || SOURCE_KIND_IDS.some((kind) => kind === value.sourceKind))
    && isRating(value.ratingBefore)
    && isRating(value.ratingAfter)
    && Array.isArray(value.samples) && value.samples.every(isSample);
}
