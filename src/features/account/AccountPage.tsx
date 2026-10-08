import { useId, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import { QUERY_PARAMS, ROUTES } from '../../config/routes';
import { useMessages } from '../../i18n/messages';
import { PageHeading } from '../../shared/PageHeading';
import { AuthForms } from './AuthForms';
import { AccountError, type AuthService, type AuthUser } from './authService';
import { useAuth, type AuthState } from './authContext';
import { MIN_PASSWORD_LENGTH, RECOVERY_MODE } from './config';
import { FormError } from './FormError';
import { TotpCodeForm } from './TotpCodeForm';
import { TotpSection } from './TotpSection';
import { useAccountAction } from './useAccountAction';

/**
 * Account (RF-14, ADR-10, ADR-18): sign in or create an account confirmed by
 * email, recover the password, confirm the second factor at sign-in and
 * manage the authenticator devices. Listening never requires it.
 */
export function AccountPage(): React.JSX.Element {
  const t = useMessages();
  const copy = t.account;
  usePageTitle(copy.pageTitle);
  const { state, service, refresh, finishRecovery } = useAuth();
  const [params] = useSearchParams();
  // The recovery link carries the mode too, in case the session event arrived before this screen.
  const recoveryLink = params.get(QUERY_PARAMS.accountMode) === RECOVERY_MODE;

  return (
    <div className="reading-page account-page">
      <PageHeading eyebrow={copy.eyebrow} title={copy.pageTitle}>
        <p>{copy.introduction}</p>
      </PageHeading>
      <AccountBody
        state={state}
        service={service}
        recoveryLink={recoveryLink}
        refresh={refresh}
        finishRecovery={finishRecovery}
      />
    </div>
  );
}

interface AccountBodyProps {
  readonly state: AuthState;
  readonly service: AuthService | null;
  readonly recoveryLink: boolean;
  readonly refresh: () => Promise<void>;
  readonly finishRecovery: () => Promise<void>;
}

function AccountBody({ state, service, recoveryLink, refresh, finishRecovery }: AccountBodyProps): React.JSX.Element {
  const copy = useMessages().account;
  if (state.kind === 'loading') return <p role="status">{copy.loading}</p>;
  if (state.kind === 'unavailable' || service === null) return <p className="account-notice">{copy.unavailable}</p>;
  if (state.kind === 'signed_out') return <AuthForms service={service} onSignedIn={refresh} />;
  if (state.kind === 'recovery' || recoveryLink) {
    return <NewPasswordForm service={service} onSaved={finishRecovery} />;
  }
  const { assurance, user } = state;
  if (assurance.current === 'aal1' && assurance.next === 'aal2') {
    return <SecondFactorChallenge service={service} onVerified={refresh} />;
  }
  return <AccountSettings service={service} user={user} secondFactorOn={assurance.current === 'aal2'} onChanged={refresh} />;
}

/** Second step of the sign-in when the account has an authenticator (aal1 → aal2). */
function SecondFactorChallenge({ service, onVerified }: { readonly service: AuthService; readonly onVerified: () => Promise<void> }): React.JSX.Element {
  const copy = useMessages().account.totp;
  const titleId = useId();
  const verify = async (code: string): Promise<void> => {
    // Each device has its own secret, so the code is tried against every one until one accepts it.
    const factors = await service.listTotpFactors();
    let failure: Error = new AccountError('invalid_code');
    for (const factor of factors) {
      try {
        await service.verifyTotp(factor.id, code);
        await onVerified();
        return;
      } catch (error) {
        failure = error instanceof Error ? error : new AccountError('unknown');
      }
    }
    throw failure;
  };
  return (
    <section className="account-section" aria-labelledby={titleId}>
      <h2 id={titleId}>{copy.challengeTitle}</h2>
      <p>{copy.challengeText}</p>
      <TotpCodeForm onVerify={verify} />
    </section>
  );
}

function NewPasswordForm({ service, onSaved }: { readonly service: AuthService; readonly onSaved: () => Promise<void> }): React.JSX.Element {
  const copy = useMessages().account;
  const [password, setPassword] = useState('');
  const [tooShort, setTooShort] = useState(false);
  const [saved, setSaved] = useState(false);
  const { pending, error, run } = useAccountAction();
  const ids = { title: useId(), field: useId(), hint: useId() };
  const [, setParams] = useSearchParams();

  const submit = async (event: React.SyntheticEvent): Promise<void> => {
    event.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      setTooShort(true);
      return;
    }
    setTooShort(false);
    if (await run(() => service.updatePassword(password))) {
      setSaved(true);
      setParams({}, { replace: true });
      await onSaved();
    }
  };

  if (saved) return <p role="status" className="account-notice">{copy.passwordUpdated}</p>;
  return (
    <section className="account-section" aria-labelledby={ids.title}>
      <h2 id={ids.title}>{copy.recoveryTitle}</h2>
      <form className="account-form" onSubmit={(event) => { void submit(event); }} noValidate>
        <label htmlFor={ids.field}>{copy.newPassword}</label>
        <input
          id={ids.field}
          type="password"
          autoComplete="new-password"
          aria-describedby={ids.hint}
          aria-invalid={tooShort}
          value={password}
          onChange={(event) => { setPassword(event.target.value); }}
        />
        <p id={ids.hint} className="field-hint">{copy.passwordHint(MIN_PASSWORD_LENGTH)}</p>
        {tooShort && <p role="alert" className="form-error">{copy.passwordTooShort(MIN_PASSWORD_LENGTH)}</p>}
        <FormError code={error} />
        <button type="submit" className="button button-primary" disabled={pending}>
          {pending ? copy.working : copy.submit.updatePassword}
        </button>
      </form>
    </section>
  );
}

interface AccountSettingsProps {
  readonly service: AuthService;
  readonly user: AuthUser;
  readonly secondFactorOn: boolean;
  readonly onChanged: () => Promise<void>;
}

function AccountSettings({ service, user, secondFactorOn, onChanged }: AccountSettingsProps): React.JSX.Element {
  const copy = useMessages().account;
  const { pending, error, run } = useAccountAction();
  const titleId = useId();
  return (
    <>
      <section className="account-section" aria-labelledby={titleId}>
        <h2 id={titleId}>{copy.signedIn.title}</h2>
        <dl className="account-summary">
          <div><dt>{copy.signedIn.emailLabel}</dt><dd>{user.email}</dd></div>
          <div>
            <dt>{copy.totp.title}</dt>
            <dd className={secondFactorOn ? 'status-on' : 'status-off'}>
              {secondFactorOn ? copy.signedIn.secondFactorOn : copy.signedIn.secondFactorOff}
            </dd>
          </div>
        </dl>
        {!secondFactorOn && <p className="field-hint">{copy.signedIn.syncNeedsFactor}</p>}
        <div className="form-actions">
          <Link to={ROUTES.privacy} className="button button-secondary">{copy.signedIn.privacyAction}</Link>
          <button
            type="button"
            className="button button-secondary"
            disabled={pending}
            onClick={() => { void run(() => service.signOut()).then(onChanged); }}
          >
            {copy.signedIn.signOut}
          </button>
        </div>
        <FormError code={error} />
      </section>
      <TotpSection service={service} onChanged={onChanged} />
      <section className="account-section">
        <button type="button" className="text-button danger-text" disabled aria-describedby={`${titleId}-delete`}>
          {copy.signedIn.deleteAccount}
        </button>
        <p id={`${titleId}-delete`} className="field-hint">{copy.signedIn.deletePending}</p>
      </section>
    </>
  );
}
