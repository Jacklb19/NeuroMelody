import { describe, expect, it } from 'vitest';
import { Ambience } from './ambience';
import { AMBIENCE_IDS, type AmbienceId } from './ambienceCatalog';

const FS = 48_000;
const BLOCK = 128;
const SOUNDING: readonly AmbienceId[] = AMBIENCE_IDS.filter((id) => id !== 'none');

function render(kind: AmbienceId, seconds: number, seed = 7): { left: Float32Array; right: Float32Array } {
  const ambience = new Ambience(FS, seed, kind);
  const total = Math.floor((seconds * FS) / BLOCK) * BLOCK;
  const left = new Float32Array(total);
  const right = new Float32Array(total);
  for (let offset = 0; offset < total; offset += BLOCK) {
    ambience.process(left.subarray(offset, offset + BLOCK), right.subarray(offset, offset + BLOCK));
  }
  return { left, right };
}

function rms(samples: Float32Array): number {
  return Math.sqrt(samples.reduce((sum, x) => sum + x * x, 0) / samples.length);
}

describe('Ambience', () => {
  it('leaves the block silent without an ambience, even over a dirty buffer', () => {
    const ambience = new Ambience(FS, 1, 'none');
    const left = new Float32Array(BLOCK).fill(0.5);
    const right = new Float32Array(BLOCK).fill(0.5);
    ambience.process(left, right);
    expect(rms(left)).toBe(0);
    expect(rms(right)).toBe(0);
  });

  it.each(SOUNDING)('%s sounds in both channels, well below the music ceiling, with no invalid sample', (kind) => {
    // Thirty seconds cover several waves and gusts.
    const { left, right } = render(kind, 30);
    let peak = 0;
    let invalid = 0;
    for (const channel of [left, right]) {
      for (const sample of channel) {
        if (!Number.isFinite(sample)) invalid++;
        peak = Math.max(peak, Math.abs(sample));
      }
    }
    expect(invalid).toBe(0);
    expect(rms(left)).toBeGreaterThan(0.003);
    expect(rms(right)).toBeGreaterThan(0.003);
    expect(right).not.toEqual(left);
    // The music peaks near 0.4 before the volume; an ambience stays under it.
    expect(peak).toBeLessThan(0.35);
  });

  it.each(SOUNDING)('%s repeats for the same seed and changes with another', (kind) => {
    const first = render(kind, 2);
    expect(render(kind, 2).left).toEqual(first.left);
    expect(render(kind, 2, 8).left).not.toEqual(first.left);
  });
});
