import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import { ROUTES } from '../../config/routes';
import { useMessages } from '../../i18n/messages';
import { needsSecondFactor, useAuth } from './authContext';
import { EmailField, PasswordField } from './AuthFields';
import { AuthLayout } from './AuthLayout';
import { FormError } from './FormError';
import { GoogleButton } from './GoogleButton';
import { SecondFactorChallenge } from './SecondFactorChallenge';
import { useAccountAction } from './useAccountAction';
import { useFieldErrorText } from './useFieldErrorText';
import { validateEmail, type AuthFieldError } from './validateAuth';

/**
 * Sign in with email and password or with Google (ADR-10, ADR-30). An
 * account with two-step verification is asked for its code here, before
 * entering the app. Listening without an account stays one link away.
 */
export function LoginPage(): React.JSX.Element {
  const t = useMessages();
  const copy = t.account.login;
  const auth = t.account.auth;
  usePageTitle(copy.pageTitle);
  const { state, service, refresh } = useAuth();
  const navigate = useNavigate();
  const fieldText = useFieldErrorText();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email: AuthFieldError | null; password: AuthFieldError | null }>({ email: null, password: null });
  const { pending, error, run } = useAccountAction();

  const enter = async (): Promise<void> => {
    await refresh();
    await navigate(ROUTES.app);
  };

  if (state.kind === 'signed_in' && !needsSecondFactor(state.assurance)) return <Navigate to={ROUTES.app} replace />;

  if (state.kind === 'signed_in' && service !== null) {
    return (
      <AuthLayout title={t.account.totp.challengeTitle} subtitle={t.account.totp.challengeText}>
        <SecondFactorChallenge service={service} onVerified={enter} />
      </AuthLayout>
    );
  }

  const submit = async (event: React.SyntheticEvent): Promise<void> => {
    event.preventDefault();
    const errors = { email: validateEmail(email), password: password === '' ? 'password_required' as const : null };
    setFieldErrors(errors);
    if (errors.email !== null || errors.password !== null || service === null) return;
    // The session event moves this screen on: to the code step or into the app.
    await run(async () => {
      await service.signIn(email.trim(), password);
      await refresh();
    });
  };

  return (
    <AuthLayout
      title={copy.title}
      subtitle={copy.subtitle}
      footer={<>{copy.noAccount} <Link to={ROUTES.register}>{copy.register}</Link></>}
    >
      {state.kind === 'unavailable' && <p className="account-notice">{auth.unavailable}</p>}
      {service !== null && (
        <>
          <GoogleButton service={service} />
          <p className="auth-divider"><span>{auth.or}</span></p>
          <form className="auth-form" aria-label={copy.pageTitle} onSubmit={(event) => { void submit(event); }} noValidate>
            <EmailField label={auth.email} value={email} onChange={setEmail} error={fieldText(fieldErrors.email)} />
            <PasswordField label={auth.password} value={password} onChange={setPassword} autoComplete="current-password" error={fieldText(fieldErrors.password)} />
            <Link to={ROUTES.forgotPassword} className="auth-forgot">{copy.forgot}</Link>
            <FormError code={error} />
            <button type="submit" className="pill-button pill-button-primary pill-button-block pill-button-large" disabled={pending}>
              {pending ? auth.working : copy.submit}
            </button>
          </form>
        </>
      )}
      <Link to={ROUTES.app} className="auth-skip">{auth.withoutAccount}</Link>
    </AuthLayout>
  );
}
