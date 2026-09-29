import { describe, it, expect } from 'vitest';
import { readPlaybackStats } from '../engine/playbackStats';
import { LEVEL_IDS, LEVELS, CALIBRATION_LEVEL } from './levels';
import { dbToGain, tempoRampDurationS, gainToDb } from './ramps';
import { generateImpulseResponse } from './impulseResponse';

describe('rampas', () => {
  it.each([
    [66, 76, 20],
    [76, 66, 20],
    [66, 59, 20],
    [76, 59, 34],
    [66, 66, 20],
  ])('de %i a %i BPM dura %i s', (from, to, expected) => {
    expect(tempoRampDurationS(from, to)).toBe(expected);
  });

  it('nunca es menor de 20 s (RNF-03)', () => {
    for (let from = 40; from <= 120; from += 1) {
      for (let to = 40; to <= 120; to += 7) {
        expect(tempoRampDurationS(from, to)).toBeGreaterThanOrEqual(20);
      }
    }
  });

  it('convierte entre dB y ganancia', () => {
    expect(dbToGain(0)).toBe(1);
    expect(dbToGain(-12)).toBeCloseTo(0.2512, 4);
    expect(gainToDb(0.5)).toBeCloseTo(-6.0206, 4);
  });
});

describe('niveles musicales', () => {
  it('reflejan la tabla aprobada', () => {
    expect(LEVEL_IDS.map((id) => {
      const n = LEVELS[id];
      return [n.tempo, n.mode, n.layers, n.brightnessHz, n.reverb];
    })).toEqual([
      [76, 0, 3, 6000, 0.25],
      [66, 1, 2, 3500, 0.35],
      [59, 2, 2, 2000, 0.5],
    ]);
    expect(CALIBRATION_LEVEL).toBe('intermedio');
  });

  it('el tempo de la meta está entre 58 y 60 BPM', () => {
    expect(LEVELS.meta.tempo).toBeGreaterThanOrEqual(58);
    expect(LEVELS.meta.tempo).toBeLessThanOrEqual(60);
  });
});

describe('generarRespuestaImpulso', () => {
  const [left, right] = generateImpulseResponse(48_000);

  function energy(channel: Float32Array, from: number, to: number): number {
    let sum = 0;
    for (let i = from; i < to; i++) {
      sum += (channel[i] ?? 0) ** 2;
    }
    return sum;
  }

  it('dura 3,5 s en dos canales distintos', () => {
    expect(left.length).toBe(168_000);
    expect(right.length).toBe(168_000);
    expect(right).not.toEqual(left);
  });

  it('decae exponencialmente: el último décimo tiene mucha menos energía que el primero', () => {
    const tenth = left.length / 10;
    expect(energy(left, 9 * tenth, left.length)).toBeLessThan(
      energy(left, 0, tenth) * 1e-4,
    );
  });

  it('empieza en cero, sin chasquido, y es determinista', () => {
    expect(Math.abs(left[0] ?? 1)).toBe(0);
    expect(generateImpulseResponse(48_000)[0]).toEqual(left);
  });
});

describe('leerEstadisticasReproduccion', () => {
  it('devuelve null sin la API o con datos incompletos', () => {
    expect(readPlaybackStats({})).toBeNull();
    expect(readPlaybackStats(null)).toBeNull();
    expect(readPlaybackStats({ playbackStats: { underrunEvents: 1 } })).toBeNull();
  });
});
