import { describe, it, expect } from 'vitest';
import { RR_UNITS_PER_SECOND } from '../rrUnits';
import { SCENARIOS, RELAXATION_DURATION_MS, type ScenarioId } from '../../acquisition/simulator/scenarios';
import { createRrGenerator, type Beat } from './rrGenerator';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

function generateUntil(id: ScenarioId, seed: number, untilMs: number): Beat[] {
  const generator = createRrGenerator(SCENARIOS[id], seed);
  const beats: Beat[] = [];
  let beat = generator.next();
  while (beat.endMs <= untilMs) {
    beats.push(beat);
    beat = generator.next();
  }
  return beats;
}

function meanHr(rr: readonly number[]): number {
  return 60000 / (rr.reduce((s, x) => s + x, 0) / rr.length);
}

// Implementación de referencia mínima para las pruebas; la de producción llega en S2.
function rmssd(rr: readonly number[]): number {
  let sum = 0;
  for (let i = 1; i < rr.length; i++) {
    sum += ((rr[i] ?? 0) - (rr[i - 1] ?? 0)) ** 2;
  }
  return Math.sqrt(sum / (rr.length - 1));
}

describe('crearGeneradorRR', () => {
  it('es determinista para una misma semilla y escenario', () => {
    expect(generateUntil('rest', 99, 60_000)).toEqual(generateUntil('rest', 99, 60_000));
  });

  it('cambia la serie con otra semilla', () => {
    expect(generateUntil('rest', 1, 60_000)).not.toEqual(generateUntil('rest', 2, 60_000));
  });

  it('cuantiza cada intervalo a 1/1024 s y acumula el tiempo sin deriva', () => {
    const beats = generateUntil('activation', 5, 60_000);
    let accumulated = 0;
    for (const { rrMs, endMs } of beats) {
      expect(Number.isInteger((rrMs * RR_UNITS_PER_SECOND) / 1000)).toBe(true);
      accumulated += rrMs;
      expect(endMs).toBe(accumulated);
    }
  });

  it.each([1, 2, 3])('reposo (semilla %i): FC ≈ 62 lpm y RMSSD ≈ 45 ms', (seed) => {
    const rr = generateUntil('rest', seed, FIVE_MINUTES_MS).map((l) => l.rrMs);
    expect(meanHr(rr)).toBeGreaterThan(60);
    expect(meanHr(rr)).toBeLessThan(64);
    expect(rmssd(rr)).toBeGreaterThan(35);
    expect(rmssd(rr)).toBeLessThan(60);
  });

  it.each([1, 2, 3])('activación (semilla %i): FC ≈ 92 lpm y RMSSD ≈ 10 ms', (seed) => {
    const rr = generateUntil('activation', seed, FIVE_MINUTES_MS).map((l) => l.rrMs);
    expect(meanHr(rr)).toBeGreaterThan(90);
    expect(meanHr(rr)).toBeLessThan(94);
    expect(rmssd(rr)).toBeGreaterThan(5);
    expect(rmssd(rr)).toBeLessThan(20);
  });

  it('mantiene exactamente la serie de reposo con semilla 1 (regresión)', () => {
    const generator = createRrGenerator(SCENARIOS.rest, 1);
    expect(Array.from({ length: 6 }, () => generator.next().rrMs)).toEqual([
      949.21875, 1024.4140625, 937.5, 894.53125, 910.15625, 1029.296875,
    ]);
  });

  describe('escenario artefactos', () => {
    const HORIZON_MS = 30 * 60 * 1000;

    const withArtifacts = generateUntil('artifacts', 1, HORIZON_MS);
    const baseEnds = new Set(generateUntil('rest', 1, HORIZON_MS).map((l) => l.endMs));
    // Un latido prematuro es el único que termina en un instante que no existe
    // en la serie base (el compensatorio vuelve a alinearse con ella).
    const prematureBeats = withArtifacts
      .map((beat, i) => ({ beat, i }))
      .filter(({ beat }) => !baseEnds.has(beat.endMs));

    it('es determinista', () => {
      expect(generateUntil('artifacts', 4, 120_000)).toEqual(generateUntil('artifacts', 4, 120_000));
    });

    it('inserta latidos prematuros con una frecuencia cercana al 2 %', () => {
      const ratio = prematureBeats.length / withArtifacts.length;
      expect(ratio).toBeGreaterThan(0.01);
      expect(ratio).toBeLessThan(0.03);
    });

    it('cada par prematuro + compensatorio conserva el ritmo de la serie base', () => {
      expect(prematureBeats.length).toBeGreaterThan(0);
      for (const { beat, i } of prematureBeats) {
        const compensatory = withArtifacts[i + 1];
        expect(compensatory !== undefined && baseEnds.has(compensatory.endMs)).toBe(true);
        // El prematuro dura ≈ 70 % de un RR normal: ≈ 0,7 / (0,7 + 1,3) del par.
        const fraction = beat.rrMs / (beat.rrMs + (compensatory?.rrMs ?? 0));
        expect(fraction).toBeGreaterThan(0.3);
        expect(fraction).toBeLessThan(0.4);
      }
    });
  });

  it('relajación progresiva: pasa de activación a reposo en 10 minutos', () => {
    const beats = generateUntil('progressive_relaxation', 1, RELAXATION_DURATION_MS + 120_000);
    const firstMinute = beats.filter((l) => l.endMs <= 60_000).map((l) => l.rrMs);
    const afterTransition = beats
      .filter((l) => l.endMs > RELAXATION_DURATION_MS)
      .map((l) => l.rrMs);

    expect(meanHr(firstMinute)).toBeGreaterThan(85);
    expect(meanHr(afterTransition)).toBeLessThan(65);
  });
});
