import { MODE, type Mode } from '../core/theory';

/**
 * Music levels of the guidance (docs/diseno-musical.md). Initial values
 * approved in S3; they are tuned with listeners when S4 closes.
 */
export type LevelId = 'high' | 'intermediate' | 'target';

export interface MusicLevel {
  readonly id: LevelId;
  /** Descriptive name for the interface. */
  readonly name: string;
  readonly tempo: number;
  readonly mode: Mode;
  readonly layers: number;
  /** Low-pass cutoff frequency, in Hz. */
  readonly brightnessHz: number;
  /** Gain of the reverberated signal (0 to 1). */
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
    // Middle of the 58 to 60 BPM range of the design.
    tempo: 59,
    mode: MODE.dronePentatonic,
    layers: 2,
    brightnessHz: 2000,
    reverb: 0.5,
  },
};

export const LEVEL_IDS: readonly LevelId[] = ['high', 'intermediate', 'target'];

/** The first 3 minutes of every session play at Intermediate (calibration). */
export const CALIBRATION_LEVEL: LevelId = 'intermediate';
