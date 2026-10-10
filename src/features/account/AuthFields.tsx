import { useId, useState } from 'react';
import { useMessages } from '../../i18n/messages';

interface FieldProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  /** Error of this field, already worded; it is announced and linked to the input. */
  readonly error?: string | null;
  readonly hint?: string;
}

export function EmailField({ label, value, onChange, error = null }: FieldProps): React.JSX.Element {
  const copy = useMessages().account.auth;
  const id = useId();
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder={copy.emailPlaceholder}
        aria-invalid={error !== null}
        aria-describedby={error !== null ? `${id}-error` : undefined}
        value={value}
        onChange={(event) => { onChange(event.target.value); }}
      />
      {error !== null && <p id={`${id}-error`} role="alert" className="field-error">{error}</p>}
    </div>
  );
}

interface PasswordFieldProps extends FieldProps {
  /** `new-password` when the person is choosing one, so password managers offer to save it. */
  readonly autoComplete: 'current-password' | 'new-password';
}

/** Password input with a button to reveal what was typed. */
export function PasswordField({ label, value, onChange, error = null, hint, autoComplete }: PasswordFieldProps): React.JSX.Element {
  const copy = useMessages().account.auth;
  const [visible, setVisible] = useState(false);
  const id = useId();
  const described = [error !== null ? `${id}-error` : null, hint !== undefined ? `${id}-hint` : null].filter((part) => part !== null).join(' ');
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <div className="password-input">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          aria-invalid={error !== null}
          aria-describedby={described === '' ? undefined : described}
          value={value}
          onChange={(event) => { onChange(event.target.value); }}
        />
        <button type="button" className="password-toggle" aria-pressed={visible} onClick={() => { setVisible((shown) => !shown); }}>
          {visible ? copy.hidePassword : copy.showPassword}
        </button>
      </div>
      {hint !== undefined && error === null && <p id={`${id}-hint`} className="field-hint">{hint}</p>}
      {error !== null && <p id={`${id}-error`} role="alert" className="field-error">{error}</p>}
    </div>
  );
}
