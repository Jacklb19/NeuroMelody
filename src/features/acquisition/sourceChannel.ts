import type {
  EstadoConexion,
  NotificacionLatido,
  ObservadorFuente,
} from './contract';
import { validarNotificacion } from './validateNotification';

/** Error emitido por una fuente de señal hacia sus observadores. */
export class ErrorFuenteSenal extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorFuenteSenal';
  }
}

/**
 * Parte común de toda fuente: observadores, estado de conexión y validación
 * de frontera. Centralizarla garantiza que el simulador y la banda BLE
 * entreguen exactamente las mismas garantías al resto del sistema.
 */
export class CanalFuente {
  readonly #observadores = new Set<ObservadorFuente>();
  #estado: EstadoConexion = 'desconectada';
  #ultimoTiempoMs = 0;

  get estado(): EstadoConexion {
    return this.#estado;
  }

  suscribir(observador: ObservadorFuente): () => void {
    this.#observadores.add(observador);
    return () => {
      this.#observadores.delete(observador);
    };
  }

  cambiarEstado(estado: EstadoConexion): void {
    if (estado === this.#estado) {
      return;
    }
    this.#estado = estado;
    for (const observador of this.#observadores) {
      observador.alCambiarEstado?.(estado);
    }
  }

  /** Reinicia la referencia de tiempo al iniciar una nueva conexión. */
  reiniciarTiempo(): void {
    this.#ultimoTiempoMs = 0;
  }

  /** Entrega la notificación si es válida; si no, la descarta y avisa del error. */
  notificar(notificacion: NotificacionLatido): void {
    const resultado = validarNotificacion(notificacion, this.#ultimoTiempoMs);
    if (!resultado.valida) {
      this.emitirError(new ErrorFuenteSenal(resultado.motivo));
      return;
    }
    this.#ultimoTiempoMs = notificacion.tiempoMs;
    for (const observador of this.#observadores) {
      observador.alNotificar?.(notificacion);
    }
  }

  emitirError(error: Error): void {
    for (const observador of this.#observadores) {
      observador.alError?.(error);
    }
  }
}
