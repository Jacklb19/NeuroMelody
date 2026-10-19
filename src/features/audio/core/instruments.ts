import type { InstrumentId } from './instrumentCatalog';
import {
  BROKEN_CHORD_TIMBRE,
  CHIME_TIMBRE,
  DYAD_TIMBRE,
  MELODY_TIMBRE,
  PAD_TIMBRE,
  SLEEP_PAD_TIMBRE,
  SLOW_PAD_TIMBRE,
  type Timbre,
} from './timbres';

/**
 * What each instrument plays every part of the music with (ADR-46). The
 * arrangement says which part a note belongs to; the instrument says how it
 * sounds.
 */
export const TIMBRE_ROLES = ['pad', 'slowPad', 'dyad', 'sleepPad', 'melody', 'brokenChord', 'chime'] as const;

export type TimbreRole = (typeof TIMBRE_ROLES)[number];

export interface Instrument {
  readonly timbres: Readonly<Record<TimbreRole, Timbre>>;
  /**
   * How the chords are played. A held chord swells and lasts until the next
   * one. A struck one is played like a piano or a bowl: its notes ring and
   * fade, and they are struck again, softer, every `restrikeBeats`.
   */
  readonly struckChords: boolean;
  readonly restrikeBeats: number;
  /** Loudness of a chord struck again, against the first time (0 to 1). */
  readonly restrikeVelocity: number;
  /** Level of the drone under this instrument, against the warm sound (1). */
  readonly droneGain: number;
}

// Soft piano: a bright touch that mellows fast and a long ring, a little wider than the keys of the warm sound.
const PIANO_CHORD: Timbre = {
  amplitude: 0.065,
  attackS: 0.006,
  decayS: 3.2,
  sustain: 0,
  releaseS: 3.2,
  detuneHz: 0.15,
  width: 0.5,
  brightness: 2.6,
  body: 0.25,
  ratio: 1,
};
const PIANO_LOW_CHORD: Timbre = { ...PIANO_CHORD, amplitude: 0.07, decayS: 4.5, releaseS: 4.5, brightness: 2.2 };
const PIANO_MELODY: Timbre = { ...PIANO_CHORD, amplitude: 0.068, decayS: 2.6, releaseS: 2.6, brightness: 3.2, width: 0.3 };
const PIANO_HIGH: Timbre = { ...PIANO_CHORD, amplitude: 0.05, decayS: 3.5, releaseS: 3.5, brightness: 2.4, width: 0.6 };

// Singing bowls: overtones that are not multiples of the note (ratio 2.76), a slow beating between the ears and a long tail.
const BOWL: Timbre = {
  amplitude: 0.05,
  attackS: 0.04,
  decayS: 7,
  sustain: 0,
  releaseS: 7,
  detuneHz: 0.6,
  width: 0.6,
  brightness: 1,
  body: 0.35,
  ratio: 2.76,
};
const DEEP_BOWL: Timbre = { ...BOWL, amplitude: 0.06, decayS: 10, releaseS: 10, detuneHz: 0.4, brightness: 0.8 };
const BOWL_MELODY: Timbre = { ...BOWL, amplitude: 0.07, decayS: 5, releaseS: 5, brightness: 1.2, width: 0.4 };
const SMALL_BOWL: Timbre = { ...BOWL, amplitude: 0.045, decayS: 6, releaseS: 6, detuneHz: 0.9, brightness: 1.1 };

export const INSTRUMENTS: Readonly<Record<InstrumentId, Instrument>> = {
  warm: {
    timbres: {
      pad: PAD_TIMBRE,
      slowPad: SLOW_PAD_TIMBRE,
      dyad: DYAD_TIMBRE,
      sleepPad: SLEEP_PAD_TIMBRE,
      melody: MELODY_TIMBRE,
      brokenChord: BROKEN_CHORD_TIMBRE,
      chime: CHIME_TIMBRE,
    },
    struckChords: false,
    restrikeBeats: 0,
    restrikeVelocity: 0,
    droneGain: 1,
  },
  piano: {
    timbres: {
      pad: PIANO_CHORD,
      slowPad: PIANO_CHORD,
      dyad: PIANO_LOW_CHORD,
      sleepPad: PIANO_LOW_CHORD,
      melody: PIANO_MELODY,
      brokenChord: PIANO_HIGH,
      chime: PIANO_HIGH,
    },
    struckChords: true,
    restrikeBeats: 4,
    restrikeVelocity: 0.6,
    // The piano carries the harmony itself: the drone stays further back.
    droneGain: 0.6,
  },
  bowls: {
    timbres: {
      pad: BOWL,
      slowPad: BOWL,
      dyad: DEEP_BOWL,
      sleepPad: DEEP_BOWL,
      melody: BOWL_MELODY,
      brokenChord: SMALL_BOWL,
      chime: SMALL_BOWL,
    },
    struckChords: true,
    restrikeBeats: 8,
    restrikeVelocity: 0.7,
    droneGain: 0.85,
  },
};
