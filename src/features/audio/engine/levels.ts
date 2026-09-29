import { MODE, type Mode } from '../core/theory';

/**
 * Niveles musicales de la guía (docs/diseno-musical.md). Valores iniciales
 * aprobados en el S3; se ajustan con oyentes al cerrar el S4.
 */
export type LevelId = 'high' | 'intermediate' | 'target';

export interface MusicLevel {
  readonly id: LevelId;
  /** Nombre descriptivo para la interfaz. */
  readonly name: string;
  readonly tempo: number;
  readonly mode: Mode;
  readonly layers: number;
  /** Frecuencia de corte del pasa bajos, en Hz. */
  readonly brightnessHz: number;
  /** Ganancia de la señal reverberada (0 a 1). */
  readonly reverb: number;
}

export const LEVELS: Readonly<Record<LevelId, MusicLevel>> = {
  high: {
    id: 'high',
    name: 'Activación alta',
    tempo: 76,
    mode: MODE.majorPentatonic,
    layers: 3,
    brightnessHz: 6000,
    reverb: 0.25,
  },
  intermediate: {
    id: 'intermediate',
    name: 'Intermedio',
    tempo: 66,
    mode: MODE.lydian,
    layers: 2,
    brightnessHz: 3500,
    reverb: 0.35,
  },
  target: {
    id: 'target',
    name: 'Activación baja (meta)',
    // Centro del rango de 58 a 60 BPM del diseño.
    tempo: 59,
    mode: MODE.dronePentatonic,
    layers: 2,
    brightnessHz: 2000,
    reverb: 0.5,
  },
};

export const LEVEL_IDS: readonly LevelId[] = ['high', 'intermediate', 'target'];

/** Los primeros 3 minutos de cada sesión suenan en Intermedio (calibración). */
export const CALIBRATION_LEVEL: LevelId = 'intermediate';
