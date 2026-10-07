import { describe, it, expect } from 'vitest';
import { createFakeTimeEnvironment } from '../../../test/fakeTimeEnvironment';
import type { BeatNotification } from '../../acquisition/contract';
import type { ScenarioId } from '../../acquisition/simulator/scenarios';
import { SimulatedSource, type Speed } from '../../acquisition/simulator/SimulatedSource';
import { SignalProcessor, type IndicesResult } from './SignalProcessor';

function notification(
  timeMs: number,
  rrIntervalsMs: number[],
  sensorContact: boolean | null = true,
): BeatNotification {
  return { timeMs, heartRate: 60, rrIntervalsMs, sensorContact };
}

function createProcessor() {
  const results: IndicesResult[] = [];
  const processor = new SignalProcessor((r) => results.push(r));
  return { processor, results };
}

/** Alimenta el procesador con el simulador (reloj falso) durante `segundosSenal`. */
async function simulate(
  scenario: ScenarioId,
  signalSeconds: number,
  speed: Speed = 10,
  seed = 1,
) {
  const env = createFakeTimeEnvironment();
  const source = new SimulatedSource({ scenario, seed, speed, ...env });
  const { processor, results } = createProcessor();
  const notifications: BeatNotification[] = [];
  source.subscribe({
    onNotification: (n) => {
      notifications.push(n);
      processor.process(n);
    },
  });
  await source.connect();
  env.advance((signalSeconds * 1000) / speed);
  return { processor, results, notifications };
}

function unfilteredRmssd(notifications: readonly BeatNotification[], fromMs: number): number {
  const rr = notifications.filter((n) => n.timeMs > fromMs).flatMap((n) => n.rrIntervalsMs);
  let sum = 0;
  for (let i = 1; i < rr.length; i++) {
    sum += ((rr[i] ?? 0) - (rr[i - 1] ?? 0)) ** 2;
  }
  return Math.sqrt(sum / (rr.length - 1));
}

