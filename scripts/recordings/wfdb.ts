/** Beat markers from WFDB's isqrs table; artifact markers (16) are not beats. */
const BEAT_CODES = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 25, 30, 31, 34, 35, 38, 41]);

/** Decodes beat sample positions in the MIT format, preserving beat labels of every kind. */
export function readBeatSamples(bytes: Uint8Array): number[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const samples: number[] = [];
  let time = 0;
  let offset = 0;
  while (offset + 2 <= bytes.length) {
    const word = view.getUint16(offset, true);
    offset += 2;
    if (word === 0) return samples;
    const code = word >>> 10;
    const interval = word & 1023;
    if (code === 59) {
      if (offset + 4 > bytes.length) throw new Error('Truncated WFDB SKIP');
      // WFDB stores the high word first, with little-endian bytes inside each word.
      time += (view.getInt16(offset, true) * 65536) + view.getUint16(offset + 2, true);
      offset += 4;
    } else if (code === 63) {
      offset += interval + interval % 2;
      if (offset > bytes.length) throw new Error('Truncated WFDB AUX');
    } else if (code < 59) {
      time += interval;
      if (BEAT_CODES.has(code)) {
        if (time <= (samples.at(-1) ?? -1)) throw new Error('Non-monotonic WFDB beats');
        samples.push(time);
      }
    }
  }
  throw new Error('Missing WFDB end marker');
}

/** Extracts the first complete 30 minute segment after the first annotated beat. */
export function extractSegment(samples: readonly number[], sampleRateHz: number, durationMs: number) {
  const startSample = samples[0];
  if (startSample === undefined || !Number.isFinite(sampleRateHz) || sampleRateHz <= 0) {
    throw new Error('Invalid recording header or empty beat annotations');
  }
  const endSample = startSample + durationMs * sampleRateHz / 1000;
  if ((samples.at(-1) ?? 0) < endSample) throw new Error('Recording is shorter than the requested segment');
  const rrIntervalsMs: number[] = [];
  let previous = startSample;
  for (const sample of samples.slice(1)) {
    if (sample > endSample) break;
    rrIntervalsMs.push((sample - previous) * 1000 / sampleRateHz);
    previous = sample;
  }
  return { startSample, durationMs, rrIntervalsMs };
}
