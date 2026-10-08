import { describe, expect, it } from 'vitest';
import { es } from '../i18n/es';
import { errorMessage } from './errorMessage';

describe('errorMessage', () => {
  it('keeps the message of an error', () => {
    expect(errorMessage(new Error('Quota exceeded'), es.common.unknownError)).toBe('Quota exceeded');
  });

  it('falls back to the generic text for anything else', () => {
    expect(errorMessage('boom', es.common.unknownError)).toBe(es.common.unknownError);
    expect(errorMessage(undefined, es.common.unknownError)).toBe(es.common.unknownError);
  });
});
