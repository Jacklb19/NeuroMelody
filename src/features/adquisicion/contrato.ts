/**
 * Contrato común de la capa de adquisición (ADR-03).
 *
 * La banda BLE, el simulador y la reproducción de registros implementan
 * `FuenteSenal`; el resto del sistema depende solo de este contrato, de modo
 * que no puede distinguir una fuente de otra (HU-02).
 */

/** Tipos de fuente de señal previstos en el documento de definición. */
export type TipoFuente = 'simulador' | 'ble' | 'registro';

/** Estado de la conexión con la fuente; la interfaz lo muestra siempre (HU-01). */
export type EstadoConexion =
  | 'desconectada'
  | 'conectando'
  | 'conectada'
  | 'reconectando'
  | 'error';

/**
 * Una notificación de la fuente, con la misma forma que la característica
 * estándar de ritmo cardíaco de BLE (≈ 1 por segundo).
 */
export interface NotificacionLatido {
  /**
   * Tiempo de señal en milisegundos desde la conexión, monótono no
   * decreciente. No es tiempo de pared: con el simulador acelerado avanza
   * más rápido, y las ventanas de análisis deben usar este tiempo.
   */
  readonly tiempoMs: number;
  /** Frecuencia cardíaca en latidos por minuto, tal como la reporta la fuente. */
  readonly frecuenciaCardiaca: number;
  /** Intervalos entre latidos completados desde la notificación anterior, en ms. */
  readonly intervalosRRms: readonly number[];
  /** Contacto del sensor con la piel; `null` si la fuente no lo informa. */
  readonly contactoSensor: boolean | null;
}

/** Callbacks de quien consume una fuente; todos son opcionales. */
export interface ObservadorFuente {
  readonly alNotificar?: (notificacion: NotificacionLatido) => void;
  readonly alCambiarEstado?: (estado: EstadoConexion) => void;
  readonly alError?: (error: Error) => void;
}

/** Contrato que cumple toda fuente de señal. */
export interface FuenteSenal {
  readonly tipo: TipoFuente;
  readonly estado: EstadoConexion;
  /** Inicia la adquisición; el tiempo de señal vuelve a empezar en 0. */
  conectar(): Promise<void>;
  /** Detiene la adquisición; tras resolverse no llegan más notificaciones. */
  desconectar(): Promise<void>;
  /** Registra un observador y devuelve la función que lo da de baja. */
  suscribir(observador: ObservadorFuente): () => void;
}
