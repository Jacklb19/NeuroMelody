import { describe, it, expect, beforeAll } from 'vitest';
import { CEILING } from '../core/softClip';
import { MODE } from '../core/theory';
import { TelemetryReader, createTelemetryBuffer } from '../telemetry/telemetryRing';
import type { ProcessorClass, BlockParams } from './workletScope';
import {
  SYNTHESIZER_DESCRIPTORS,
  CLIPPER_NAME,
  SYNTHESIZER_NAME,
  readClipperOptions,
  readSynthesizerOptions,
} from './workletContract';

const registered = new Map<string, ProcessorClass>();

// Ámbito del AudioWorklet simulado: los módulos lo leen de globalThis al cargarse.
beforeAll(async () => {
  Object.assign(globalThis, {
    sampleRate: 48_000,
    AudioWorkletProcessor: class {
      readonly port = new MessageChannel().port1;
    },
    registerProcessor: (name: string, processorClass: ProcessorClass) => {
      registered.set(name, processorClass);
    },
  });
  await import('./synthesizer.worklet');
  await import('./clipper.worklet');
});

function block(channels: number): Float32Array[] {
  return Array.from({ length: channels }, () => new Float32Array(128));
}

function create(name: string, processorOptions: unknown) {
  const Processor = registered.get(name);
  if (Processor === undefined) {
    throw new Error(`No se registró ${name}`);
  }
  return new Processor({ processorOptions });
}

describe('procesador sintetizador', () => {
  const options = { seed: 1, initialMode: MODE.lydian, initialLayers: 2 };
  const params: BlockParams = {
    tempo: new Float32Array([66]),
    mode: new Float32Array([MODE.lydian]),
    layers: new Float32Array([2]),
  };

  it('se registra con sus parámetros de tasa k', () => {
    const Processor = registered.get(SYNTHESIZER_NAME) as unknown as {
      parameterDescriptors: typeof SYNTHESIZER_DESCRIPTORS;
    };
    expect(Processor.parameterDescriptors.map((d) => [d.name, d.automationRate])).toEqual([
      ['tempo', 'k-rate'],
      ['modo', 'k-rate'],
      ['capas', 'k-rate'],
    ]);
  });

  it('produce sonido y copia el canal izquierdo al derecho', () => {
    const processor = create(SYNTHESIZER_NAME, options);
    const output = block(2);
    let energy = 0;
    for (let i = 0; i < 100; i++) {
      expect(processor.process([], [output], params)).toBe(true);
      energy += (output[0] ?? new Float32Array()).reduce((s, x) => s + x * x, 0);
      expect(output[1]).toEqual(output[0]);
    }
    expect(energy).toBeGreaterThan(0);
  });

  it('tolera una salida sin canales', () => {
    expect(create(SYNTHESIZER_NAME, options).process([], [], params)).toBe(true);
  });

  it('rechaza opciones no válidas', () => {
    expect(() => create(SYNTHESIZER_NAME, { ...options, initialMode: 7 })).toThrow(TypeError);
    expect(() => create(SYNTHESIZER_NAME, undefined)).toThrow(TypeError);
  });
});

describe('procesador recortador', () => {
  it('limita cada muestra al techo y publica el pico en la telemetría', () => {
    const buffer = createTelemetryBuffer();
    const processor = create(CLIPPER_NAME, { telemetry: buffer });
    const input = block(2);
    input[0]?.fill(3);
    input[1]?.fill(-0.2);
    const output = block(2);

    processor.process([input], [output], {});

    expect(Math.max(...Array.from(output[0] ?? [], Math.abs))).toBeLessThanOrEqual(CEILING);
    expect(output[1]?.[0]).toBeCloseTo(-0.2, 2);
    const reading = new TelemetryReader(buffer).read();
    expect(reading.blocks).toBe(1);
    expect(reading.max).toBeCloseTo(CEILING * Math.tanh(3 / CEILING), 5);
  });

  it('sin entrada conectada entrega silencio', () => {
    const processor = create(CLIPPER_NAME, { telemetry: null });
    const output = block(1);
    output[0]?.fill(1);
    processor.process([], [output], {});
    expect(output[0]?.every((x) => x === 0)).toBe(true);
  });
});

describe('validación de opciones', () => {
  it('acepta opciones correctas', () => {
    expect(readSynthesizerOptions({ seed: 3, initialMode: 2, initialLayers: 3 })).toEqual({
      seed: 3,
      initialMode: 2,
      initialLayers: 3,
    });
    expect(readClipperOptions({ telemetry: null })).toEqual({ telemetry: null });
  });

  it.each([
    { seed: 1.5, initialMode: 1, initialLayers: 2 },
    { seed: 1, initialMode: 1, initialLayers: 0 },
    { seed: '1', initialMode: 1, initialLayers: 2 },
  ])('rechaza el sintetizador con %o', (options) => {
    expect(() => readSynthesizerOptions(options)).toThrow(TypeError);
  });

  it('rechaza una telemetría que no es memoria compartida', () => {
    expect(() => readClipperOptions({ telemetry: new ArrayBuffer(8) })).toThrow(TypeError);
    expect(() => readClipperOptions(null)).toThrow(TypeError);
  });
});
