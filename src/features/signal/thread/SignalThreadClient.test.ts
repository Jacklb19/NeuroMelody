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

describe('ClienteHiloSenal', () => {
  it('reenvía las notificaciones al hilo de señal y reparte los índices', async () => {
    const { env, source, port, client, results } = createScene();
    client.connectSource(source);
    await source.connect();
    env.advance(1000); // 10 s de señal

    expect(port.sent.filter((m) => m.kind === 'notification')).toHaveLength(10);
    expect(results.map((r) => r.timeMs)).toEqual([5000, 10000]);
  });

  it('reinicia el hilo de señal al conectar la fuente y en cada nueva conexión', async () => {
    const { env, source, port, client, results } = createScene();
    client.connectSource(source);
    await source.connect();
    env.advance(1000);
    await source.disconnect();
    results.length = 0;

    await source.connect();
    env.advance(500);

    expect(port.sent.filter((m) => m.kind === 'reset')).toHaveLength(3);
    // Tras reiniciar, la cadencia vuelve a empezar en 5 s.
    expect(results.map((r) => r.timeMs)).toEqual([5000]);
  });

  it('deja de reenviar al desconectar la fuente del cliente', async () => {
    const { env, source, port, client } = createScene();
    const disconnectSource = client.connectSource(source);
    await source.connect();
    env.advance(300);
    disconnectSource();
    env.advance(1000);

    expect(port.sent.filter((m) => m.kind === 'notification')).toHaveLength(3);
  });

  it('avisa de los errores del hilo y de las respuestas no reconocidas', () => {
    const { port, onError, results } = createScene();
    port.receiveFromThread({ kind: 'error', message: 'falló el cálculo' });
    port.receiveFromThread({ kind: 'indices', result: { quality: 'good' } });

    expect(onError.mock.calls).toEqual([
      ['falló el cálculo'],
      ['Respuesta no reconocida del hilo de señal.'],
    ]);
    expect(results).toEqual([]);
  });

  it('el hilo de señal responde con un error ante un mensaje inválido', () => {
    const { port, onError } = createScene();
    // Se salta el tipado a propósito para simular un mensaje corrupto.
    port.send(JSON.parse('{"tipo":"borrar"}') as never);
    expect(onError).toHaveBeenCalledWith('Mensaje no reconocido por el hilo de señal.');
  });

  it('terminar cierra el puerto y olvida a los observadores', () => {
    const { port, client, onError } = createScene();
    client.terminate();
    port.receiveFromThread({ kind: 'error', message: 'tarde' });

    expect(port.terminated).toBe(true);
    expect(onError).not.toHaveBeenCalled();
  });

  it('transfiere el lienzo con la paleta y reenvía los cambios de tamaño', () => {
    const { port, client, onError } = createScene();
    const context = new FakeDrawingContext();
    // jsdom no tiene OffscreenCanvas: basta un objeto con la misma forma.
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

  it('da de baja a un observador', () => {
    const { port, client } = createScene();
    const onError = vi.fn();
    const unsubscribe = client.subscribe({ onError });
    unsubscribe();
    port.receiveFromThread({ kind: 'error', message: 'x' });
    expect(onError).not.toHaveBeenCalled();
  });
});
