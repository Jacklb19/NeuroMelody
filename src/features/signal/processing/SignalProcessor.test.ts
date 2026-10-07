import { describe, it, expect } from 'vitest';
import { createFakeTimeEnvironment } from '../../../test/fakeTimeEnvironment';
import type { BeatNotification } from '../../acquisition/contract';
import type { ScenarioId } from '../../acquisition/simulator/scenarios';
import { SimulatedSource } from '../../acquisition/simulator/SimulatedSource';
import type { Speed } from '../../acquisition/speedCatalog';
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

/** Feeds the processor from the simulator (fake clock) for `signalSeconds`. */
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

describe('SignalProcessor', () => {
  it('places the beats of a notification backwards from its instant', () => {
    const { processor } = createProcessor();
    processor.process(notification(2000, [500, 400]));
    expect(processor.snapshot.beats.map((beat) => beat.endMs)).toEqual([1600, 2000]);
  });

  it('publishes indices every five seconds of signal time', async () => {
    const { results } = await simulate('rest', 30);
    expect(results.map((r) => r.timeMs)).toEqual([5000, 10000, 15000, 20000, 25000, 30000]);
  });

  it('publishes the same results at 1× and at 10×', async () => {
    const slow = await simulate('progressive_relaxation', 120, 1);
    const fast = await simulate('progressive_relaxation', 120, 10);
    expect(fast.results).toEqual(slow.results);
  });

  it('reports "collecting" without indices until it has 60 s of valid NN', async () => {
    const { results } = await simulate('rest', 70);
    const at55 = results.find((r) => r.timeMs === 55_000);
    const at70 = results.find((r) => r.timeMs === 70_000);

    expect(at55).toMatchObject({ quality: 'collecting', meanHr: null, rmssd: null, sdnn: null });
    expect(at70?.quality).toBe('good');
    expect(at70?.meanHr).toBeGreaterThan(55);
    expect(at70?.rmssd).toBeGreaterThan(0);
    expect(at70?.coverageMs).toBe(70_000);
  });

  it('discards no beats and marks no low-quality segments at clean rest', async () => {
    const { processor, results } = await simulate('rest', 300);
    const last = results.at(-1);
    expect(last?.discardedBeats).toBe(0);
    expect(processor.snapshot.segments).toEqual([]);
    expect(last?.coverageMs).toBe(300_000);
  });

  describe('RF-04 verification with the artifacts scenario', () => {
    it('keeps the filtered RMSSD within ±10 % of rest with the same seed while the raw one is clearly higher', async () => {
      const reference = await simulate('rest', 300);
      const withArtifacts = await simulate('artifacts', 300);
      const referenceRmssd = reference.results.at(-1)?.rmssd ?? Number.NaN;
      const filteredRmssd = withArtifacts.results.at(-1)?.rmssd ?? Number.NaN;
      const rawRmssd = unfilteredRmssd(withArtifacts.notifications, 0);

      expect(Math.abs(filteredRmssd - referenceRmssd) / referenceRmssd).toBeLessThan(0.1);
      expect(rawRmssd).toBeGreaterThan(1.5 * referenceRmssd);
      expect(withArtifacts.results.at(-1)?.discardedBeats).toBeGreaterThan(0);
    });

    it('marks every contact loss as low quality', async () => {
      const { processor, results } = await simulate('artifacts', 200);
      const segments = processor.snapshot.segments;

      expect(segments.some((segment) => segment.startMs <= 91_000 && segment.endMs >= 95_000)).toBe(true);
      expect(segments.some((segment) => segment.startMs <= 181_000 && segment.endMs >= 185_000)).toBe(true);
      expect(results.find((r) => r.timeMs === 95_000)?.quality).toBe('low');
      expect(results.find((r) => r.timeMs === 110_000)?.quality).toBe('good');
    });
  });

  it('does not treat beats on either side of a contact loss as consecutive', () => {
    const { processor } = createProcessor();
    processor.process(notification(1000, [1000]));
    processor.process(notification(2000, [1000]));
    processor.process(notification(3000, [], false));
    processor.process(notification(4000, [1000]));
    processor.process(notification(5000, [1000]));

    const beats = processor.snapshot.beats;
    expect(beats.map((beat) => beat.contiguousWithPrevious)).toEqual([true, true, false, true]);
    expect(processor.snapshot.segments).toEqual([{ startMs: 2000, endMs: 3000 }]);
  });

  it('discards RR that arrive without sensor contact', () => {
    const { processor } = createProcessor();
    processor.process(notification(1000, [1000], false));
    expect(processor.snapshot.beats[0]).toMatchObject({
      accepted: false,
      discardReason: 'no_contact',
    });
  });

  it('marks a gap of more than 3 s without RR and breaks continuity', () => {
    const { processor } = createProcessor();
    processor.process(notification(1000, [1000]));
    for (let t = 2000; t <= 5000; t += 1000) {
      processor.process(notification(t, []));
    }
    processor.process(notification(6000, [1000]));

    expect(processor.snapshot.segments).toEqual([{ startMs: 1000, endMs: 6000 }]);
    expect(processor.snapshot.beats.at(-1)?.contiguousWithPrevious).toBe(false);
  });

  it('marks low quality when less than 80 % of recent beats are accepted', () => {
    const { processor, results } = createProcessor();
    // Reference of 5 beats at 1000 ms, then 3 discards out of 5: 7 of 10 accepted (70 %).
    const series = [1000, 1000, 1000, 1000, 1000, 1500, 1000, 1500, 1000, 1500];
    series.forEach((rr, i) => {
      processor.process(notification((i + 1) * 1000, [rr]));
    });
    expect(results.at(-1)?.quality).toBe('low');
  });

  it('reset empties the window and publishes again from 5 s', () => {
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
