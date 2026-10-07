import { MS_PER_SECOND } from '../../src/shared/time.ts';

/** Beat markers from WFDB's isqrs table; artifact markers (16) are not beats. */
const BEAT_CODES = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 25, 30, 31, 34, 35, 38, 41]);

// Layout of the MIT annotation format: each 16-bit word holds a 6-bit code and a 10-bit value.
const WORD_BYTES = 2;
const CODE_SHIFT = 10;
const VALUE_MASK = 0x3ff;
/** Pseudo-codes: SKIP carries a 32-bit time jump, AUX a block of auxiliary bytes. */
const SKIP_CODE = 59;
const AUX_CODE = 63;
const SKIP_BYTES = 4;
const HIGH_WORD_FACTOR = 0x10000;

/** Decodes beat sample positions in the MIT format, preserving beat labels of every kind. */
export function readBeatSamples(bytes: Uint8Array): number[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const samples: number[] = [];
  let time = 0;
  let offset = 0;
  while (offset + WORD_BYTES <= bytes.length) {
    const word = view.getUint16(offset, true);
    offset += WORD_BYTES;
    if (word === 0) return samples;
    const code = word >>> CODE_SHIFT;
    const interval = word & VALUE_MASK;
    if (code === SKIP_CODE) {
      if (offset + SKIP_BYTES > bytes.length) throw new Error('Truncated WFDB SKIP');
      // WFDB stores the high word first, with little-endian bytes inside each word.
      time += (view.getInt16(offset, true) * HIGH_WORD_FACTOR) + view.getUint16(offset + WORD_BYTES, true);
      offset += SKIP_BYTES;
    } else if (code === AUX_CODE) {
      offset += interval + interval % WORD_BYTES;
      if (offset > bytes.length) throw new Error('Truncated WFDB AUX');
    } else if (code < SKIP_CODE) {
      time += interval;
      if (BEAT_CODES.has(code)) {
        if (time <= (samples.at(-1) ?? -1)) throw new Error('Non-monotonic WFDB beats');
        samples.push(time);
      }
    }
  }
  throw new Error('Missing WFDB end marker');
}

/** Extracts the first complete segment of `durationMs` after the first annotated beat. */
export function extractSegment(samples: readonly number[], sampleRateHz: number, durationMs: number) {
  const startSample = samples[0];
  if (startSample === undefined || !Number.isFinite(sampleRateHz) || sampleRateHz <= 0) {
    throw new Error('Invalid recording header or empty beat annotations');
  }
  const endSample = startSample + durationMs * sampleRateHz / MS_PER_SECOND;
  if ((samples.at(-1) ?? 0) < endSample) throw new Error('Recording is shorter than the requested segment');
  const rrIntervalsMs: number[] = [];
  let previous = startSample;
  for (const sample of samples.slice(1)) {
    if (sample > endSample) break;
    rrIntervalsMs.push((sample - previous) * MS_PER_SECOND / sampleRateHz);
    previous = sample;
  }
  return { startSample, durationMs, rrIntervalsMs };
}
