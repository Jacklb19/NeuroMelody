import type { Messages } from '../../i18n/messages';
import { errorMessage } from '../../shared/errorMessage';
import { MAX_RATING, MIN_RATING } from './sessionRecord';
import { SessionStoreError, type SessionStoreErrorCode } from './sessionStore';

/** Sentence of every store error code; the `Record` type makes a code without text a compile error. */
export function storeErrorMessages(t: Messages): Readonly<Record<SessionStoreErrorCode, string>> {
  const errors = t.records.errors;
  return {
    invalid_record: errors.invalid_record,
    invalid_rating: errors.invalid_rating(MIN_RATING, MAX_RATING),
    not_found: errors.not_found,
    access_failed: errors.access_failed,
    open_failed: errors.open_failed,
  };
}

/** What the person reads when the local history fails to load or save. */
export function storeErrorMessage(error: unknown, t: Messages): string {
  return error instanceof SessionStoreError
    ? storeErrorMessages(t)[error.code]
    : errorMessage(error, t.common.unknownError);
}
