import { useState } from 'react';
import { Link } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import { absoluteUrl, ROUTES } from '../../config/routes';
import { useMessages } from '../../i18n/messages';
import { KeyIcon } from '../../shared/icons';
import { useAuth } from './authContext';
import { EmailField } from './AuthFields';
import { AuthLayout } from './AuthLayout';
import { FormError } from './FormError';
import { useAccountAction } from './useAccountAction';
import { useFieldErrorText } from './useFieldErrorText';
import { validateEmail, type AuthFieldError } from './validateAuth';

/** Ask for the email that carries the link to choose a new password. */
export function ForgotPasswordPage(): React.JSX.Element {
  const t = useMessages();
  const copy = t.account.forgot;
  const auth = t.account.auth;
  usePageTitle(copy.pageTitle);
  const { state, service } = useAuth();
  const fieldText = useFieldErrorText();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<AuthFieldError | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { pending, error, run } = useAccountAction();

  const submit = async (event: React.SyntheticEvent): Promise<void> => {
    event.preventDefault();
    const invalid = validateEmail(email);
    setEmailError(invalid);
    if (invalid !== null || service === null) return;
    const address = email.trim();
    const resetUrl = absoluteUrl(window.location.origin, ROUTES.resetPassword);
    if (await run(() => service.requestPasswordReset(address, resetUrl))) setSentTo(address);
  };

  const backToLogin = <Link to={ROUTES.login}>{copy.backToLogin}</Link>;

  if (sentTo !== null) {
    return (
      <AuthLayout title={copy.sentTitle} subtitle={copy.sent(sentTo)} footer={backToLogin}>
        <span className="icon-badge icon-badge-large auth-result-icon"><KeyIcon /></span>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={copy.title} subtitle={copy.subtitle} footer={backToLogin}>
      {state.kind === 'unavailable' && <p className="account-notice">{auth.unavailable}</p>}
      {service !== null && (
        <form className="auth-form" aria-label={copy.pageTitle} onSubmit={(event) => { void submit(event); }} noValidate>
          <EmailField label={auth.email} value={email} onChange={setEmail} error={fieldText(emailError)} />
          <FormError code={error} />
          <button type="submit" className="pill-button pill-button-primary pill-button-block pill-button-large" disabled={pending}>
            {pending ? auth.working : copy.submit}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
