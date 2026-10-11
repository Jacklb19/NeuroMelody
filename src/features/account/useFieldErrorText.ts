import { useMessages } from '../../i18n/messages';
import { MIN_PASSWORD_LENGTH } from './config';
import type { AuthFieldError } from './validateAuth';

/** The sentence of a field error, or `null` when there is none. */
export function useFieldErrorText(): (error: AuthFieldError | null) => string | null {
  const errors = useMessages().account.auth.fieldErrors;
  return (error) => {
    if (error === null) return null;
    return error === 'password_too_short' ? errors.password_too_short(MIN_PASSWORD_LENGTH) : errors[error];
  };
}
