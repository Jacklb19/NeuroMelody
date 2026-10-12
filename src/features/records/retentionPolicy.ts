import { isTrialSource } from '../acquisition/sourceTraits';
import type { SessionRecord } from './sessionRecord';

/**
 * Sessions shorter than this, with no indices at all, are not worth keeping:
 * they hold nothing to review in the summary or the history.
 */
export const MIN_KEPT_SECONDS = 60;

/**
 * Whether a finished session is stored on the device. One made with a source
 * that measures nobody (the simulator, a sample recording) never is: it was a
 * trial of the app, not a session of the person.
 */
export function worthKeeping(record: SessionRecord): boolean {
  if (isTrialSource(record.sourceKind)) return false;
  return record.samples.length > 0 || record.listenedSeconds >= MIN_KEPT_SECONDS;
}

/**
 * The sessions that count as the person's. Trial sessions are no longer
 * stored, but devices keep the ones made before that rule: they stay in the
 * history, where they can be deleted, and out of every figure.
 */
export function measuredSessions(records: readonly SessionRecord[]): readonly SessionRecord[] {
  return records.filter((record) => !isTrialSource(record.sourceKind));
}
