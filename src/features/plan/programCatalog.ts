import type { GuidanceRange } from '../adaptation/AdaptationEngine';
import { CALIBRATION_LEVEL, TARGET_LEVEL } from '../audio/engine/levels';
import type { GoalId } from './goalCatalog';

/**
 * What a session does with the music, decided by what the person is after
 * (ADR-38): where the music starts, how calm it is allowed to get and whether
 * the guided breathing begins switched on. The guidance in between is the
 * same for every program (ADR-12): one step at a time, never by jumps.
 */
export interface SessionProgram extends GuidanceRange {
  /** Whether the guided breathing starts on; the person can always switch it. */
  readonly breathing: boolean;
  /**
   * Whether the session ends by itself: the music fades out as the plan ends,
   * with no warning to answer, and the screen dims while nobody touches it (ADR-41).
   */
  readonly quietEnding: boolean;
}

/** The session of someone who chose nothing: the one every session had before programs existed. */
export const DEFAULT_PROGRAM: SessionProgram = {
  startLevel: CALIBRATION_LEVEL,
  calmestLevel: TARGET_LEVEL,
  breathing: false,
  quietEnding: false,
};

export const PROGRAMS: Readonly<Record<GoalId, SessionProgram>> = {
  // From a middle pace down to the calmest music.
  relax: DEFAULT_PROGRAM,
  // To fall asleep: one step past the target, slow breathing, and an ending nobody has to attend.
  rest_before_sleep: { startLevel: CALIBRATION_LEVEL, calmestLevel: 'sleep', breathing: true, quietEnding: true },
  // Meets the person where an activity left them, then comes down two steps.
  calm_after_activity: { startLevel: 'high', calmestLevel: TARGET_LEVEL, breathing: false, quietEnding: false },
  // Slow breathing needs a slow pulse to count on: the calmest music from the first minute.
  slow_breathing: { startLevel: TARGET_LEVEL, calmestLevel: TARGET_LEVEL, breathing: true, quietEnding: false },
  // A short break stays light and steady instead of sinking into deep calm.
  pause: { startLevel: CALIBRATION_LEVEL, calmestLevel: CALIBRATION_LEVEL, breathing: false, quietEnding: false },
};

/**
 * The program of a session. The plan lets the person choose one goal; a link
 * that carries several is read by its first one, in catalog order.
 */
export function programFor(goals: readonly GoalId[]): SessionProgram {
  const [goal] = goals;
  return goal === undefined ? DEFAULT_PROGRAM : PROGRAMS[goal];
}
