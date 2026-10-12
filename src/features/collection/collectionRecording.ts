import { SOURCE_KIND_IDS, type SourceKind } from '../acquisition/sourceCatalog';
import { isUuid } from '../records/uuidv7';
import { COLLECTION_STAGE_IDS, type CollectionStageId } from './collectionProtocol';

/**
 * Sources that measure the person. The simulator and the sample recordings
 * let anyone try the protocol, but their beats teach the model nothing
 * about a person, and `back/training` leaves them out.
 */
export const MEASURING_SOURCE_KINDS: readonly SourceKind[] = ['ble', 'camera'];

/** One stage of the protocol: its label and the heartbeats recorded during it. */
export interface CollectionSegment {
  readonly label: CollectionStageId;
  /** Seconds the stage was meant to record. */
  readonly plannedSeconds: number;
  /** When each beat ended, in milliseconds of signal since the stage started; never decreasing. */
  readonly beatTimesMs: readonly number[];
  /** Interval that ended at each beat, in milliseconds; as many as `beatTimesMs`. */
  readonly rrMs: readonly number[];
}

/** A finished guided recording kept on this device until the person exports or deletes it. */
export interface CollectionRecording {
  readonly id: string;
  /**
   * Random code of this device. It groups the recordings of one person so
   * training can test on people the model never saw; it names nobody.
   */
  readonly participant: string;
  /** ISO 8601 instants: when the recording started and when the person agreed to it. */
  readonly recordedAt: string;
  readonly consentAt: string;
  readonly sourceKind: SourceKind;
  /** One per stage of the protocol, in its order. */
  readonly segments: readonly CollectionSegment[];
}

/** Name and version of the exported file; `back/training/collected.py` rejects any other. */
export const COLLECTION_EXPORT_FORMAT = 'neuromelody-collection';
export const COLLECTION_SCHEMA_VERSION = 1;

/** What the person downloads and decides whom to send to. */
export interface CollectionExport {
  readonly format: typeof COLLECTION_EXPORT_FORMAT;
  readonly schemaVersion: typeof COLLECTION_SCHEMA_VERSION;
  readonly exportedAt: string;
  readonly recordings: readonly CollectionRecording[];
}

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord => typeof value === 'object' && value !== null;
const isInstant = (value: unknown): value is string => typeof value === 'string' && !Number.isNaN(Date.parse(value));
const isPositive = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;

function isSegment(value: unknown, label: CollectionStageId): value is CollectionSegment {
  if (!isRecord(value) || value.label !== label || !isPositive(value.plannedSeconds)) return false;
  const { beatTimesMs, rrMs } = value;
  if (!Array.isArray(beatTimesMs) || !Array.isArray(rrMs) || beatTimesMs.length !== rrMs.length) return false;
  let previous = 0;
  for (const time of beatTimesMs) {
    if (typeof time !== 'number' || !Number.isFinite(time) || time < previous) return false;
    previous = time;
  }
  return rrMs.every(isPositive);
}

/**
 * Validates a recording read from storage, which can be edited or left over
 * from an older version: the whole protocol, in order, or nothing.
 */
export function isCollectionRecording(value: unknown): value is CollectionRecording {
  return isRecord(value)
    && isUuid(value.id)
    && typeof value.participant === 'string' && value.participant !== ''
    && isInstant(value.recordedAt)
    && isInstant(value.consentAt)
    && SOURCE_KIND_IDS.some((kind) => kind === value.sourceKind)
    && Array.isArray(value.segments)
    && value.segments.length === COLLECTION_STAGE_IDS.length
    && COLLECTION_STAGE_IDS.every((label, index) => isSegment((value.segments as unknown[])[index], label));
}

/** Heartbeats of a whole recording. */
export function beatCount(recording: CollectionRecording): number {
  return recording.segments.reduce((sum, segment) => sum + segment.rrMs.length, 0);
}

/** The file with the given recordings, as `back/training` expects it. */
export function buildCollectionExport(recordings: readonly CollectionRecording[], exportedAt: Date): CollectionExport {
  return {
    format: COLLECTION_EXPORT_FORMAT,
    schemaVersion: COLLECTION_SCHEMA_VERSION,
    exportedAt: exportedAt.toISOString(),
    recordings,
  };
}
