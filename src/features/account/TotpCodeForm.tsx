import { useId, useState } from 'react';
import { useMessages } from '../../i18n/messages';
import { isTotpCode, TOTP_CODE_LENGTH } from './config';
import { FormError } from './FormError';
import { useAccountAction } from './useAccountAction';

interface TotpCodeFormProps {
  readonly onVerify: (code: string) => Promise<void>;
  readonly onCancel?: () => void;
}

/** One-time code field shared by adding a device and confirming a sign-in. */
export function TotpCodeForm({ onVerify, onCancel }: TotpCodeFormProps): React.JSX.Element {
  const copy = useMessages().account.totp;
  const [code, setCode] = useState('');
  const [badFormat, setBadFormat] = useState(false);
  const { pending, error, run } = useAccountAction();
  const fieldId = useId();

  const submit = async (event: React.SyntheticEvent): Promise<void> => {
    event.preventDefault();
    const clean = code.replace(/\s/g, '');
    if (!isTotpCode(clean)) {
      setBadFormat(true);
      return;
    }
    setBadFormat(false);
    await run(() => onVerify(clean));
  };

  return (
    <form className="account-form totp-form" onSubmit={(event) => { void submit(event); }} noValidate>
      <label htmlFor={fieldId}>{copy.codeLabel(TOTP_CODE_LENGTH)}</label>
      <input
        id={fieldId}
        className="totp-input"
        inputMode="numeric"
        autoComplete="one-time-code"
        // One extra character allows a code typed as two groups ("123 456").
        maxLength={TOTP_CODE_LENGTH + 1}
        aria-invalid={badFormat}
        value={code}
        onChange={(event) => { setCode(event.target.value); }}
      />
      {badFormat && <p role="alert" className="form-error">{copy.invalidFormat(TOTP_CODE_LENGTH)}</p>}
      <FormError code={error} />
      <div className="form-actions">
        <button type="submit" className="button button-primary" disabled={pending}>{copy.verify}</button>
        {onCancel !== undefined && <button type="button" className="button button-secondary" onClick={onCancel}>{copy.cancel}</button>}
      </div>
    </form>
  );
}
