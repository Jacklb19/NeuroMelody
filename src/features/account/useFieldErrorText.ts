import { useMessages } from '../../i18n/messages';
import { MAX_PASSWORD_BYTES, MIN_PASSWORD_LENGTH } from './config';
import type { AuthFieldError } from './validateAuth';

/** The sentence of a field error, or `null` when there is none. */
export function useFieldErrorText(): (error: AuthFieldError | null) => string | null {
  const errors = useMessages().account.auth.fieldErrors;
  return (error) => {
    if (error === null) return null;
    if (error === 'password_too_short') return errors.password_too_short(MIN_PASSWORD_LENGTH);
    return error === 'password_too_long' ? errors.password_too_long(MAX_PASSWORD_BYTES) : errors[error];
  };
}
