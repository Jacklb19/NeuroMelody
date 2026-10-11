import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import { ROUTES } from '../../config/routes';
import { useMessages } from '../../i18n/messages';
import { useAuth } from './authContext';
import { EmailField, PasswordField } from './AuthFields';
import { AuthLayout } from './AuthLayout';
import type { SignUpResult } from './authService';
import { MIN_PASSWORD_LENGTH } from './config';
import { FormError } from './FormError';
import { GoogleButton } from './GoogleButton';
import { useAccountAction } from './useAccountAction';
import { useFieldErrorText } from './useFieldErrorText';
import { validateEmail, validateNewPassword, type AuthFieldError } from './validateAuth';

/**
 * Create an account with an email and a password typed twice, or with
 * Google (ADR-30). The account works at once; no confirmation email.
 */
export function RegisterPage(): React.JSX.Element {
  const t = useMessages();
  const copy = t.account.register;
  const auth = t.account.auth;
  usePageTitle(copy.pageTitle);
  const { state, service, refresh } = useAuth();
  const navigate = useNavigate();
  const fieldText = useFieldErrorText();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email: AuthFieldError | null; password: AuthFieldError | null }>({ email: null, password: null });
  const [confirmationSentTo, setConfirmationSentTo] = useState<string | null>(null);
  const { pending, error, run } = useAccountAction();

  if (state.kind === 'signed_in') return <Navigate to={ROUTES.app} replace />;

  const submit = async (event: React.SyntheticEvent): Promise<void> => {
    event.preventDefault();
    const errors = { email: validateEmail(email), password: validateNewPassword(password, confirmation) };
    setFieldErrors(errors);
    if (errors.email !== null || errors.password !== null || service === null) return;
    const outcome: { result: SignUpResult | null } = { result: null };
    const created = await run(async () => { outcome.result = await service.signUp(email.trim(), password); });
    if (!created) return;
    if (outcome.result === 'confirmation_required') {
      setConfirmationSentTo(email.trim());
      return;
    }
    await refresh();
    await navigate(ROUTES.app);
  };

  // The mismatch belongs to the second field; every other password problem to the first.
  const mismatch = fieldErrors.password === 'passwords_differ';

  return (
    <AuthLayout
      title={copy.title}
      subtitle={copy.subtitle}
      footer={<>{copy.haveAccount} <Link to={ROUTES.login}>{copy.login}</Link></>}
    >
      {state.kind === 'unavailable' && <p className="account-notice">{auth.unavailable}</p>}
      {confirmationSentTo !== null && <p role="status" className="account-notice">{copy.confirmationSent(confirmationSentTo)}</p>}
      {service !== null && confirmationSentTo === null && (
        <>
          <GoogleButton service={service} />
          <p className="auth-divider"><span>{auth.or}</span></p>
          <form className="auth-form" aria-label={copy.pageTitle} onSubmit={(event) => { void submit(event); }} noValidate>
            <EmailField label={auth.email} value={email} onChange={setEmail} error={fieldText(fieldErrors.email)} />
            <PasswordField
              label={auth.password}
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              hint={auth.passwordHint(MIN_PASSWORD_LENGTH)}
              error={mismatch ? null : fieldText(fieldErrors.password)}
            />
            <PasswordField
              label={auth.confirmPassword}
              value={confirmation}
              onChange={setConfirmation}
              autoComplete="new-password"
              error={mismatch ? fieldText(fieldErrors.password) : null}
            />
            <FormError code={error} />
            <button type="submit" className="pill-button pill-button-primary pill-button-block pill-button-large" disabled={pending}>
              {pending ? auth.working : copy.submit}
            </button>
            <p className="field-hint auth-consent">
              {copy.consent} <Link to={ROUTES.privacy}>{copy.privacyLink}</Link>.
            </p>
          </form>
        </>
      )}
      <Link to={ROUTES.app} className="auth-skip">{auth.withoutAccount}</Link>
    </AuthLayout>
  );
}
