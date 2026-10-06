/**
 * Duration warnings (RF-18, RNF-06): when the plan duration is reached and,
 * if the session continues, every 60 continuous minutes. Without an answer
 * within 2 minutes, a 20 s fade ends the session.
 */
export const RESPONSE_WAIT_S = 120;
export const CONTINUOUS_WARNING_PERIOD_S = 60 * 60;

/**
 * Instant of warning number `index` (0 = end of plan), in seconds of
 * playback since the session started.
 */
export function warningInstantS(planDurationS: number, index: number): number {
  let instant = planDurationS;
  for (let i = 0; i < index; i++) {
    instant = (Math.floor(instant / CONTINUOUS_WARNING_PERIOD_S) + 1) * CONTINUOUS_WARNING_PERIOD_S;
  }
  return instant;
}

/** Instant at which the fade starts if nobody answers warning `index`. */
export function fadeStartS(planDurationS: number, index: number): number {
  return warningInstantS(planDurationS, index) + RESPONSE_WAIT_S;
}
