import { describe, expect, it } from 'vitest';
import { es } from '../../i18n/es';
import { MAX_RATING, MIN_RATING } from './sessionRecord';
import { SESSION_STORE_ERROR_CODES, SessionStoreError } from './sessionStore';
import { storeErrorMessage, storeErrorMessages } from './storeErrorMessage';

describe('storeErrorMessage', () => {
  it('has a non-empty message for every store error code', () => {
    const messages = storeErrorMessages(es);
    for (const code of SESSION_STORE_ERROR_CODES) {
      expect(messages[code].trim()).not.toBe('');
    }
  });

  it('translates store errors by their code, not their developer message', () => {
    const error = new SessionStoreError('invalid_rating', 'The rating must be a whole number.');
    expect(storeErrorMessage(error, es)).toBe(es.records.errors.invalid_rating(MIN_RATING, MAX_RATING));
  });

  it('falls back to the generic text for errors without a code', () => {
    expect(storeErrorMessage('boom', es)).toBe(es.common.unknownError);
  });
});
