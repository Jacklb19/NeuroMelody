import { MODE, type Mode } from '../core/theory';

/**
 * Music levels of the guidance (docs/diseno-musical.md), ordered from the
 * most activating to the target. The order is the ladder the adaptation
 * climbs one step at a time (ADR-12). Initial values approved in S3; they are
 * tuned with listeners when S4 closes. Their names live in the dictionary.
 */
export const LEVEL_IDS = ['high', 'intermediate', 'target'] as const;

export type LevelId = (typeof LEVEL_IDS)[number];

export interface MusicLevel {
  readonly id: LevelId;
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
    tempo: 76,
    mode: MODE.majorPentatonic,
    layers: 3,
    brightnessHz: 6000,
    reverb: 0.25,
  },
  intermediate: {
    id: 'intermediate',
    tempo: 66,
    mode: MODE.lydian,
    layers: 2,
    brightnessHz: 3500,
    reverb: 0.35,
  },
  target: {
    id: 'target',
    // Middle of the 58 to 60 BPM range of the design.
    tempo: 59,
    mode: MODE.dronePentatonic,
    layers: 2,
    brightnessHz: 2000,
    reverb: 0.5,
  },
};

/** Every session starts here and stays here while calibrating (ADR-12). */
export const CALIBRATION_LEVEL: LevelId = 'intermediate';

/** One step closer to the target; `null` at the target. */
export function nextLevel(id: LevelId): LevelId | null {
  return LEVEL_IDS[LEVEL_IDS.indexOf(id) + 1] ?? null;
}

/** One step back towards high activation; `null` at the top of the ladder. */
export function previousLevel(id: LevelId): LevelId | null {
  return LEVEL_IDS[LEVEL_IDS.indexOf(id) - 1] ?? null;
}
