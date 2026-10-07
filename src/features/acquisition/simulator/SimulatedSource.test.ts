import { describe, it, expect, vi } from 'vitest';
import { createFakeTimeEnvironment } from '../../../test/fakeTimeEnvironment';
import type { BeatNotification } from '../../acquisition/contract';
import { RR_UNITS_PER_SECOND } from '../rrUnits';
import type { ScenarioId } from './scenarios';
import { SimulatedSource, type Speed } from './SimulatedSource';

async function createConnectedSource(
  speed: Speed = 1,
  scenario: ScenarioId = 'rest',
  seed = 1,
) {
  const env = createFakeTimeEnvironment();
  const source = new SimulatedSource({ scenario, seed, speed, ...env });
  const notifications: BeatNotification[] = [];
  const onError = vi.fn();
  source.subscribe({ onNotification: (n) => notifications.push(n), onError });
  await source.connect();
  return { env, source, notifications, onError };
}

describe('SimulatedSource', () => {
  it('declares the simulator kind and starts disconnected', () => {
    const source = new SimulatedSource({ scenario: 'rest', seed: 1, speed: 1 });
    expect(source.kind).toBe('simulator');
    expect(source.state).toBe('disconnected');
  });

  it('goes through connecting and connected, then back to disconnected', async () => {
    const env = createFakeTimeEnvironment();
    const source = new SimulatedSource({ scenario: 'rest', seed: 1, speed: 1, ...env });
    const onStateChange = vi.fn();
    source.subscribe({ onStateChange });

    await source.connect();
    expect(source.state).toBe('connected');
    expect(env.active).toBe(true);

    await source.disconnect();
    expect(source.state).toBe('disconnected');
    expect(env.active).toBe(false);
    expect(onStateChange.mock.calls).toEqual([['connecting'], ['connected'], ['disconnected']]);
  });

  it('ignores a second connect while already connected', async () => {
    const { env, source } = await createConnectedSource();
    await source.connect();
    expect(env.scheduledTasks).toBe(1);
  });

  it('emits one notification per signal second at 1× speed', async () => {
    const { env, notifications } = await createConnectedSource(1);
    env.advance(10_000);
    expect(notifications.map((n) => n.timeMs)).toEqual([
      1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000,
    ]);
  });

  it('speeds up signal time at 10× speed', async () => {
    const { env, notifications } = await createConnectedSource(10);
    env.advance(1000);
    expect(notifications).toHaveLength(10);
    expect(notifications.at(-1)?.timeMs).toBe(10_000);
  });

  it.each<Speed>([2, 5, 10])(
    'produces the same series at 1× and at %i× (reproducible)',
    async (speed) => {
      const slow = await createConnectedSource(1, 'progressive_relaxation', 7);
      const fast = await createConnectedSource(speed, 'progressive_relaxation', 7);
      slow.env.advance(300_000);
      fast.env.advance(300_000 / speed);
      expect(fast.notifications).toHaveLength(300);
      expect(fast.notifications).toEqual(slow.notifications);
    },
  );

  it('delivers everything pending, in order, after a delayed timer', async () => {
    const continuous = await createConnectedSource();
    const delayed = await createConnectedSource();
    continuous.env.advance(30_000);
    delayed.env.jump(30_000);
    expect(delayed.notifications).toHaveLength(30);
    expect(delayed.notifications).toEqual(continuous.notifications);
  });

  it('emits intervals quantized to 1/1024 s and a consistent heart rate, without validation errors', async () => {
    const { env, notifications, onError } = await createConnectedSource(10, 'progressive_relaxation');
    env.advance(60_000); // 10 minutes of signal

    const allRr = notifications.flatMap((n) => n.rrIntervalsMs);
    for (const rr of allRr) {
      expect(Number.isInteger((rr * RR_UNITS_PER_SECOND) / 1000)).toBe(true);
    }
    // The sum of delivered RR intervals cannot exceed the elapsed signal time.
    const rrSum = allRr.reduce((s, rr) => s + rr, 0);
    expect(rrSum).toBeLessThanOrEqual(600_000);
    expect(rrSum).toBeGreaterThan(600_000 - 1500);

    for (const n of notifications) {
      expect(Number.isInteger(n.heartRate)).toBe(true);
      expect(n.heartRate).toBeGreaterThan(50);
      expect(n.heartRate).toBeLessThan(110);
      expect(n.sensorContact).toBe(true);
    }
    expect(onError).not.toHaveBeenCalled();
  });

  it('in the artifacts scenario it loses contact for 5 s every 90 s', async () => {
    const { env, notifications, onError } = await createConnectedSource(10, 'artifacts');
    env.advance(20_000); // 200 s of signal

    const noContact = notifications.filter((n) => n.sensorContact === false);
    expect(noContact.map((n) => n.timeMs)).toEqual([
      91_000, 92_000, 93_000, 94_000, 95_000, 181_000, 182_000, 183_000, 184_000, 185_000,
    ]);
    expect(noContact.every((n) => n.rrIntervalsMs.length === 0)).toBe(true);

    // During the loss the last reported heart rate is kept.
    const before = notifications.find((n) => n.timeMs === 90_000);
    expect(noContact[0]?.heartRate).toBe(before?.heartRate);
    expect(notifications.find((n) => n.timeMs === 96_000)?.sensorContact).toBe(true);
    expect(onError).not.toHaveBeenCalled();
  });

  it('clean scenarios never lose contact', async () => {
    const { env, notifications } = await createConnectedSource(10, 'rest');
    env.advance(20_000);
    expect(notifications.every((n) => n.sensorContact === true)).toBe(true);
  });

  it('emits nothing after disconnecting', async () => {
    const { env, source, notifications } = await createConnectedSource();
    env.advance(3000);
    await source.disconnect();
    env.jump(10_000);
    expect(notifications).toHaveLength(3);
  });

  it('stops emitting if an observer disconnects during a notification', async () => {
    const env = createFakeTimeEnvironment();
    const source = new SimulatedSource({ scenario: 'rest', seed: 1, speed: 1, ...env });
    const onNotification = vi.fn(() => {
      void source.disconnect();
    });
    source.subscribe({ onNotification });
    await source.connect();

    env.jump(10_000);

    expect(onNotification).toHaveBeenCalledOnce();
  });

  it('on reconnect it resets signal time and repeats the series', async () => {
    const { env, source, notifications } = await createConnectedSource();
    env.advance(5000);
    const firstConnection = [...notifications];

    await source.disconnect();
    notifications.length = 0;
    await source.connect();
    env.advance(5000);

    expect(notifications).toEqual(firstConnection);
  });
});
