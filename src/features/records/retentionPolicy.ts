import type { SessionRecord } from './sessionRecord';

/**
 * Sessions shorter than this, with no indices at all, are not worth keeping:
 * they hold nothing to review in the summary or the history.
 */
export const MIN_KEPT_SECONDS = 60;

/** Whether a finished session is stored on the device. */
export function worthKeeping(record: SessionRecord): boolean {
  return record.samples.length > 0 || record.listenedSeconds >= MIN_KEPT_SECONDS;
}
