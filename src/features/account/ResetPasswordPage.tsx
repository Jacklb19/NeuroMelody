import { useState } from 'react';
import { Link } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import { ROUTES } from '../../config/routes';
import { useMessages } from '../../i18n/messages';
import { ShieldIcon } from '../../shared/icons';
import { useAuth } from './authContext';
import { PasswordField } from './AuthFields';
import { AuthLayout } from './AuthLayout';
import { MIN_PASSWORD_LENGTH } from './config';
import { FormError } from './FormError';
import { useAccountAction } from './useAccountAction';
import { useFieldErrorText } from './useFieldErrorText';
import { validateNewPassword, type AuthFieldError } from './validateAuth';

/**
 * Where the recovery link lands: the link signs the person in and this
 * screen asks for the new password, typed twice. A dead link says so.
 */
export function ResetPasswordPage(): React.JSX.Element {
  const t = useMessages();
  const copy = t.account.reset;
  const auth = t.account.auth;
  usePageTitle(copy.pageTitle);
  const { state, service, finishRecovery } = useAuth();
  const fieldText = useFieldErrorText();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [fieldError, setFieldError] = useState<AuthFieldError | null>(null);
  const [saved, setSaved] = useState(false);
  const { pending, error, run } = useAccountAction();

  if (saved) {
    return (
      <AuthLayout title={copy.savedTitle} subtitle={copy.saved}>
        <span className="icon-badge icon-badge-large auth-result-icon"><ShieldIcon /></span>
        <Link to={ROUTES.app} className="pill-button pill-button-primary pill-button-block pill-button-large">{copy.continue}</Link>
      </AuthLayout>
    );
  }

  if (state.kind === 'loading') {
    return <AuthLayout title={copy.title} subtitle={auth.working}>{null}</AuthLayout>;
  }

  if ((state.kind !== 'recovery' && state.kind !== 'signed_in') || service === null) {
    return (
      <AuthLayout title={copy.expiredTitle} subtitle={copy.expired}>
        <Link to={ROUTES.forgotPassword} className="pill-button pill-button-primary pill-button-block pill-button-large">{copy.requestAgain}</Link>
      </AuthLayout>
    );
  }

  const submit = async (event: React.SyntheticEvent): Promise<void> => {
    event.preventDefault();
    const invalid = validateNewPassword(password, confirmation);
    setFieldError(invalid);
    if (invalid !== null) return;
    if (await run(() => service.updatePassword(password))) {
      setSaved(true);
      await finishRecovery();
    }
  };

  const mismatch = fieldError === 'passwords_differ';

  return (
    <AuthLayout title={copy.title} subtitle={copy.subtitle}>
      <form className="auth-form" aria-label={copy.pageTitle} onSubmit={(event) => { void submit(event); }} noValidate>
        <PasswordField
          label={auth.newPassword}
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          hint={auth.passwordHint(MIN_PASSWORD_LENGTH)}
          error={mismatch ? null : fieldText(fieldError)}
        />
        <PasswordField
          label={auth.confirmPassword}
          value={confirmation}
          onChange={setConfirmation}
          autoComplete="new-password"
          error={mismatch ? fieldText(fieldError) : null}
        />
        <FormError code={error} />
        <button type="submit" className="pill-button pill-button-primary pill-button-block pill-button-large" disabled={pending}>
          {pending ? auth.working : copy.submit}
        </button>
      </form>
    </AuthLayout>
  );
}
