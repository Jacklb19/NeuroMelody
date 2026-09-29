import { cuantizarRRms } from '../rrUnits';
import type { Escenario } from '../../acquisition/simulator/scenarios';
import { crearAleatorio, normalEstandar } from './prng';

/** Frecuencia de la oscilación respiratoria (banda HF). */
export const FRECUENCIA_RESPIRATORIA_HZ = 0.25;
/** Frecuencia de la onda de Mayer (banda LF). */
export const FRECUENCIA_MAYER_HZ = 0.1;

/** Un latido generado: su intervalo RR y el instante en que termina. */
export interface Latido {
  readonly rrMs: number;
  /** Tiempo de señal (ms desde la conexión) en que se completa el latido. */
  readonly finMs: number;
}

export interface GeneradorRR {
  /** Genera el siguiente latido de la serie. */
  siguiente(): Latido;
}

/**
 * Crea un generador determinista de latidos para un escenario.
 *
 * Modelo: RR = 60000 / FC + A_resp·sen(2π·0,25·t) + A_Mayer·sen(2π·0,1·t + φ) + ruido,
 * evaluado al inicio de cada latido y cuantizado a 1/1024 s. Las dos
 * oscilaciones dan contenido en las bandas HF y LF para el análisis espectral.
 *
 * Si el escenario tiene artefactos, algunos latidos se sustituyen por un par
 * prematuro + compensatorio que conserva la suma de los dos latidos base.
 * Los artefactos usan un generador aleatorio aparte, así que la serie base es
 * idéntica a la del escenario limpio con la misma semilla.
 *
 * La serie depende solo del escenario y de la semilla.
 */
export function crearGeneradorRR(escenario: Escenario, semilla: number): GeneradorRR {
  const base = crearGeneradorBase(escenario, semilla);
  const artefactos = escenario.artefactos;
  if (artefactos === null) {
    return base;
  }

  // Semilla derivada para no consumir números de la serie base.
  const aleatorioArtefactos = crearAleatorio(semilla ^ 0x5bd1e995);
  let compensatorioPendiente: Latido | null = null;

  return {
    siguiente(): Latido {
      if (compensatorioPendiente !== null) {
        const compensatorio = compensatorioPendiente;
        compensatorioPendiente = null;
        return compensatorio;
      }
      const latido = base.siguiente();
      if (aleatorioArtefactos() >= artefactos.probabilidadPrematuro) {
        return latido;
      }
      const siguienteBase = base.siguiente();
      const rrPrematuro = cuantizarRRms(latido.rrMs * artefactos.fraccionPrematuro);
      const inicioMs = latido.finMs - latido.rrMs;
      compensatorioPendiente = {
        rrMs: latido.rrMs + siguienteBase.rrMs - rrPrematuro,
        finMs: siguienteBase.finMs,
      };
      return { rrMs: rrPrematuro, finMs: inicioMs + rrPrematuro };
    },
  };
}

function crearGeneradorBase(escenario: Escenario, semilla: number): GeneradorRR {
  const aleatorio = crearAleatorio(semilla);
  const faseMayer = 2 * Math.PI * aleatorio();
  let inicioMs = 0;

  return {
    siguiente(): Latido {
      const p = escenario.parametrosEn(inicioMs);
      const t = inicioMs / 1000;
      const rrCrudo =
        60000 / p.fcMedia +
        p.amplitudRespiratoriaMs * Math.sin(2 * Math.PI * FRECUENCIA_RESPIRATORIA_HZ * t) +
        p.amplitudMayerMs * Math.sin(2 * Math.PI * FRECUENCIA_MAYER_HZ * t + faseMayer) +
        p.ruidoMs * normalEstandar(aleatorio);
      const rrMs = cuantizarRRms(rrCrudo);
      inicioMs += rrMs;
      return { rrMs, finMs: inicioMs };
    },
  };
}
