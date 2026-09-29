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

describe('FuenteSimulada', () => {
  it('declara el tipo simulador y empieza desconectada', () => {
    const source = new SimulatedSource({ scenario: 'rest', seed: 1, speed: 1 });
    expect(source.kind).toBe('simulator');
    expect(source.state).toBe('disconnected');
  });

  it('pasa por conectando y conectada, y vuelve a desconectada', async () => {
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

  it('ignora una segunda conexión mientras ya está conectada', async () => {
    const { env, source } = await createConnectedSource();
    await source.connect();
    expect(env.scheduledTasks).toBe(1);
  });

  it('emite una notificación por segundo de señal a velocidad 1×', async () => {
    const { env, notifications } = await createConnectedSource(1);
    env.advance(10_000);
    expect(notifications.map((n) => n.timeMs)).toEqual([
      1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000,
    ]);
  });

  it('acelera el tiempo de señal a velocidad 10×', async () => {
    const { env, notifications } = await createConnectedSource(10);
    env.advance(1000);
    expect(notifications).toHaveLength(10);
    expect(notifications.at(-1)?.timeMs).toBe(10_000);
  });

  it.each<Speed>([2, 5, 10])(
    'produce la misma serie a 1× y a %i× (reproducible)',
    async (speed) => {
      const slow = await createConnectedSource(1, 'progressive_relaxation', 7);
      const fast = await createConnectedSource(speed, 'progressive_relaxation', 7);
      slow.env.advance(300_000);
      fast.env.advance(300_000 / speed);
      expect(fast.notifications).toHaveLength(300);
      expect(fast.notifications).toEqual(slow.notifications);
    },
  );

  it('entrega en orden todo lo pendiente tras un temporizador retrasado', async () => {
    const continuous = await createConnectedSource();
    const delayed = await createConnectedSource();
    continuous.env.advance(30_000);
    delayed.env.jump(30_000);
    expect(delayed.notifications).toHaveLength(30);
    expect(delayed.notifications).toEqual(continuous.notifications);
  });

  it('emite intervalos cuantizados a 1/1024 s y una FC coherente, sin errores de validación', async () => {
    const { env, notifications, onError } = await createConnectedSource(10, 'progressive_relaxation');
    env.advance(60_000); // 10 minutos de señal

    const allRr = notifications.flatMap((n) => n.rrIntervalsMs);
    for (const rr of allRr) {
      expect(Number.isInteger((rr * RR_UNITS_PER_SECOND) / 1000)).toBe(true);
    }
    // La suma de los RR entregados no puede superar el tiempo de señal transcurrido.
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

  it('en el escenario artefactos pierde el contacto 5 s cada 90 s', async () => {
    const { env, notifications, onError } = await createConnectedSource(10, 'artifacts');
    env.advance(20_000); // 200 s de señal

    const noContact = notifications.filter((n) => n.sensorContact === false);
    expect(noContact.map((n) => n.timeMs)).toEqual([
      91_000, 92_000, 93_000, 94_000, 95_000, 181_000, 182_000, 183_000, 184_000, 185_000,
    ]);
    expect(noContact.every((n) => n.rrIntervalsMs.length === 0)).toBe(true);

    // Durante la pérdida se mantiene la última FC reportada.
    const before = notifications.find((n) => n.timeMs === 90_000);
    expect(noContact[0]?.heartRate).toBe(before?.heartRate);
    expect(notifications.find((n) => n.timeMs === 96_000)?.sensorContact).toBe(true);
    expect(onError).not.toHaveBeenCalled();
  });

  it('los escenarios limpios nunca pierden el contacto', async () => {
    const { env, notifications } = await createConnectedSource(10, 'rest');
    env.advance(20_000);
    expect(notifications.every((n) => n.sensorContact === true)).toBe(true);
  });

  it('no emite nada tras desconectar', async () => {
    const { env, source, notifications } = await createConnectedSource();
    env.advance(3000);
    await source.disconnect();
    env.jump(10_000);
    expect(notifications).toHaveLength(3);
  });

  it('deja de emitir si un observador desconecta durante una notificación', async () => {
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

  it('al reconectar reinicia el tiempo de señal y repite la serie', async () => {
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
