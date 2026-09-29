import { describe, it, expect } from 'vitest';
import { crearEntornoTiempoFalso } from '../../../test/entornoTiempoFalso';
import type { NotificacionLatido } from '../../adquisicion/contrato';
import type { IdEscenario } from '../../adquisicion/simulador/escenarios';
import { FuenteSimulada, type Velocidad } from '../../adquisicion/simulador/FuenteSimulada';
import { ProcesadorSenal, type ResultadoIndices } from './ProcesadorSenal';

function notificacion(
  tiempoMs: number,
  intervalosRRms: number[],
  contactoSensor: boolean | null = true,
): NotificacionLatido {
  return { tiempoMs, frecuenciaCardiaca: 60, intervalosRRms, contactoSensor };
}

function crearProcesador() {
  const resultados: ResultadoIndices[] = [];
  const procesador = new ProcesadorSenal((r) => resultados.push(r));
  return { procesador, resultados };
}

/** Alimenta el procesador con el simulador (reloj falso) durante `segundosSenal`. */
async function simular(
  escenario: IdEscenario,
  segundosSenal: number,
  velocidad: Velocidad = 10,
  semilla = 1,
) {
  const entorno = crearEntornoTiempoFalso();
  const fuente = new FuenteSimulada({ escenario, semilla, velocidad, ...entorno });
  const { procesador, resultados } = crearProcesador();
  const notificaciones: NotificacionLatido[] = [];
  fuente.suscribir({
    alNotificar: (n) => {
      notificaciones.push(n);
      procesador.procesar(n);
    },
  });
  await fuente.conectar();
  entorno.avanzar((segundosSenal * 1000) / velocidad);
  return { procesador, resultados, notificaciones };
}

function rmssdSinFiltrar(notificaciones: readonly NotificacionLatido[], desdeMs: number): number {
  const rr = notificaciones.filter((n) => n.tiempoMs > desdeMs).flatMap((n) => n.intervalosRRms);
  let suma = 0;
  for (let i = 1; i < rr.length; i++) {
    suma += ((rr[i] ?? 0) - (rr[i - 1] ?? 0)) ** 2;
  }
  return Math.sqrt(suma / (rr.length - 1));
}

