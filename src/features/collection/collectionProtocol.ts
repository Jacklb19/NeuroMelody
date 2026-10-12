/**
 * The guided recording that gives the classifier examples of this person
 * (ADR-32, ADR-33): three stretches, each of which teaches one state. The
 * stage id is the label stored with its heartbeats, and `back/training`
 * reads the same ids, so changing one here means changing it there.
 */
export const COLLECTION_STAGE_IDS = ['rest', 'slow_breathing', 'demanding_task'] as const;

export type CollectionStageId = (typeof COLLECTION_STAGE_IDS)[number];

/**
 * Seconds of signal each stage records. Rest is the longest because its
 * first three minutes are the person's baseline, as in a session
 * (`CALIBRATION_MS`), and only what follows becomes an example. Every stage
 * needs a full minute of beats before its first reading (`MIN_NN_FOR_INDICES_MS`).
 */
export const STAGE_SECONDS: Readonly<Record<CollectionStageId, number>> = {
  rest: 300,
  slow_breathing: 180,
  demanding_task: 180,
};

/** Seconds of the whole recording, without the pauses between stages. */
export const PROTOCOL_SECONDS = COLLECTION_STAGE_IDS.reduce((sum, id) => sum + STAGE_SECONDS[id], 0);

/**
 * The demanding task: counting down from a number in steps of another, out
 * loud in the mind and against the clock. Its answers are never stored.
 */
export const SUBTRACTION_START = 1000;
export const SUBTRACTION_STEP = 7;

/** The number the task goes back to when the count can no longer go down a whole step. */
export function nextSubtractionValue(current: number): number {
  const next = current - SUBTRACTION_STEP;
  return next < SUBTRACTION_STEP ? SUBTRACTION_START : next;
}
