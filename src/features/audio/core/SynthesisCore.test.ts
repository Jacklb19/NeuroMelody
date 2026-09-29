import { describe, it, expect } from 'vitest';
import { FADE_DURATION_S, SynthesisCore, BEATS_PER_CYCLE } from './SynthesisCore';
import { MODE } from './theory';

const FS = 48_000;
const BLOCK = 128;

interface Params {
  tempo: number;
  mode: number;
  layers: number;
}

/** Renderiza `segundos` de audio bloque a bloque; `alBloque` puede cambiar los parámetros. */
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

describe('NucleoSintesis', () => {
  it('es determinista para una misma semilla y cambia con otra', () => {
    const p = { tempo: 66, mode: MODE.lydian, layers: 3 };
    const a = renderAudio(new SynthesisCore(FS, 7), 10, { ...p });
    const b = renderAudio(new SynthesisCore(FS, 7), 10, { ...p });
    const c = renderAudio(new SynthesisCore(FS, 8), 10, { ...p });
    expect(b).toEqual(a);
    expect(c).not.toEqual(a);
  });

  it('suena desde el primer medio segundo (HU-03)', () => {
    const core = new SynthesisCore(FS, 1);
    core.setInitialLayers(2);
    const output = renderAudio(core, 0.5, { tempo: 66, mode: MODE.lydian, layers: 2 });
    expect(rms(output, 0, output.length)).toBeGreaterThan(0.01);
  });

  it('en 60 s con cambios de nivel no produce NaN, desbordes ni saltos bruscos', () => {
    const core = new SynthesisCore(FS, 3);
    core.setInitialLayers(3);
    const output = renderAudio(core, 60, { tempo: 76, mode: MODE.majorPentatonic, layers: 3 }, (t, p) => {
      if (t >= 10) {
        p.mode = MODE.lydian;
        p.layers = 2;
        p.tempo = Math.max(66, 76 - (t - 10) / 2); // rampa de 20 s de 76 a 66
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
    // Margen amplio bajo 1,0 antes del volumen maestro, el compresor y el recorte.
    expect(max).toBeLessThan(0.8);
    // Un chasquido es un salto de muestra a muestra muy superior al de estas frecuencias.
    expect(maxJump).toBeLessThan(0.05);
  }, 30_000);

  it('nunca roba una voz en 3 minutos con las tres capas al tempo más alto', () => {
    const core = new SynthesisCore(FS, 11);
    core.setInitialLayers(3);
    renderAudio(core, 180, { tempo: 76, mode: MODE.lydian, layers: 3 });
    expect(core.voiceSteals).toBe(0);
  }, 30_000);

  it('respeta el tempo: pulsos 0 a 60 en 60,5 s a 60 BPM', () => {
    const core = new SynthesisCore(FS, 1);
    renderAudio(core, 60.5, { tempo: 60, mode: MODE.lydian, layers: 1 });
    // El primer pulso ocurre en la muestra 0 (pulso 0).
    expect(core.beat).toBe(60);
  });

  it('aplica el cambio de modo al cerrar el ciclo y hace un fundido cruzado de 30 s', () => {
    const core = new SynthesisCore(FS, 5, MODE.majorPentatonic);
    const p = { tempo: 60, mode: MODE.majorPentatonic as number, layers: 2 };
    // A 60 BPM un ciclo de 16 pulsos dura 16 s. Se pide lidio en el pulso 5.
    renderAudio(core, 5.5, p);
    expect(core.beat % BEATS_PER_CYCLE).toBe(5);
    p.mode = MODE.lydian;
    renderAudio(core, 10, p); // hasta 15,5 s: el ciclo sigue abierto
    expect(core.currentMode).toBe(MODE.majorPentatonic);
    expect(core.activeBank).toBe(0);

    renderAudio(core, 1, p); // cruza el pulso 16 (16 s)
    expect(core.currentMode).toBe(MODE.lydian);
    expect(core.activeBank).toBe(1);

    renderAudio(core, FADE_DURATION_S / 2 - 0.5, p); // ≈ 15 s de fundido
    expect(core.bankGain(1)).toBeCloseTo(0.5, 1);
    expect(core.bankGain(0)).toBeCloseTo(0.5, 1);

    renderAudio(core, FADE_DURATION_S / 2 + 1, p);
    expect(core.bankGain(1)).toBe(1);
    expect(core.bankGain(0)).toBe(0);
  });

  it('enciende y apaga capas con un fundido de 30 s', () => {
    const core = new SynthesisCore(FS, 2);
    core.setInitialLayers(3);
    const p = { tempo: 66, mode: MODE.lydian, layers: 1 };
    renderAudio(core, FADE_DURATION_S / 2, p);
    expect(core.layerGain(2)).toBeCloseTo(0.5, 2);
    expect(core.layerGain(1)).toBeCloseTo(0.5, 2);
    expect(core.layerGain(0)).toBe(1);

    renderAudio(core, FADE_DURATION_S / 2 + 0.1, p);
    expect(core.layerGain(2)).toBe(0);
    expect(core.layerGain(1)).toBe(0);
  });

  it('acota las capas pedidas entre 1 y 3', () => {
    const core = new SynthesisCore(FS, 2);
    core.setInitialLayers(9);
    expect([core.layerGain(0), core.layerGain(1), core.layerGain(2)]).toEqual([1, 1, 1]);
    core.setInitialLayers(0);
    expect([core.layerGain(0), core.layerGain(1), core.layerGain(2)]).toEqual([1, 0, 0]);
  });
});
