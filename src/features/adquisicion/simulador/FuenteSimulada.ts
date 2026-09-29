import { CanalFuente } from '../canalFuente';
import type {
  EstadoConexion,
  FuenteSenal,
  NotificacionLatido,
  ObservadorFuente,
} from '../contrato';
import { ESCENARIOS, type IdEscenario } from './escenarios';
import { crearGeneradorRR, type GeneradorRR, type Latido } from './generadorRR';

/** Factores de aceleración del tiempo de señal permitidos (RF-02). */
export type Velocidad = 1 | 2 | 5 | 10;
export const VELOCIDADES: readonly Velocidad[] = [1, 2, 5, 10];

/** Fuente de tiempo real en ms; inyectable para pruebas deterministas. */
export interface Reloj {
  ahoraMs(): number;
}

/** Ejecuta una tarea periódica y devuelve la función que la cancela. */
export interface Programador {
  repetir(tarea: () => void, periodoMs: number): () => void;
}

export const relojDelNavegador: Reloj = {
  ahoraMs: () => performance.now(),
};

export const programadorDelNavegador: Programador = {
  repetir: (tarea, periodoMs) => {
    const id = setInterval(tarea, periodoMs);
    return () => {
      clearInterval(id);
    };
  },
};

export interface OpcionesFuenteSimulada {
  readonly escenario: IdEscenario;
  readonly semilla: number;
  readonly velocidad: Velocidad;
  readonly reloj?: Reloj;
  readonly programador?: Programador;
}

/** Periodo de las notificaciones en tiempo de señal, como una banda BLE. */
export const PERIODO_NOTIFICACION_MS = 1000;
/** Periodo real con que se revisa si hay notificaciones pendientes. */
export const PERIODO_REVISION_MS = 100;
/** Latidos recientes promediados para reportar la frecuencia cardíaca. */
const LATIDOS_PARA_FC = 4;

/**
 * Fuente de señal simulada (RF-02) que cumple el mismo contrato que la banda BLE.
 *
 * La serie depende solo del escenario, la semilla y el tiempo de señal, nunca
 * de cuándo dispara el temporizador: en cada revisión se emiten todas las
 * notificaciones pendientes hasta el tiempo actual. Así, si el navegador
 * retrasa los temporizadores (pestaña en segundo plano), no se pierden datos
 * y la serie no cambia; solo llegan más tarde.
 */
export class FuenteSimulada implements FuenteSenal {
  readonly tipo = 'simulador' as const;

  readonly #canal = new CanalFuente();
  readonly #opciones: OpcionesFuenteSimulada;
  readonly #reloj: Reloj;
  readonly #programador: Programador;

  #cancelarRevision: (() => void) | null = null;
  #inicioRealMs = 0;
  #generador: GeneradorRR | null = null;
  #latidoPendiente: Latido | null = null;
  #proximaNotificacionMs = PERIODO_NOTIFICACION_MS;
  #rrRecientes: number[] = [];

  constructor(opciones: OpcionesFuenteSimulada) {
    this.#opciones = opciones;
    this.#reloj = opciones.reloj ?? relojDelNavegador;
    this.#programador = opciones.programador ?? programadorDelNavegador;
  }

  get estado(): EstadoConexion {
    return this.#canal.estado;
  }

  suscribir(observador: ObservadorFuente): () => void {
    return this.#canal.suscribir(observador);
  }

  conectar(): Promise<void> {
    if (this.#cancelarRevision !== null) {
      return Promise.resolve();
    }
    this.#canal.cambiarEstado('conectando');
    this.#canal.reiniciarTiempo();
    this.#generador = crearGeneradorRR(
      ESCENARIOS[this.#opciones.escenario],
      this.#opciones.semilla,
    );
    this.#latidoPendiente = this.#generador.siguiente();
    this.#proximaNotificacionMs = PERIODO_NOTIFICACION_MS;
    this.#rrRecientes = [];
    this.#inicioRealMs = this.#reloj.ahoraMs();
    this.#cancelarRevision = this.#programador.repetir(() => {
      this.#emitirPendientes();
    }, PERIODO_REVISION_MS);
    this.#canal.cambiarEstado('conectada');
    return Promise.resolve();
  }

  desconectar(): Promise<void> {
    this.#cancelarRevision?.();
    this.#cancelarRevision = null;
    this.#generador = null;
    this.#latidoPendiente = null;
    this.#canal.cambiarEstado('desconectada');
    return Promise.resolve();
  }

  #emitirPendientes(): void {
    const tiempoSenalMs =
      (this.#reloj.ahoraMs() - this.#inicioRealMs) * this.#opciones.velocidad;
    // Se comprueba la conexión en cada vuelta: un observador puede desconectar
    // la fuente mientras recibe una notificación.
    while (
      this.#cancelarRevision !== null &&
      this.#proximaNotificacionMs <= tiempoSenalMs
    ) {
      this.#canal.notificar(this.#construirNotificacion(this.#proximaNotificacionMs));
      this.#proximaNotificacionMs += PERIODO_NOTIFICACION_MS;
    }
  }

  #construirNotificacion(tiempoMs: number): NotificacionLatido {
    const generador = this.#generador;
    let pendiente = this.#latidoPendiente;
    if (generador === null || pendiente === null) {
      throw new Error('La fuente simulada no está conectada.');
    }

    const intervalosRRms: number[] = [];
    while (pendiente.finMs <= tiempoMs) {
      intervalosRRms.push(pendiente.rrMs);
      pendiente = generador.siguiente();
    }
    this.#latidoPendiente = pendiente;

    if (this.#sinContacto(tiempoMs)) {
      // Como una banda real: sigue notificando, sin RR y con la última FC.
      return {
        tiempoMs,
        frecuenciaCardiaca: this.#frecuenciaCardiaca(pendiente),
        intervalosRRms: [],
        contactoSensor: false,
      };
    }

    this.#rrRecientes = [...this.#rrRecientes, ...intervalosRRms].slice(-LATIDOS_PARA_FC);
    return {
      tiempoMs,
      frecuenciaCardiaca: this.#frecuenciaCardiaca(pendiente),
      intervalosRRms,
      contactoSensor: true,
    };
  }

  #frecuenciaCardiaca(pendiente: Latido): number {
    // Antes del primer latido completo se usa el que está en curso.
    const referencia = this.#rrRecientes.length > 0 ? this.#rrRecientes : [pendiente.rrMs];
    const rrMedio = referencia.reduce((suma, rr) => suma + rr, 0) / referencia.length;
    return Math.round(60000 / rrMedio);
  }

  /** Pérdida de contacto periódica del escenario de artefactos: (k·periodo, k·periodo + duración]. */
  #sinContacto(tiempoMs: number): boolean {
    const artefactos = ESCENARIOS[this.#opciones.escenario].artefactos;
    if (artefactos === null || tiempoMs < artefactos.periodoPerdidaContactoMs) {
      return false;
    }
    const fase = tiempoMs % artefactos.periodoPerdidaContactoMs;
    return fase > 0 && fase <= artefactos.duracionPerdidaContactoMs;
  }
}
