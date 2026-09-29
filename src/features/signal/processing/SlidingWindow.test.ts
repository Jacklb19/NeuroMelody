import { describe, it, expect } from 'vitest';
import type { LatidoClasificado } from './types';
import { VentanaDeslizante } from './SlidingWindow';

function latido(finMs: number): LatidoClasificado {
  return { finMs, rrMs: 1000, aceptado: true, motivoDescarte: null, contiguoAlAnterior: true };
}

describe('VentanaDeslizante', () => {
  it('conserva solo los latidos de los últimos 5 minutos de señal', () => {
    const ventana = new VentanaDeslizante();
    for (let fin = 1000; fin <= 400_000; fin += 1000) {
      ventana.agregarLatido(latido(fin));
    }
    ventana.podar(400_000);

    expect(ventana.latidos[0]?.finMs).toBe(101_000);
    expect(ventana.latidos.at(-1)?.finMs).toBe(400_000);
    expect(ventana.latidos).toHaveLength(300);
  });

  it('descarta los tramos que terminaron fuera de la ventana y fusiona los contiguos', () => {
    const ventana = new VentanaDeslizante();
    ventana.agregarTramo({ inicioMs: 10_000, finMs: 20_000 });
    ventana.agregarTramo({ inicioMs: 150_000, finMs: 155_000 });
    ventana.agregarTramo({ inicioMs: 155_000, finMs: 160_000 });
    ventana.podar(330_000);

    expect(ventana.tramos).toEqual([{ inicioMs: 150_000, finMs: 160_000 }]);
  });

  it('queda vacía si todo quedó fuera, y al vaciarla', () => {
    const ventana = new VentanaDeslizante();
    ventana.agregarLatido(latido(1000));
    ventana.podar(1_000_000);
    expect(ventana.latidos).toEqual([]);

    ventana.agregarLatido(latido(1_000_000));
    ventana.agregarTramo({ inicioMs: 0, finMs: 1_000_000 });
    ventana.vaciar();
    expect(ventana.latidos).toEqual([]);
    expect(ventana.tramos).toEqual([]);
  });
});
