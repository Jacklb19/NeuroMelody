import { MODO, type Modo } from '../core/theory';

/**
 * Niveles musicales de la guía (docs/diseno-musical.md). Valores iniciales
 * aprobados en el S3; se ajustan con oyentes al cerrar el S4.
 */
export type IdNivel = 'alta' | 'intermedio' | 'meta';

export interface NivelMusical {
  readonly id: IdNivel;
  /** Nombre descriptivo para la interfaz. */
  readonly nombre: string;
  readonly tempo: number;
  readonly modo: Modo;
  readonly capas: number;
  /** Frecuencia de corte del pasa bajos, en Hz. */
  readonly brilloHz: number;
  /** Ganancia de la señal reverberada (0 a 1). */
  readonly reverberacion: number;
}

export const NIVELES: Readonly<Record<IdNivel, NivelMusical>> = {
  alta: {
    id: 'alta',
    nombre: 'Activación alta',
    tempo: 76,
    modo: MODO.pentatonicaMayor,
    capas: 3,
    brilloHz: 6000,
    reverberacion: 0.25,
  },
  intermedio: {
    id: 'intermedio',
    nombre: 'Intermedio',
    tempo: 66,
    modo: MODO.lidio,
    capas: 2,
    brilloHz: 3500,
    reverberacion: 0.35,
  },
  meta: {
    id: 'meta',
    nombre: 'Activación baja (meta)',
    // Centro del rango de 58 a 60 BPM del diseño.
    tempo: 59,
    modo: MODO.bordonPentatonica,
    capas: 2,
    brilloHz: 2000,
    reverberacion: 0.5,
  },
};

export const IDS_NIVELES: readonly IdNivel[] = ['alta', 'intermedio', 'meta'];

/** Los primeros 3 minutos de cada sesión suenan en Intermedio (calibración). */
export const NIVEL_CALIBRACION: IdNivel = 'intermedio';
