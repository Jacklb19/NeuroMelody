import { describe, it, expect, vi } from 'vitest';
import { createFakeTimeEnvironment } from '../../../test/fakeTimeEnvironment';
import { FakeDrawingContext } from '../../../test/fakeDrawingContext';
import { createInProcessPort } from '../../../test/inProcessThreadPort';
import { SimulatedSource } from '../../acquisition/simulator/SimulatedSource';
import type { IndicesResult } from '../processing/SignalProcessor';
import { SignalThreadClient } from './SignalThreadClient';

function createScene() {
  const env = createFakeTimeEnvironment();
  const source = new SimulatedSource({ scenario: 'rest', seed: 1, speed: 10, ...env });
  const port = createInProcessPort();
  const client = new SignalThreadClient(port);
  const results: IndicesResult[] = [];
  const onError = vi.fn();
  client.subscribe({ onIndices: (r) => results.push(r), onError });
  return { env, source, port, client, results, onError };
}

describe('SignalThreadClient', () => {
  it('forwards notifications to the signal thread and distributes the indices', async () => {
    const { env, source, port, client, results } = createScene();
    client.connectSource(source);
    await source.connect();
    env.advance(1000); // 10 s of signal

    expect(port.sent.filter((m) => m.kind === 'notification')).toHaveLength(10);
    expect(results.map((r) => r.timeMs)).toEqual([5000, 10000]);
  });

  it('resets the signal thread when the source is attached and on every new connection', async () => {
    const { env, source, port, client, results } = createScene();
    client.connectSource(source);
    await source.connect();
    env.advance(1000);
    await source.disconnect();
    results.length = 0;

    await source.connect();
    env.advance(500);

    expect(port.sent.filter((m) => m.kind === 'reset')).toHaveLength(3);
    // After a reset, the cadence starts again at 5 s.
    expect(results.map((r) => r.timeMs)).toEqual([5000]);
  });

  it('stops forwarding once the source is detached from the client', async () => {
    const { env, source, port, client } = createScene();
    const disconnectSource = client.connectSource(source);
    await source.connect();
    env.advance(300);
    disconnectSource();
    env.advance(1000);

    expect(port.sent.filter((m) => m.kind === 'notification')).toHaveLength(3);
  });

  it('reports thread errors and unrecognized responses', () => {
    const { port, onError, results } = createScene();
    port.receiveFromThread({ kind: 'error', message: 'computation failed' });
    port.receiveFromThread({ kind: 'indices', result: { quality: 'good' } });

    expect(onError.mock.calls).toEqual([
      ['computation failed'],
      ['Respuesta no reconocida del hilo de señal.'],
    ]);
    expect(results).toEqual([]);
  });

  it('gets an error from the signal thread for an invalid message', () => {
    const { port, onError } = createScene();
    // Bypasses typing on purpose to simulate a corrupt message.
    port.send(JSON.parse('{"type":"delete"}') as never);
    expect(onError).toHaveBeenCalledWith('Mensaje no reconocido por el hilo de señal.');
  });

  it('terminate closes the port and forgets the observers', () => {
    const { port, client, onError } = createScene();
    client.terminate();
    port.receiveFromThread({ kind: 'error', message: 'late' });

    expect(port.terminated).toBe(true);
    expect(onError).not.toHaveBeenCalled();
  });

  it('transfers the canvas with the palette and forwards size changes', () => {
    const { port, client, onError } = createScene();
    const context = new FakeDrawingContext();
    // jsdom has no OffscreenCanvas: an object with the same shape is enough.
    const canvas = { width: 0, height: 0, getContext: () => context } as unknown as OffscreenCanvas;
    const palette = {
      line: 'a',
      grid: 'b',
      text: 'c',
      discarded: 'd',
      lowQualityBackground: 'e',
      lowQualityHatch: 'f',
      font: '14px sans-serif',
    };

    client.attachCanvas(canvas, palette, { widthCss: 300, heightCss: 100, scale: 2 });
    client.resize({ widthCss: 400, heightCss: 100, scale: 2 });

    expect(port.sent.map((m) => m.kind)).toEqual(['init-canvas', 'resize']);
    expect(canvas.width).toBe(800);
    expect(context.count('clearRect')).toBe(2);
    expect(onError).not.toHaveBeenCalled();
  });

  it('unsubscribes an observer', () => {
    const { port, client } = createScene();
    const onError = vi.fn();
    const unsubscribe = client.subscribe({ onError });
    unsubscribe();
    port.receiveFromThread({ kind: 'error', message: 'x' });
    expect(onError).not.toHaveBeenCalled();
  });
});
