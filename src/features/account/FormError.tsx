import { useMessages } from '../../i18n/messages';
import type { AccountErrorCode } from './authService';

/** The sentence of an account error, announced as an alert; nothing when there is none. */
export function FormError({ code }: { readonly code: AccountErrorCode | null }): React.JSX.Element | null {
  const errors: Readonly<Record<AccountErrorCode, string>> = useMessages().account.errors;
  return code === null ? null : <p role="alert" className="form-error">{errors[code]}</p>;
}
