import type { Messages } from '../../i18n/messages';
import { CloudError, type CloudErrorCode } from '../cloud/cloudApi';
import { MAX_RATING, MIN_RATING } from './sessionRecord';
import { SessionStoreError, type SessionStoreErrorCode } from './sessionStore';

/** Sentence of every store error code; the `Record` type makes a code without text a compile error. */
export function storeErrorMessages(t: Messages): Readonly<Record<SessionStoreErrorCode, string>> {
  const errors = t.records.errors;
  return {
    invalid_record: errors.invalid_record,
    invalid_note: t.insights.note.invalid,
    invalid_rating: errors.invalid_rating(MIN_RATING, MAX_RATING),
    not_found: errors.not_found,
    access_failed: errors.access_failed,
    open_failed: errors.open_failed,
  };
}

/** What the person reads when the history fails to load, save or delete, on the device or in the cloud. */
export function storeErrorMessage(error: unknown, t: Messages): string {
  if (error instanceof SessionStoreError) return storeErrorMessages(t)[error.code];
  if (error instanceof CloudError) {
    const reasons: Readonly<Record<CloudErrorCode, string>> = t.cloud.errors;
    return reasons[error.code];
  }
  return t.common.unknownError;
}
