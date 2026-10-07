import { describe, expect, it } from 'vitest';
import { computeFrequencyIndices, fft } from './frequencyDomain';
import type { ClassifiedBeat } from './types';

interface Component { readonly amplitudeMs: number; readonly frequencyHz: number }

/** RR series whose value at each beat follows a known sum of sinusoids. */
function sinusoidalBeats(durationS: number, components: readonly Component[]): ClassifiedBeat[] {
  const beats: ClassifiedBeat[] = [];
  let t = 0;
  while (t < durationS) {
    const rrMs = 1000 + components.reduce(
      (sum, { amplitudeMs, frequencyHz }) => sum + amplitudeMs * Math.sin(2 * Math.PI * frequencyHz * t),
      0,
    );
    t += rrMs / 1000;
    beats.push({ endMs: t * 1000, rrMs, accepted: true, discardReason: null, contiguousWithPrevious: true });
  }
  return beats;
}

function patchBeat(beats: ClassifiedBeat[], index: number, patch: Partial<ClassifiedBeat>): void {
  const beat = beats[index];
  if (beat === undefined) throw new Error(`No beat at ${String(index)}`);
  beats[index] = { ...beat, ...patch };
}

describe('fft', () => {
  it('matches the direct DFT of a short sequence', () => {
    const input = [1, 2, 0, -1, 3, 0.5, -2, 4];
    const real = Float64Array.from(input);
    const imaginary = new Float64Array(input.length);
    fft(real, imaginary);
    input.forEach((_, k) => {
      let expectedReal = 0;
      let expectedImaginary = 0;
      input.forEach((value, n) => {
        expectedReal += value * Math.cos((-2 * Math.PI * k * n) / input.length);
        expectedImaginary += value * Math.sin((-2 * Math.PI * k * n) / input.length);
      });
      expect(real[k]).toBeCloseTo(expectedReal, 9);
      expect(imaginary[k]).toBeCloseTo(expectedImaginary, 9);
    });
  });
});

describe('computeFrequencyIndices', () => {
  it('recovers the power of known LF and HF oscillations (A²/2)', () => {
    // 40 ms at 0.1 Hz → 800 ms²; 20 ms at 0.25 Hz → 200 ms²; ratio 4.
    const beats = sinusoidalBeats(300, [
      { amplitudeMs: 40, frequencyHz: 0.1 },
      { amplitudeMs: 20, frequencyHz: 0.25 },
    ]);
    const result = computeFrequencyIndices(beats);
    expect(result).not.toBeNull();
    expect(result?.lfPower).toBeGreaterThan(800 * 0.9);
    expect(result?.lfPower).toBeLessThan(800 * 1.1);
    expect(result?.hfPower).toBeGreaterThan(200 * 0.9);
    expect(result?.hfPower).toBeLessThan(200 * 1.1);
    expect(result?.lfHfRatio).toBeGreaterThan(3.6);
    expect(result?.lfHfRatio).toBeLessThan(4.4);
  });

  it('interpolates over a discarded beat without inventing power', () => {
    const beats = sinusoidalBeats(300, [{ amplitudeMs: 20, frequencyHz: 0.25 }]);
    const clean = computeFrequencyIndices(beats);
    patchBeat(beats, 150, { accepted: false, discardReason: 'deviation' });
    const withDiscard = computeFrequencyIndices(beats);
    expect(withDiscard?.hfPower).toBeCloseTo(clean?.hfPower ?? 0, -1);
    expect(withDiscard?.lfPower).toBeLessThan(20);
  });

  it('needs two minutes of continuous signal after the last gap', () => {
    expect(computeFrequencyIndices(sinusoidalBeats(100, [{ amplitudeMs: 20, frequencyHz: 0.25 }]))).toBeNull();

    const beats = sinusoidalBeats(300, [{ amplitudeMs: 20, frequencyHz: 0.25 }]);
    patchBeat(beats, beats.length - 90, { contiguousWithPrevious: false });
    expect(computeFrequencyIndices(beats)).toBeNull();
  });

  it('rejects a stretch with too few accepted beats', () => {
    const beats = sinusoidalBeats(300, [{ amplitudeMs: 20, frequencyHz: 0.25 }])
      .map((beat, i) => (i % 3 === 0 ? { ...beat, accepted: false, discardReason: 'deviation' as const } : beat));
    expect(computeFrequencyIndices(beats)).toBeNull();
  });
});