describe('ProcesadorSenal', () => {
  it('ubica los latidos de una notificación hacia atrás desde su instante', () => {
    const { procesador } = crearProcesador();
    procesador.procesar(notificacion(2000, [500, 400]));
    expect(procesador.instantanea.latidos.map((l) => l.finMs)).toEqual([1600, 2000]);
  });

  it('publica índices cada 5 s de tiempo de señal', async () => {
    const { resultados } = await simular('reposo', 30);
    expect(resultados.map((r) => r.tiempoMs)).toEqual([5000, 10000, 15000, 20000, 25000, 30000]);
  });

  it('publica los mismos resultados a 1× y a 10×', async () => {
    const lento = await simular('relajacion_progresiva', 120, 1);
    const rapido = await simular('relajacion_progresiva', 120, 10);
    expect(rapido.resultados).toEqual(lento.resultados);
  });

  it('muestra "reuniendo" sin índices hasta tener 60 s de NN válidos', async () => {
    const { resultados } = await simular('reposo', 70);
    const a55 = resultados.find((r) => r.tiempoMs === 55_000);
    const a70 = resultados.find((r) => r.tiempoMs === 70_000);

    expect(a55).toMatchObject({ calidad: 'reuniendo', fcMedia: null, rmssd: null, sdnn: null });
    expect(a70?.calidad).toBe('buena');
    expect(a70?.fcMedia).toBeGreaterThan(55);
    expect(a70?.rmssd).toBeGreaterThan(0);
    expect(a70?.coberturaMs).toBe(70_000);
  });

  it('en reposo limpio no descarta latidos ni marca tramos de baja calidad', async () => {
    const { procesador, resultados } = await simular('reposo', 300);
    const ultimo = resultados.at(-1);
    expect(ultimo?.latidosDescartados).toBe(0);
    expect(procesador.instantanea.tramos).toEqual([]);
    expect(ultimo?.coberturaMs).toBe(300_000);
  });

  describe('verificación de RF-04 con el escenario artefactos', () => {
    it('el RMSSD filtrado queda a ±10 % del de reposo con la misma semilla y el crudo es claramente mayor', async () => {
      const referencia = await simular('reposo', 300);
      const conArtefactos = await simular('artefactos', 300);
      const rmssdReferencia = referencia.resultados.at(-1)?.rmssd ?? Number.NaN;
      const rmssdFiltrado = conArtefactos.resultados.at(-1)?.rmssd ?? Number.NaN;
      const rmssdCrudo = rmssdSinFiltrar(conArtefactos.notificaciones, 0);

      expect(Math.abs(rmssdFiltrado - rmssdReferencia) / rmssdReferencia).toBeLessThan(0.1);
      expect(rmssdCrudo).toBeGreaterThan(1.5 * rmssdReferencia);
      expect(conArtefactos.resultados.at(-1)?.latidosDescartados).toBeGreaterThan(0);
    });

    it('marca como baja calidad cada pérdida de contacto', async () => {
      const { procesador, resultados } = await simular('artefactos', 200);
      const tramos = procesador.instantanea.tramos;

      expect(tramos.some((t) => t.inicioMs <= 91_000 && t.finMs >= 95_000)).toBe(true);
      expect(tramos.some((t) => t.inicioMs <= 181_000 && t.finMs >= 185_000)).toBe(true);
      expect(resultados.find((r) => r.tiempoMs === 95_000)?.calidad).toBe('baja');
      expect(resultados.find((r) => r.tiempoMs === 110_000)?.calidad).toBe('buena');
    });
  });

  it('no considera consecutivos los latidos a ambos lados de una pérdida de contacto', () => {
    const { procesador } = crearProcesador();
    procesador.procesar(notificacion(1000, [1000]));
    procesador.procesar(notificacion(2000, [1000]));
    procesador.procesar(notificacion(3000, [], false));
    procesador.procesar(notificacion(4000, [1000]));
    procesador.procesar(notificacion(5000, [1000]));

    const latidos = procesador.instantanea.latidos;
    expect(latidos.map((l) => l.contiguoAlAnterior)).toEqual([true, true, false, true]);
    expect(procesador.instantanea.tramos).toEqual([{ inicioMs: 2000, finMs: 3000 }]);
  });

  it('descarta los RR que llegan sin contacto del sensor', () => {
    const { procesador } = crearProcesador();
    procesador.procesar(notificacion(1000, [1000], false));
    expect(procesador.instantanea.latidos[0]).toMatchObject({
      aceptado: false,
      motivoDescarte: 'sin_contacto',
    });
  });

  it('marca un hueco de más de 3 s sin RR y rompe la continuidad', () => {
    const { procesador } = crearProcesador();
    procesador.procesar(notificacion(1000, [1000]));
    for (let t = 2000; t <= 5000; t += 1000) {
      procesador.procesar(notificacion(t, []));
    }
    procesador.procesar(notificacion(6000, [1000]));

    expect(procesador.instantanea.tramos).toEqual([{ inicioMs: 1000, finMs: 6000 }]);
    expect(procesador.instantanea.latidos.at(-1)?.contiguoAlAnterior).toBe(false);
  });

  it('marca baja calidad si se acepta menos del 80 % de los latidos recientes', () => {
    const { procesador, resultados } = crearProcesador();
    // Referencia de 5 latidos en 1000 ms y luego 3 descartes de 5: 7 de 10 aceptados (70 %).
    const serie = [1000, 1000, 1000, 1000, 1000, 1500, 1000, 1500, 1000, 1500];
    serie.forEach((rr, i) => {
      procesador.procesar(notificacion((i + 1) * 1000, [rr]));
    });
    expect(resultados.at(-1)?.calidad).toBe('baja');
  });

  it('reiniciar vacía la ventana y vuelve a publicar desde 5 s', () => {
    const { procesador, resultados } = crearProcesador();
    for (let t = 1000; t <= 10_000; t += 1000) {
      procesador.procesar(notificacion(t, [1000]));
    }
    procesador.reiniciar();
    expect(procesador.instantanea.latidos).toEqual([]);

    resultados.length = 0;
    for (let t = 1000; t <= 5000; t += 1000) {
      procesador.procesar(notificacion(t, [1000]));
    }
    expect(resultados.map((r) => r.tiempoMs)).toEqual([5000]);
  });
});
