/**
 * Tipos compartidos del procesamiento de señal (hilo de señal).
 * Los términos técnicos (ectópico, anómalo) solo se usan en el código; la
 * interfaz habla siempre de "descartado por calidad de señal".
 */

/** Motivo por el que un intervalo RR no entra en el análisis. */
export type MotivoDescarte =
  /** Fuera del rango plausible de 300–2000 ms. */
  | 'fuera_de_rango'
  /** Se aparta más de un 20 % de la mediana de referencia (latido ectópico o artefacto). */
  | 'desviacion'
  /** Llegó con el sensor sin contacto con la piel. */
  | 'sin_contacto';

/** Un intervalo RR ya clasificado por el filtro. */
export interface LatidoClasificado {
  /** Tiempo de señal (ms desde la conexión) en que termina el latido. */
  readonly finMs: number;
  readonly rrMs: number;
  readonly aceptado: boolean;
  readonly motivoDescarte: MotivoDescarte | null;
  /**
   * `false` si entre este latido y el anterior hubo un hueco o una pérdida
   * de contacto: el par no cuenta como consecutivo para el RMSSD.
   */
  readonly contiguoAlAnterior: boolean;
}

/** Intervalo de tiempo de señal marcado como de baja calidad. */
export interface TramoBajaCalidad {
  readonly inicioMs: number;
  readonly finMs: number;
}
