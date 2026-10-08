import { describe, it, expect } from 'vitest';
import { LAYER_COUNT, MIN_LAYERS, SynthesisCore, BEATS_PER_CYCLE } from './SynthesisCore';
import { MODE } from './theory';
import { FADE_DURATION_S } from '../engine/ramps';

const FS = 48_000;
const BLOCK = 128;
// Offline rendering with V8 coverage is CPU-bound, not a real-time audio benchmark.
const RENDER_TIMEOUT_MS = 90_000;

interface Params {
  tempo: number;
  mode: number;
  layers: number;
}

/** Renders `seconds` of audio block by block; `onBlock` may change the parameters. */
function renderAudio(
  core: SynthesisCore,
  seconds: number,
  params: Params,
  onBlock?: (timeS: number, p: Params) => void,
): Float32Array {
  const total = Math.floor((seconds * FS) / BLOCK) * BLOCK;
  const output = new Float32Array(total);
  const block = new Float32Array(BLOCK);
  for (let offset = 0; offset < total; offset += BLOCK) {
    onBlock?.(offset / FS, params);
    core.process(block, params.tempo, params.mode, params.layers);
    output.set(block, offset);
  }
  return output;
}

function rms(samples: Float32Array, from: number, to: number): number {
  let sum = 0;
  for (let i = from; i < to; i++) {
    sum += (samples[i] ?? 0) ** 2;
  }
  return Math.sqrt(sum / (to - from));
}

describe('SynthesisCore', () => {
  it('is deterministic for the same seed and changes with another', () => {
    const p = { tempo: 66, mode: MODE.lydian, layers: 3 };
    const a = renderAudio(new SynthesisCore(FS, 7, MODE.majorPentatonic), 10, { ...p });
    const b = renderAudio(new SynthesisCore(FS, 7, MODE.majorPentatonic), 10, { ...p });
    const c = renderAudio(new SynthesisCore(FS, 8, MODE.majorPentatonic), 10, { ...p });
    expect(b).toEqual(a);
    expect(c).not.toEqual(a);
  }, RENDER_TIMEOUT_MS);

  it('is audible within the first half second (HU-03)', () => {
    const core = new SynthesisCore(FS, 1, MODE.majorPentatonic);
    core.setInitialLayers(2);
    const output = renderAudio(core, 0.5, { tempo: 66, mode: MODE.lydian, layers: 2 });
    expect(rms(output, 0, output.length)).toBeGreaterThan(0.01);
  });

  it('over 60 s with level changes produces no NaN, overflow or abrupt jumps', () => {
    const core = new SynthesisCore(FS, 3, MODE.majorPentatonic);
    core.setInitialLayers(3);
    const output = renderAudio(core, 60, { tempo: 76, mode: MODE.majorPentatonic, layers: 3 }, (t, p) => {
      if (t >= 10) {
        p.mode = MODE.lydian;
        p.layers = 2;
        p.tempo = Math.max(66, 76 - (t - 10) / 2); // 20 s ramp from 76 to 66
      }
      if (t >= 40) {
        p.mode = MODE.dronePentatonic;
      }
    });

    let max = 0;
    let maxJump = 0;
    let nonFinite = 0;
    for (let i = 0; i < output.length; i++) {
      const x = output[i] ?? 0;
      if (!Number.isFinite(x)) {
        nonFinite++;
      }
      max = Math.max(max, Math.abs(x));
      if (i > 0) {
        maxJump = Math.max(maxJump, Math.abs(x - (output[i - 1] ?? 0)));
      }
    }
    expect(nonFinite).toBe(0);
    // Wide margin below 1.0 before the master volume, the compressor and the clipper.
    expect(max).toBeLessThan(0.8);
    // A click is a sample-to-sample jump far larger than these frequencies produce.
    expect(maxJump).toBeLessThan(0.05);
  }, RENDER_TIMEOUT_MS);

  it('never steals a voice in 3 minutes with all three layers at the highest tempo', () => {
    const core = new SynthesisCore(FS, 11, MODE.majorPentatonic);
    core.setInitialLayers(3);
    renderAudio(core, 180, { tempo: 76, mode: MODE.lydian, layers: 3 });
    expect(core.voiceSteals).toBe(0);
  }, RENDER_TIMEOUT_MS);

  it('keeps tempo: beats 0 to 60 in 60.5 s at 60 BPM', () => {
    const core = new SynthesisCore(FS, 1, MODE.majorPentatonic);
    renderAudio(core, 60.5, { tempo: 60, mode: MODE.lydian, layers: 1 });
    // The first beat happens at sample 0 (beat 0).
    expect(core.beat).toBe(60);
  }, RENDER_TIMEOUT_MS);

  it('applies a mode change when the cycle closes, with a 30 s crossfade', () => {
    const core = new SynthesisCore(FS, 5, MODE.majorPentatonic);
    const p = { tempo: 60, mode: MODE.majorPentatonic as number, layers: 2 };
    // At 60 BPM a 16-beat cycle lasts 16 s. Lydian is requested at beat 5.
    renderAudio(core, 5.5, p);
    expect(core.beat % BEATS_PER_CYCLE).toBe(5);
    p.mode = MODE.lydian;
    renderAudio(core, 10, p); // up to 15.5 s: the cycle is still open
    expect(core.currentMode).toBe(MODE.majorPentatonic);
    expect(core.activeBank).toBe(0);

    renderAudio(core, 1, p); // crosses beat 16 (16 s)
    expect(core.currentMode).toBe(MODE.lydian);
    expect(core.activeBank).toBe(1);

    renderAudio(core, FADE_DURATION_S / 2 - 0.5, p); // ≈ 15 s into the fade
    expect(core.bankGain(1)).toBeCloseTo(0.5, 1);
    expect(core.bankGain(0)).toBeCloseTo(0.5, 1);

    renderAudio(core, FADE_DURATION_S / 2 + 1, p);
    expect(core.bankGain(1)).toBe(1);
    expect(core.bankGain(0)).toBe(0);
  }, RENDER_TIMEOUT_MS);

  it('turns layers on and off with a 30 s fade', () => {
    const core = new SynthesisCore(FS, 2, MODE.majorPentatonic);
    core.setInitialLayers(3);
    const p = { tempo: 66, mode: MODE.lydian, layers: 1 };
    renderAudio(core, FADE_DURATION_S / 2, p);
    expect(core.layerGain(2)).toBeCloseTo(0.5, 2);
    expect(core.layerGain(1)).toBeCloseTo(0.5, 2);
    expect(core.layerGain(0)).toBe(1);

    renderAudio(core, FADE_DURATION_S / 2 + 0.1, p);
    expect(core.layerGain(2)).toBe(0);
    expect(core.layerGain(1)).toBe(0);
  }, RENDER_TIMEOUT_MS);

  it('clamps the requested layers between 1 and 3', () => {
    expect([MIN_LAYERS, LAYER_COUNT]).toEqual([1, 3]);
    const core = new SynthesisCore(FS, 2, MODE.majorPentatonic);
    core.setInitialLayers(9);
    expect([core.layerGain(0), core.layerGain(1), core.layerGain(2)]).toEqual([1, 1, 1]);
    core.setInitialLayers(0);
    expect([core.layerGain(0), core.layerGain(1), core.layerGain(2)]).toEqual([1, 0, 0]);
  });

  it('starts in the mode it is given', () => {
    for (const mode of Object.values(MODE)) {
      expect(new SynthesisCore(FS, 1, mode).currentMode).toBe(mode);
    }
  });
});
