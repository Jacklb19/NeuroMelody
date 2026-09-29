import type {
  Programador,
  Reloj,
} from '../features/acquisition/simulator/SimulatedSource';
import { PERIODO_REVISION_MS } from '../features/acquisition/simulator/SimulatedSource';

export interface EntornoTiempoFalso {
  readonly reloj: Reloj;
  readonly programador: Programador;
  /** Avanza el tiempo real de golpe y dispara una sola revisión. */
  saltar(ms: number): void;
  /** Avanza el tiempo real revisión a revisión, como el temporizador real. */
  avanzar(ms: number): void;
  readonly activa: boolean;
  readonly tareasProgramadas: number;
}

/** Reloj y programador falsos: el tiempo solo avanza cuando la prueba lo pide. */
export function crearEntornoTiempoFalso(): EntornoTiempoFalso {
  let ahora = 5000;
  let tarea: (() => void) | null = null;
  let tareasProgramadas = 0;

  const saltar = (ms: number): void => {
    ahora += ms;
    tarea?.();
  };

  return {
    reloj: { ahoraMs: () => ahora },
    programador: {
      repetir: (nueva) => {
        tarea = nueva;
        tareasProgramadas++;
        return () => {
          tarea = null;
        };
      },
    },
    saltar,
    avanzar(ms) {
      for (let t = 0; t < ms; t += PERIODO_REVISION_MS) {
        saltar(PERIODO_REVISION_MS);
      }
    },
    get activa() {
      return tarea !== null;
    },
    get tareasProgramadas() {
      return tareasProgramadas;
    },
  };
}
