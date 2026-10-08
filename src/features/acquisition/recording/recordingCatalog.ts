/**
 * Example recordings bundled with the app (ADR-17) and the format they are
 * stored in. It is shared by the app, which validates and plays them, and by
 * scripts/recordings/extract.ts, which produces them, so the two cannot drift.
 *
 * Node runs the extraction script without a bundler, so this module must stay
 * free of imports and of syntax that type stripping cannot erase.
 */

/** Recordings in the order the selector offers them; the single source of truth for `RecordingId`. */
export const RECORDING_IDS = ['nsr001', 'nsr002'] as const;

export type RecordingId = (typeof RECORDING_IDS)[number];

/** Recording selected when the person switches to the example recordings. */
export const DEFAULT_RECORDING_ID: RecordingId = 'nsr001';

/** Version of the JSON format; the parser rejects any other. */
export const RECORDING_SCHEMA_VERSION = 1;

/** Length of every extracted segment, in minutes and in ms. */
export const RECORDING_DURATION_MIN = 30;
export const RECORDING_DURATION_MS = RECORDING_DURATION_MIN * 60 * 1000;

/** Upper bound on the intervals of a segment, far above 30 minutes of plausible beats. */
export const MAX_RECORDING_INTERVALS = 10_000;

/**
 * How much shorter than the declared duration the sum of the intervals may be:
 * the segment ends between two beats, so the last partial beat is missing.
 */
export const RECORDING_DURATION_TOLERANCE_MS = 3000;

/** PhysioNet nsr2db release the examples are extracted from, and its sample rate. */
export const RECORDINGS_SOURCE_URL = 'https://physionet.org/files/nsr2db/1.0.0/';
export const RECORDINGS_SAMPLE_RATE_HZ = 128;

/** Folder of `public/` that holds the extracted files and their credits. */
export const RECORDINGS_DIRECTORY = 'recordings';

/** File name of an extracted recording. */
export function recordingFileName(id: RecordingId): string {
  return `${id}.json`;
}

/** Same-origin URL of a bundled recording. */
export function recordingUrl(id: RecordingId): string {
  return `/${RECORDINGS_DIRECTORY}/${recordingFileName(id)}`;
}

/** Same-origin URL of the data source and licence notice. */
export const RECORDINGS_CREDITS_URL = `/${RECORDINGS_DIRECTORY}/CREDITS.md`;
