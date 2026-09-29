import { describe, it, expect, vi } from 'vitest';
import { crearEntornoTiempoFalso } from '../../../test/entornoTiempoFalso';
import type { NotificacionLatido } from '../contrato';
import { UNIDADES_RR_POR_SEGUNDO } from '../unidadesRR';
import type { IdEscenario } from './escenarios';
import { FuenteSimulada, type Velocidad } from './FuenteSimulada';

async function crearFuenteConectada(
  velocidad: Velocidad = 1,
  escenario: IdEscenario = 'reposo',
  semilla = 1,
) {
  const entorno = crearEntornoTiempoFalso();
  const fuente = new FuenteSimulada({ escenario, semilla, velocidad, ...entorno });
  const notificaciones: NotificacionLatido[] = [];
  const alError = vi.fn();
  fuente.suscribir({ alNotificar: (n) => notificaciones.push(n), alError });
  await fuente.conectar();
  return { entorno, fuente, notificaciones, alError };
}

describe('FuenteSimulada', () => {
  it('declara el tipo simulador y empieza desconectada', () => {
    const fuente = new FuenteSimulada({ escenario: 'reposo', semilla: 1, velocidad: 1 });
    expect(fuente.tipo).toBe('simulador');
    expect(fuente.estado).toBe('desconectada');
  });

  it('pasa por conectando y conectada, y vuelve a desconectada', async () => {
    const entorno = crearEntornoTiempoFalso();
    const fuente = new FuenteSimulada({ escenario: 'reposo', semilla: 1, velocidad: 1, ...entorno });
    const alCambiarEstado = vi.fn();
    fuente.suscribir({ alCambiarEstado });

    await fuente.conectar();
    expect(fuente.estado).toBe('conectada');
    expect(entorno.activa).toBe(true);

    await fuente.desconectar();
    expect(fuente.estado).toBe('desconectada');
    expect(entorno.activa).toBe(false);
    expect(alCambiarEstado.mock.calls).toEqual([['conectando'], ['conectada'], ['desconectada']]);
  });

  it('ignora una segunda conexión mientras ya está conectada', async () => {
    const { entorno, fuente } = await crearFuenteConectada();
    await fuente.conectar();
    expect(entorno.tareasProgramadas).toBe(1);
  });

  it('emite una notificación por segundo de señal a velocidad 1×', async () => {
    const { entorno, notificaciones } = await crearFuenteConectada(1);
    entorno.avanzar(10_000);
    expect(notificaciones.map((n) => n.tiempoMs)).toEqual([
      1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000,
    ]);
  });

  it('acelera el tiempo de señal a velocidad 10×', async () => {
    const { entorno, notificaciones } = await crearFuenteConectada(10);
    entorno.avanzar(1000);
    expect(notificaciones).toHaveLength(10);
    expect(notificaciones.at(-1)?.tiempoMs).toBe(10_000);
  });

  it.each<Velocidad>([2, 5, 10])(
    'produce la misma serie a 1× y a %i× (reproducible)',
    async (velocidad) => {
      const lenta = await crearFuenteConectada(1, 'relajacion_progresiva', 7);
      const rapida = await crearFuenteConectada(velocidad, 'relajacion_progresiva', 7);
      lenta.entorno.avanzar(300_000);
      rapida.entorno.avanzar(300_000 / velocidad);
      expect(rapida.notificaciones).toHaveLength(300);
      expect(rapida.notificaciones).toEqual(lenta.notificaciones);
    },
  );

  it('entrega en orden todo lo pendiente tras un temporizador retrasado', async () => {
    const continua = await crearFuenteConectada();
    const retrasada = await crearFuenteConectada();
    continua.entorno.avanzar(30_000);
    retrasada.entorno.saltar(30_000);
    expect(retrasada.notificaciones).toHaveLength(30);
    expect(retrasada.notificaciones).toEqual(continua.notificaciones);
  });

  it('emite intervalos cuantizados a 1/1024 s y una FC coherente, sin errores de validación', async () => {
    const { entorno, notificaciones, alError } = await crearFuenteConectada(10, 'relajacion_progresiva');
    entorno.avanzar(60_000); // 10 minutos de señal

    const todosLosRR = notificaciones.flatMap((n) => n.intervalosRRms);
    for (const rr of todosLosRR) {
      expect(Number.isInteger((rr * UNIDADES_RR_POR_SEGUNDO) / 1000)).toBe(true);
    }
    // La suma de los RR entregados no puede superar el tiempo de señal transcurrido.
    const sumaRR = todosLosRR.reduce((s, rr) => s + rr, 0);
    expect(sumaRR).toBeLessThanOrEqual(600_000);
    expect(sumaRR).toBeGreaterThan(600_000 - 1500);

    for (const n of notificaciones) {
      expect(Number.isInteger(n.frecuenciaCardiaca)).toBe(true);
      expect(n.frecuenciaCardiaca).toBeGreaterThan(50);
      expect(n.frecuenciaCardiaca).toBeLessThan(110);
      expect(n.contactoSensor).toBe(true);
    }
    expect(alError).not.toHaveBeenCalled();
  });

  it('no emite nada tras desconectar', async () => {
    const { entorno, fuente, notificaciones } = await crearFuenteConectada();
    entorno.avanzar(3000);
    await fuente.desconectar();
    entorno.saltar(10_000);
    expect(notificaciones).toHaveLength(3);
  });

  it('deja de emitir si un observador desconecta durante una notificación', async () => {
    const entorno = crearEntornoTiempoFalso();
    const fuente = new FuenteSimulada({ escenario: 'reposo', semilla: 1, velocidad: 1, ...entorno });
    const alNotificar = vi.fn(() => {
      void fuente.desconectar();
    });
    fuente.suscribir({ alNotificar });
    await fuente.conectar();

    entorno.saltar(10_000);

    expect(alNotificar).toHaveBeenCalledOnce();
  });

  it('al reconectar reinicia el tiempo de señal y repite la serie', async () => {
    const { entorno, fuente, notificaciones } = await crearFuenteConectada();
    entorno.avanzar(5000);
    const primeraConexion = [...notificaciones];

    await fuente.desconectar();
    notificaciones.length = 0;
    await fuente.conectar();
    entorno.avanzar(5000);

    expect(notificaciones).toEqual(primeraConexion);
  });
});
