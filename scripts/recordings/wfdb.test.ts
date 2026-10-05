// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { extractSegment, readBeatSamples } from './wfdb';

describe('WFDB extraction', () => {
  it('decodes normal and other beat markers, skips metadata, and excludes non-beat events', () => {
    // N at 128, AUX of odd length, SUB, a rhythm note at 138, V at 256.
    expect(readBeatSamples(Uint8Array.from([
      128, 4, 3, 252, 97, 98, 99, 0, 1, 244, 10, 88, 118, 20, 0, 0,
    ]))).toEqual([128, 256]);
  });
  it('decodes signed SKIP intervals in high-word-first byte order', () => {
    expect(readBeatSamples(Uint8Array.from([0, 236, 1, 0, 0, 0, 128, 4, 0, 0])))
      .toEqual([65664]);
  });
  it('rejects truncated or non-monotonic annotations', () => {
    for (const bytes of [[0, 236, 1], [5, 252, 1], [128, 4], [128, 4, 0, 4, 0, 0]]) {
      expect(() => readBeatSamples(Uint8Array.from(bytes))).toThrow();
    }
  });
  it('keeps RR values in milliseconds and stops at the segment boundary', () => {
    expect(extractSegment([128, 256, 384, 512, 640], 128, 2500))
      .toEqual({ startSample: 128, durationMs: 2500, rrIntervalsMs: [1000, 1000] });
    expect(() => extractSegment([0, 128], 128, 2000)).toThrow(/shorter/);
  });
});