describe('ProcesadorSenal', () => {
  it('ubica los latidos de una notificación hacia atrás desde su instante', () => {
    const { processor } = createProcessor();
    processor.process(notification(2000, [500, 400]));
    expect(processor.snapshot.beats.map((l) => l.endMs)).toEqual([1600, 2000]);
  });

  it('publica índices cada 5 s de tiempo de señal', async () => {
    const { results } = await simulate('rest', 30);
    expect(results.map((r) => r.timeMs)).toEqual([5000, 10000, 15000, 20000, 25000, 30000]);
  });

  it('publica los mismos resultados a 1× y a 10×', async () => {
    const slow = await simulate('progressive_relaxation', 120, 1);
    const fast = await simulate('progressive_relaxation', 120, 10);
    expect(fast.results).toEqual(slow.results);
  });

  it('muestra "reuniendo" sin índices hasta tener 60 s de NN válidos', async () => {
    const { results } = await simulate('rest', 70);
    const at55 = results.find((r) => r.timeMs === 55_000);
    const at70 = results.find((r) => r.timeMs === 70_000);

    expect(at55).toMatchObject({ quality: 'collecting', meanHr: null, rmssd: null, sdnn: null });
    expect(at70?.quality).toBe('good');
    expect(at70?.meanHr).toBeGreaterThan(55);
    expect(at70?.rmssd).toBeGreaterThan(0);
    expect(at70?.coverageMs).toBe(70_000);
  });

  it('en reposo limpio no descarta latidos ni marca tramos de baja calidad', async () => {
    const { processor, results } = await simulate('rest', 300);
    const last = results.at(-1);
    expect(last?.discardedBeats).toBe(0);
    expect(processor.snapshot.segments).toEqual([]);
    expect(last?.coverageMs).toBe(300_000);
  });

  describe('verificación de RF-04 con el escenario artefactos', () => {
    it('el RMSSD filtrado queda a ±10 % del de reposo con la misma semilla y el crudo es claramente mayor', async () => {
      const reference = await simulate('rest', 300);
      const withArtifacts = await simulate('artifacts', 300);
      const referenceRmssd = reference.results.at(-1)?.rmssd ?? Number.NaN;
      const filteredRmssd = withArtifacts.results.at(-1)?.rmssd ?? Number.NaN;
      const rawRmssd = unfilteredRmssd(withArtifacts.notifications, 0);

      expect(Math.abs(filteredRmssd - referenceRmssd) / referenceRmssd).toBeLessThan(0.1);
      expect(rawRmssd).toBeGreaterThan(1.5 * referenceRmssd);
      expect(withArtifacts.results.at(-1)?.discardedBeats).toBeGreaterThan(0);
    });

    it('marca como baja calidad cada pérdida de contacto', async () => {
      const { processor, results } = await simulate('artifacts', 200);
      const segments = processor.snapshot.segments;

      expect(segments.some((t) => t.startMs <= 91_000 && t.endMs >= 95_000)).toBe(true);
      expect(segments.some((t) => t.startMs <= 181_000 && t.endMs >= 185_000)).toBe(true);
      expect(results.find((r) => r.timeMs === 95_000)?.quality).toBe('low');
      expect(results.find((r) => r.timeMs === 110_000)?.quality).toBe('good');
    });
  });

  it('no considera consecutivos los latidos a ambos lados de una pérdida de contacto', () => {
    const { processor } = createProcessor();
    processor.process(notification(1000, [1000]));
    processor.process(notification(2000, [1000]));
    processor.process(notification(3000, [], false));
    processor.process(notification(4000, [1000]));
    processor.process(notification(5000, [1000]));

    const beats = processor.snapshot.beats;
    expect(beats.map((l) => l.contiguousWithPrevious)).toEqual([true, true, false, true]);
    expect(processor.snapshot.segments).toEqual([{ startMs: 2000, endMs: 3000 }]);
  });

  it('descarta los RR que llegan sin contacto del sensor', () => {
    const { processor } = createProcessor();
    processor.process(notification(1000, [1000], false));
    expect(processor.snapshot.beats[0]).toMatchObject({
      accepted: false,
      discardReason: 'no_contact',
    });
  });

  it('marca un hueco de más de 3 s sin RR y rompe la continuidad', () => {
    const { processor } = createProcessor();
    processor.process(notification(1000, [1000]));
    for (let t = 2000; t <= 5000; t += 1000) {
      processor.process(notification(t, []));
    }
    processor.process(notification(6000, [1000]));

    expect(processor.snapshot.segments).toEqual([{ startMs: 1000, endMs: 6000 }]);
    expect(processor.snapshot.beats.at(-1)?.contiguousWithPrevious).toBe(false);
  });

  it('marca baja calidad si se acepta menos del 80 % de los latidos recientes', () => {
    const { processor, results } = createProcessor();
    // Referencia de 5 latidos en 1000 ms y luego 3 descartes de 5: 7 de 10 aceptados (70 %).
    const series = [1000, 1000, 1000, 1000, 1000, 1500, 1000, 1500, 1000, 1500];
    series.forEach((rr, i) => {
      processor.process(notification((i + 1) * 1000, [rr]));
    });
    expect(results.at(-1)?.quality).toBe('low');
  });

  it('reiniciar vacía la ventana y vuelve a publicar desde 5 s', () => {
    const { processor, results } = createProcessor();
    for (let t = 1000; t <= 10_000; t += 1000) {
      processor.process(notification(t, [1000]));
    }
    processor.reset();
    expect(processor.snapshot.beats).toEqual([]);

    results.length = 0;
    for (let t = 1000; t <= 5000; t += 1000) {
      processor.process(notification(t, [1000]));
    }
    expect(results.map((r) => r.timeMs)).toEqual([5000]);
  });

  it('publishes LF/HF after two minutes and separates rest from activation', async () => {
    const early = await simulate('rest', 110);
    expect(early.results.at(-1)?.lfHfRatio).toBeNull();

    const rest = (await simulate('rest', 300)).results.at(-1);
    const activation = (await simulate('activation', 300)).results.at(-1);
    expect(rest?.lfHfRatio).toBeLessThan(1);
    expect(activation?.lfHfRatio).toBeGreaterThan(1);
  });
});
