import { useId, useState } from 'react';
import { Link } from 'react-router';
import { accountUrl, ROUTES } from '../../config/routes';
import { useMessages } from '../../i18n/messages';
import type { AuthService } from './authService';
import { AUTH_FORM_IDS, DEFAULT_AUTH_FORM, MIN_PASSWORD_LENGTH, RECOVERY_MODE, type AuthFormId } from './config';
import { FormError } from './FormError';
import { useAccountAction } from './useAccountAction';

interface AuthFormsProps {
  readonly service: AuthService;
  readonly onSignedIn: () => Promise<void>;
}

/** Signed-out view: sign in, create an account (confirmed by email) or ask for a recovery link. */
export function AuthForms({ service, onSignedIn }: AuthFormsProps): React.JSX.Element {
  const t = useMessages();
  const copy = t.account;
  const [form, setForm] = useState<AuthFormId>(DEFAULT_AUTH_FORM);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [tooShort, setTooShort] = useState(false);
  const { pending, error, run, clearError } = useAccountAction();
  const ids = { email: useId(), password: useId(), hint: useId() };
  const needsPassword = form !== 'reset';
  const newPassword = form === 'signUp';

  const choose = (next: AuthFormId): void => {
    setForm(next);
    setSentTo(null);
    setTooShort(false);
    clearError();
  };

  const submit = async (event: React.SyntheticEvent): Promise<void> => {
    event.preventDefault();
    if (newPassword && password.length < MIN_PASSWORD_LENGTH) {
      setTooShort(true);
      return;
    }
    setTooShort(false);
    const origin = window.location.origin;
    if (form === 'signIn') {
      if (await run(() => service.signIn(email, password))) await onSignedIn();
    } else if (form === 'signUp') {
      if (await run(() => service.signUp(email, password, accountUrl(origin)))) setSentTo(email);
    } else if (await run(() => service.requestPasswordReset(email, accountUrl(origin, RECOVERY_MODE)))) {
      setSentTo(email);
    }
  };

  return (
    <div className="auth-forms">
      <div className="auth-tabs" role="group" aria-label={copy.formsLabel}>
        {AUTH_FORM_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className={id === form ? 'auth-tab active' : 'auth-tab'}
            aria-pressed={id === form}
            onClick={() => { choose(id); }}
          >
            {copy.forms[id]}
          </button>
        ))}
      </div>

      {sentTo !== null ? (
        <p role="status" className="account-notice">
          {form === 'signUp' ? copy.signUpSent(sentTo) : copy.resetSent(sentTo)}
        </p>
      ) : (
        <form className="account-form" aria-label={copy.forms[form]} onSubmit={(event) => { void submit(event); }} noValidate>
          <label htmlFor={ids.email}>{copy.email}</label>
          <input
            id={ids.email}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => { setEmail(event.target.value); }}
          />
          {needsPassword && (
            <>
              <label htmlFor={ids.password}>{copy.password}</label>
              <input
                id={ids.password}
                type="password"
                autoComplete={newPassword ? 'new-password' : 'current-password'}
                required
                minLength={newPassword ? MIN_PASSWORD_LENGTH : undefined}
                aria-describedby={newPassword ? ids.hint : undefined}
                aria-invalid={tooShort}
                value={password}
                onChange={(event) => { setPassword(event.target.value); }}
              />
              {newPassword && <p id={ids.hint} className="field-hint">{copy.passwordHint(MIN_PASSWORD_LENGTH)}</p>}
            </>
          )}
          {tooShort && <p role="alert" className="form-error">{copy.passwordTooShort(MIN_PASSWORD_LENGTH)}</p>}
          <FormError code={error} />
          {newPassword && (
            <p className="field-hint">
              {copy.consentNotice} <Link to={ROUTES.privacy}>{copy.privacyLink}</Link>.
            </p>
          )}
          <button type="submit" className="button button-primary" disabled={pending}>
            {pending ? copy.working : copy.submit[form]}
          </button>
        </form>
      )}
    </div>
  );
}
