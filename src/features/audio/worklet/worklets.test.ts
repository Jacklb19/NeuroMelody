import { describe, it, expect, beforeAll } from 'vitest';
import { TECHO } from '../core/softClip';
import { MODO } from '../core/theory';
import { LectorTelemetria, crearBuferTelemetria } from '../telemetry/telemetryRing';
import type { ClaseProcesador, ParametrosBloque } from './workletScope';
import {
  DESCRIPTORES_SINTETIZADOR,
  NOMBRE_RECORTADOR,
  NOMBRE_SINTETIZADOR,
  leerOpcionesRecortador,
  leerOpcionesSintetizador,
} from './workletContract';

const registrados = new Map<string, ClaseProcesador>();

// Ámbito del AudioWorklet simulado: los módulos lo leen de globalThis al cargarse.
beforeAll(async () => {
  Object.assign(globalThis, {
    sampleRate: 48_000,
    AudioWorkletProcessor: class {
      readonly port = new MessageChannel().port1;
    },
    registerProcessor: (nombre: string, clase: ClaseProcesador) => {
      registrados.set(nombre, clase);
    },
  });
  await import('./synthesizer.worklet');
  await import('./clipper.worklet');
});

function bloque(canales: number): Float32Array[] {
  return Array.from({ length: canales }, () => new Float32Array(128));
}

function crear(nombre: string, processorOptions: unknown) {
  const Clase = registrados.get(nombre);
  if (Clase === undefined) {
    throw new Error(`No se registró ${nombre}`);
  }
  return new Clase({ processorOptions });
}

describe('procesador sintetizador', () => {
  const opciones = { semilla: 1, modoInicial: MODO.lidio, capasIniciales: 2 };
  const parametros: ParametrosBloque = {
    tempo: new Float32Array([66]),
    modo: new Float32Array([MODO.lidio]),
    capas: new Float32Array([2]),
  };

  it('se registra con sus parámetros de tasa k', () => {
    const Clase = registrados.get(NOMBRE_SINTETIZADOR) as unknown as {
      parameterDescriptors: typeof DESCRIPTORES_SINTETIZADOR;
    };
    expect(Clase.parameterDescriptors.map((d) => [d.name, d.automationRate])).toEqual([
      ['tempo', 'k-rate'],
      ['modo', 'k-rate'],
      ['capas', 'k-rate'],
    ]);
  });

  it('produce sonido y copia el canal izquierdo al derecho', () => {
    const procesador = crear(NOMBRE_SINTETIZADOR, opciones);
    const salida = bloque(2);
    let energia = 0;
    for (let i = 0; i < 100; i++) {
      expect(procesador.process([], [salida], parametros)).toBe(true);
      energia += (salida[0] ?? new Float32Array()).reduce((s, x) => s + x * x, 0);
      expect(salida[1]).toEqual(salida[0]);
    }
    expect(energia).toBeGreaterThan(0);
  });

  it('tolera una salida sin canales', () => {
    expect(crear(NOMBRE_SINTETIZADOR, opciones).process([], [], parametros)).toBe(true);
  });

  it('rechaza opciones no válidas', () => {
    expect(() => crear(NOMBRE_SINTETIZADOR, { ...opciones, modoInicial: 7 })).toThrow(TypeError);
    expect(() => crear(NOMBRE_SINTETIZADOR, undefined)).toThrow(TypeError);
  });
});

describe('procesador recortador', () => {
  it('limita cada muestra al techo y publica el pico en la telemetría', () => {
    const bufer = crearBuferTelemetria();
    const procesador = crear(NOMBRE_RECORTADOR, { telemetria: bufer });
    const entrada = bloque(2);
    entrada[0]?.fill(3);
    entrada[1]?.fill(-0.2);
    const salida = bloque(2);

    procesador.process([entrada], [salida], {});

    expect(Math.max(...Array.from(salida[0] ?? [], Math.abs))).toBeLessThanOrEqual(TECHO);
    expect(salida[1]?.[0]).toBeCloseTo(-0.2, 2);
    const lectura = new LectorTelemetria(bufer).leer();
    expect(lectura.bloques).toBe(1);
    expect(lectura.maximo).toBeCloseTo(TECHO * Math.tanh(3 / TECHO), 5);
  });

  it('sin entrada conectada entrega silencio', () => {
    const procesador = crear(NOMBRE_RECORTADOR, { telemetria: null });
    const salida = bloque(1);
    salida[0]?.fill(1);
    procesador.process([], [salida], {});
    expect(salida[0]?.every((x) => x === 0)).toBe(true);
  });
});

describe('validación de opciones', () => {
  it('acepta opciones correctas', () => {
    expect(leerOpcionesSintetizador({ semilla: 3, modoInicial: 2, capasIniciales: 3 })).toEqual({
      semilla: 3,
      modoInicial: 2,
      capasIniciales: 3,
    });
    expect(leerOpcionesRecortador({ telemetria: null })).toEqual({ telemetria: null });
  });

  it.each([
    { semilla: 1.5, modoInicial: 1, capasIniciales: 2 },
    { semilla: 1, modoInicial: 1, capasIniciales: 0 },
    { semilla: '1', modoInicial: 1, capasIniciales: 2 },
  ])('rechaza el sintetizador con %o', (opciones) => {
    expect(() => leerOpcionesSintetizador(opciones)).toThrow(TypeError);
  });

  it('rechaza una telemetría que no es memoria compartida', () => {
    expect(() => leerOpcionesRecortador({ telemetria: new ArrayBuffer(8) })).toThrow(TypeError);
    expect(() => leerOpcionesRecortador(null)).toThrow(TypeError);
  });
});
