import { describe, it, expect } from 'vitest';
import { UNIDADES_RR_POR_SEGUNDO } from '../unidadesRR';
import { ESCENARIOS, DURACION_RELAJACION_MS, type IdEscenario } from './escenarios';
import { crearGeneradorRR, type Latido } from './generadorRR';

const CINCO_MINUTOS_MS = 5 * 60 * 1000;

function generarHasta(id: IdEscenario, semilla: number, hastaMs: number): Latido[] {
  const generador = crearGeneradorRR(ESCENARIOS[id], semilla);
  const latidos: Latido[] = [];
  let latido = generador.siguiente();
  while (latido.finMs <= hastaMs) {
    latidos.push(latido);
    latido = generador.siguiente();
  }
  return latidos;
}

function fcMedia(rr: readonly number[]): number {
  return 60000 / (rr.reduce((s, x) => s + x, 0) / rr.length);
}

// Implementación de referencia mínima para las pruebas; la de producción llega en S2.
function rmssd(rr: readonly number[]): number {
  let suma = 0;
  for (let i = 1; i < rr.length; i++) {
    suma += ((rr[i] ?? 0) - (rr[i - 1] ?? 0)) ** 2;
  }
  return Math.sqrt(suma / (rr.length - 1));
}

describe('crearGeneradorRR', () => {
  it('es determinista para una misma semilla y escenario', () => {
    expect(generarHasta('reposo', 99, 60_000)).toEqual(generarHasta('reposo', 99, 60_000));
  });

  it('cambia la serie con otra semilla', () => {
    expect(generarHasta('reposo', 1, 60_000)).not.toEqual(generarHasta('reposo', 2, 60_000));
  });

  it('cuantiza cada intervalo a 1/1024 s y acumula el tiempo sin deriva', () => {
    const latidos = generarHasta('activacion', 5, 60_000);
    let acumulado = 0;
    for (const { rrMs, finMs } of latidos) {
      expect(Number.isInteger((rrMs * UNIDADES_RR_POR_SEGUNDO) / 1000)).toBe(true);
      acumulado += rrMs;
      expect(finMs).toBe(acumulado);
    }
  });

  it.each([1, 2, 3])('reposo (semilla %i): FC ≈ 62 lpm y RMSSD ≈ 45 ms', (semilla) => {
    const rr = generarHasta('reposo', semilla, CINCO_MINUTOS_MS).map((l) => l.rrMs);
    expect(fcMedia(rr)).toBeGreaterThan(60);
    expect(fcMedia(rr)).toBeLessThan(64);
    expect(rmssd(rr)).toBeGreaterThan(35);
    expect(rmssd(rr)).toBeLessThan(60);
  });

  it.each([1, 2, 3])('activación (semilla %i): FC ≈ 92 lpm y RMSSD ≈ 10 ms', (semilla) => {
    const rr = generarHasta('activacion', semilla, CINCO_MINUTOS_MS).map((l) => l.rrMs);
    expect(fcMedia(rr)).toBeGreaterThan(90);
    expect(fcMedia(rr)).toBeLessThan(94);
    expect(rmssd(rr)).toBeGreaterThan(5);
    expect(rmssd(rr)).toBeLessThan(20);
  });

  it('relajación progresiva: pasa de activación a reposo en 10 minutos', () => {
    const latidos = generarHasta('relajacion_progresiva', 1, DURACION_RELAJACION_MS + 120_000);
    const primerMinuto = latidos.filter((l) => l.finMs <= 60_000).map((l) => l.rrMs);
    const trasTransicion = latidos
      .filter((l) => l.finMs > DURACION_RELAJACION_MS)
      .map((l) => l.rrMs);

    expect(fcMedia(primerMinuto)).toBeGreaterThan(85);
    expect(fcMedia(trasTransicion)).toBeLessThan(65);
  });
});
