import { describe, it, expect } from 'vitest';
import {
  CAPACIDAD_TELEMETRIA,
  EscritorTelemetria,
  LectorTelemetria,
  crearBuferTelemetria,
} from './anilloTelemetria';

describe('anillo de telemetría', () => {
  it('entrega el máximo y el número de bloques nuevos desde la última lectura', () => {
    const bufer = crearBuferTelemetria();
    const escritor = new EscritorTelemetria(bufer);
    const lector = new LectorTelemetria(bufer);

    expect(lector.leer()).toEqual({ bloques: 0, maximo: null });
    escritor.escribir(0.25);
    escritor.escribir(0.5);
    escritor.escribir(0.125);
    expect(lector.leer()).toEqual({ bloques: 3, maximo: 0.5 });

    escritor.escribir(0.0625);
    expect(lector.leer()).toEqual({ bloques: 1, maximo: 0.0625 });
  });

  it('si el escritor da la vuelta, lee solo los valores más recientes', () => {
    const bufer = crearBuferTelemetria();
    const escritor = new EscritorTelemetria(bufer);
    const lector = new LectorTelemetria(bufer);

    escritor.escribir(0.9); // quedará sobrescrito
    for (let i = 0; i < CAPACIDAD_TELEMETRIA; i++) {
      escritor.escribir(0.5);
    }
    const lectura = lector.leer();
    expect(lectura.bloques).toBe(CAPACIDAD_TELEMETRIA + 1);
    expect(lectura.maximo).toBe(0.5);
  });

  it('lector y escritor comparten la memoria, sin copias', () => {
    const bufer = crearBuferTelemetria();
    new EscritorTelemetria(bufer).escribir(0.75);
    expect(new LectorTelemetria(bufer).leer().maximo).toBe(0.75);
  });
});
