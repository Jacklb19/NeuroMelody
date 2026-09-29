import { describe, it, expect } from 'vitest';
import { leerEstadisticasReproduccion } from './estadisticasReproduccion';
import { IDS_NIVELES, NIVELES, NIVEL_CALIBRACION } from './niveles';
import { dbAGanancia, duracionRampaTempoS, gananciaADb } from './rampas';
import { generarRespuestaImpulso } from './respuestaImpulso';

describe('rampas', () => {
  it.each([
    [66, 76, 20],
    [76, 66, 20],
    [66, 59, 20],
    [76, 59, 34],
    [66, 66, 20],
  ])('de %i a %i BPM dura %i s', (desde, hasta, esperado) => {
    expect(duracionRampaTempoS(desde, hasta)).toBe(esperado);
  });

  it('nunca es menor de 20 s (RNF-03)', () => {
    for (let desde = 40; desde <= 120; desde += 1) {
      for (let hasta = 40; hasta <= 120; hasta += 7) {
        expect(duracionRampaTempoS(desde, hasta)).toBeGreaterThanOrEqual(20);
      }
    }
  });

  it('convierte entre dB y ganancia', () => {
    expect(dbAGanancia(0)).toBe(1);
    expect(dbAGanancia(-12)).toBeCloseTo(0.2512, 4);
    expect(gananciaADb(0.5)).toBeCloseTo(-6.0206, 4);
  });
});

describe('niveles musicales', () => {
  it('reflejan la tabla aprobada', () => {
    expect(IDS_NIVELES.map((id) => {
      const n = NIVELES[id];
      return [n.tempo, n.modo, n.capas, n.brilloHz, n.reverberacion];
    })).toEqual([
      [76, 0, 3, 6000, 0.25],
      [66, 1, 2, 3500, 0.35],
      [59, 2, 2, 2000, 0.5],
    ]);
    expect(NIVEL_CALIBRACION).toBe('intermedio');
  });

  it('el tempo de la meta está entre 58 y 60 BPM', () => {
    expect(NIVELES.meta.tempo).toBeGreaterThanOrEqual(58);
    expect(NIVELES.meta.tempo).toBeLessThanOrEqual(60);
  });
});

describe('generarRespuestaImpulso', () => {
  const [izquierdo, derecho] = generarRespuestaImpulso(48_000);

  function energia(canal: Float32Array, desde: number, hasta: number): number {
    let suma = 0;
    for (let i = desde; i < hasta; i++) {
      suma += (canal[i] ?? 0) ** 2;
    }
    return suma;
  }

  it('dura 3,5 s en dos canales distintos', () => {
    expect(izquierdo.length).toBe(168_000);
    expect(derecho.length).toBe(168_000);
    expect(derecho).not.toEqual(izquierdo);
  });

  it('decae exponencialmente: el último décimo tiene mucha menos energía que el primero', () => {
    const decimo = izquierdo.length / 10;
    expect(energia(izquierdo, 9 * decimo, izquierdo.length)).toBeLessThan(
      energia(izquierdo, 0, decimo) * 1e-4,
    );
  });

  it('empieza en cero, sin chasquido, y es determinista', () => {
    expect(Math.abs(izquierdo[0] ?? 1)).toBe(0);
    expect(generarRespuestaImpulso(48_000)[0]).toEqual(izquierdo);
  });
});

describe('leerEstadisticasReproduccion', () => {
  it('devuelve null sin la API o con datos incompletos', () => {
    expect(leerEstadisticasReproduccion({})).toBeNull();
    expect(leerEstadisticasReproduccion(null)).toBeNull();
    expect(leerEstadisticasReproduccion({ playbackStats: { underrunEvents: 1 } })).toBeNull();
  });
});
