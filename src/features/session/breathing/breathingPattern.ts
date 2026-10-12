import type { GoalId } from '../../plan/goalCatalog';
import { SECONDS_PER_MINUTE } from '../../../shared/time';

/**
 * Guided breathing of the session (ADR-33). The pace is counted in beats of
 * the music, so the breath slows down as the music does. At the target
 * tempo (59 BPM) one cycle lasts about 10 s; breathing out is the longer half.
 */
export const INHALE_BEATS = 4;
export const EXHALE_BEATS = 6;
export const BREATH_CYCLE_BEATS = INHALE_BEATS + EXHALE_BEATS;

/** The goal of the plan that turns the guide on from the start. */
export const BREATHING_GOAL: GoalId = 'slow_breathing';

export const BREATH_PHASE_IDS = ['inhale', 'exhale'] as const;

export type BreathPhase = (typeof BREATH_PHASE_IDS)[number];

export interface BreathMoment {
  readonly phase: BreathPhase;
  /** How full the breath is, from 0 (end of breathing out) to 1 (end of breathing in). */
  readonly fullness: number;
}

/** Slow at both ends, like a breath: no jolt when it turns around. */
function ease(progress: number): number {
  return (1 - Math.cos(Math.PI * progress)) / 2;
}

/** Where the breath is after `beats` beats of guiding; the cycle repeats. */
export function breathAt(beats: number): BreathMoment {
  const position = ((beats % BREATH_CYCLE_BEATS) + BREATH_CYCLE_BEATS) % BREATH_CYCLE_BEATS;
  if (position < INHALE_BEATS) {
    return { phase: 'inhale', fullness: ease(position / INHALE_BEATS) };
  }
  return { phase: 'exhale', fullness: 1 - ease((position - INHALE_BEATS) / EXHALE_BEATS) };
}

/** Beats played in `seconds` at a tempo; time never runs backwards. */
export function beatsIn(seconds: number, tempoBpm: number): number {
  return (Math.max(0, seconds) * tempoBpm) / SECONDS_PER_MINUTE;
}
