import { useId, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { PreferencePickers } from '../../app/preferences/PreferenceControls';
import { ReminderCard } from '../reminders/ReminderCard';
import { usePageTitle } from '../../app/usePageTitle';
import { ROUTES, summaryPath } from '../../config/routes';
import { AccessLink } from './AccessLink';
import { useMessages } from '../../i18n/messages';
import { ConfirmButton } from '../../shared/ConfirmButton';
import { ChevronRightIcon, HeartIcon, HistoryIcon, KeyIcon, LogOutIcon, ShieldIcon, UserIcon } from '../../shared/icons';
import { CloudError, type CloudErrorCode } from '../cloud/cloudApi';
import { useCloudSync } from '../cloud/cloudSyncContext';
import { useRecordFormatter } from '../records/useRecordFormatter';
import { sessionTotals, useSessionRecords } from '../records/useSessionRecords';
import { needsSecondFactor, useAuth } from './authContext';
import { PasswordField } from './AuthFields';
import type { AuthService, AuthUser } from './authService';
import { FormError } from './FormError';
import { SecondFactorChallenge } from './SecondFactorChallenge';
import { TotpSection } from './TotpSection';
import { useAccountAction } from './useAccountAction';
import { useFieldErrorText } from './useFieldErrorText';
import { validateNewPassword, type AuthFieldError } from './validateAuth';
import './account.css';

/**
 * Profile (RF-14, ADR-30): who is listening, their activity on this device
 * and their settings. It works without an account, where it offers to
 * create one; signing in and registering have their own screens.
 */
export function AccountPage(): React.JSX.Element {
  const t = useMessages();
  const copy = t.account.profile;
  usePageTitle(copy.pageTitle);
  const { state, service, refresh } = useAuth();

  if (state.kind === 'recovery') return <Navigate to={ROUTES.resetPassword} replace />;
  if (state.kind === 'loading') return <p role="status" className="profile-page">{copy.loading}</p>;

  if (state.kind === 'signed_in' && service !== null && needsSecondFactor(state.assurance)) {
    return (
      <div className="profile-page profile-challenge">
        <h1>{t.account.totp.challengeTitle}</h1>
        <p className="secondary-text">{t.account.totp.challengeText}</p>
        <SecondFactorChallenge service={service} onVerified={refresh} onSignedOut={refresh} />
      </div>
    );
  }

  const user = state.kind === 'signed_in' ? state.user : null;
  return (
    <div className="profile-page">
      <ProfileHeader user={user} />
      <ActivitySummary />
      {user !== null && service !== null && state.kind === 'signed_in' && (
        <SecuritySection service={service} hasPassword={state.user.hasPassword !== false} secondFactorOn={state.assurance.current === 'aal2'} onChanged={refresh} />
      )}
      <PreferencesSection />
      {user !== null && service !== null && <SessionSection service={service} onChanged={refresh} />}
    </div>
  );
}

function ProfileHeader({ user }: { readonly user: AuthUser | null }): React.JSX.Element {
  const copy = useMessages().account.profile;
  const name = user === null ? copy.guestName : user.name ?? user.email;
  return (
    <header className="profile-header glass-card paper">
      <span className="avatar avatar-large" aria-hidden="true">
        {user === null ? <UserIcon /> : name.charAt(0).toUpperCase()}
      </span>
      <div className="profile-identity">
        <p className="eyebrow">{user === null ? copy.eyebrow : copy.accountLabel}</p>
        <h1>{name}</h1>
        {user === null ? <p className="secondary-text">{copy.guestText}</p> : user.name !== null && <p className="secondary-text">{user.email}</p>}
      </div>
      {user === null && (
        <div className="profile-guest-actions">
          <AccessLink to={ROUTES.register} className="pill-button pill-button-primary">{copy.createAccount}</AccessLink>
          <AccessLink to={ROUTES.login} className="pill-button pill-button-ghost">{copy.signIn}</AccessLink>
        </div>
      )}
    </header>
  );
}

/** Sessions, minutes and the last session, from what this device stores. */
function ActivitySummary(): React.JSX.Element {
  const copy = useMessages().account.profile.stats;
  const format = useRecordFormatter();
  const records = useSessionRecords();
  const totals = sessionTotals(records ?? []);
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="profile-section">
      <h2 id={titleId}>{copy.title}</h2>
      <dl className="stat-grid">
        <div className="glass-card"><dt>{copy.sessions}</dt><dd>{totals.count}</dd></div>
        <div className="glass-card"><dt>{copy.minutes}</dt><dd>{totals.minutes}</dd></div>
        <div className="glass-card">
          <dt>{copy.lastSession}</dt>
          <dd className="stat-text">
            {totals.last === null ? copy.none : <Link to={summaryPath(totals.last.id)}>{format.sessionDate(totals.last.startedAt)}</Link>}
          </dd>
        </div>
      </dl>
    </section>
  );
}

interface SettingRowProps {
  readonly icon: React.ReactNode;
  readonly title: string;
  readonly text: string;
  /** What sits at the end of the row: a button, a link arrow or a status. */
  readonly children?: React.ReactNode;
}

function SettingRow({ icon, title, text, children }: SettingRowProps): React.JSX.Element {
  return (
    <div className="setting-row">
      <span className="icon-badge">{icon}</span>
      <div className="setting-text">
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
      {children}
    </div>
  );
}

function LinkRow({ to, ...row }: SettingRowProps & { readonly to: string }): React.JSX.Element {
  return (
    <Link to={to} className="setting-link">
      <SettingRow {...row}><ChevronRightIcon /></SettingRow>
    </Link>
  );
}

interface SecuritySectionProps {
  readonly service: AuthService;
  /** Whether there is a current password to ask for before setting a new one. */
  readonly hasPassword: boolean;
  readonly secondFactorOn: boolean;
  readonly onChanged: () => Promise<void>;
}

type SecurityPanel = 'password' | 'secondFactor' | null;

function SecuritySection({ service, hasPassword, secondFactorOn, onChanged }: SecuritySectionProps): React.JSX.Element {
  const copy = useMessages().account.profile;
  const [open, setOpen] = useState<SecurityPanel>(null);
  const titleId = useId();
  const toggle = (panel: SecurityPanel): void => { setOpen((current) => (current === panel ? null : panel)); };
  const actionLabel = (panel: SecurityPanel, label: string): string => (open === panel ? copy.close : label);

  return (
    <section aria-labelledby={titleId} className="profile-section">
      <h2 id={titleId}>{copy.sections.security}</h2>
      <div className="setting-list glass-card">
        <SettingRow icon={<KeyIcon />} title={copy.rows.password.title} text={copy.rows.password.text}>
          <button type="button" className="pill-button pill-button-ghost" aria-expanded={open === 'password'} onClick={() => { toggle('password'); }}>
            {actionLabel('password', copy.rows.password.action)}
          </button>
        </SettingRow>
        {open === 'password' && <ChangePasswordForm service={service} askCurrent={hasPassword} />}
        <SettingRow
          icon={<ShieldIcon />}
          title={copy.rows.secondFactor.title}
          text={secondFactorOn ? copy.rows.secondFactor.on : copy.rows.secondFactor.off}
        >
          <button type="button" className="pill-button pill-button-ghost" aria-expanded={open === 'secondFactor'} onClick={() => { toggle('secondFactor'); }}>
            {actionLabel('secondFactor', copy.rows.secondFactor.action)}
          </button>
        </SettingRow>
        {open === 'secondFactor' && <div className="setting-panel"><TotpSection service={service} onChanged={onChanged} /></div>}
      </div>
    </section>
  );
}

/** New password from the profile; the current one is asked first, when the account has one (ADR-56). */
function ChangePasswordForm({ service, askCurrent }: { readonly service: AuthService; readonly askCurrent: boolean }): React.JSX.Element {
  const t = useMessages();
  const auth = t.account.auth;
  const fieldText = useFieldErrorText();
  const [current, setCurrent] = useState('');
  const [currentError, setCurrentError] = useState<AuthFieldError | null>(null);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [fieldError, setFieldError] = useState<AuthFieldError | null>(null);
  const [saved, setSaved] = useState(false);
  const { pending, error, run } = useAccountAction();

  const submit = async (event: React.SyntheticEvent): Promise<void> => {
    event.preventDefault();
    const missingCurrent = askCurrent && current === '' ? 'password_required' : null;
    const invalid = validateNewPassword(password, confirmation);
    setCurrentError(missingCurrent);
    setFieldError(invalid);
    if (missingCurrent !== null || invalid !== null) return;
    if (await run(() => service.updatePassword(password, askCurrent ? current : undefined))) {
      setSaved(true);
      setCurrent('');
      setPassword('');
      setConfirmation('');
    }
  };

  const mismatch = fieldError === 'passwords_differ';
  return (
    <form className="auth-form setting-panel" aria-label={t.account.profile.rows.password.title} onSubmit={(event) => { void submit(event); }} noValidate>
      {askCurrent && (
        <PasswordField label={auth.currentPassword} value={current} onChange={setCurrent} autoComplete="current-password" error={fieldText(currentError)} />
      )}
      <PasswordField label={auth.newPassword} value={password} onChange={setPassword} autoComplete="new-password" requirements error={mismatch ? null : fieldText(fieldError)} />
      <PasswordField label={auth.confirmPassword} value={confirmation} onChange={setConfirmation} autoComplete="new-password" error={mismatch ? fieldText(fieldError) : null} />
      <FormError code={error} />
      {saved && <p role="status" className="account-notice">{t.account.profile.passwordChanged}</p>}
      <button type="submit" className="pill-button pill-button-primary" disabled={pending}>
        {pending ? auth.working : t.account.reset.submit}
      </button>
    </form>
  );
}

function PreferencesSection(): React.JSX.Element {
  const copy = useMessages().account.profile;
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="profile-section">
      <h2>{copy.sections.appearance}</h2>
      <div className="setting-list glass-card appearance-card"><PreferencePickers /></div>
      <h2>{copy.sections.reminder}</h2>
      <ReminderCard />
      <h2 id={titleId}>{copy.sections.preferences}</h2>
      <div className="setting-list glass-card">
        <LinkRow to={ROUTES.privacy} icon={<ShieldIcon />} title={copy.rows.privacy.title} text={copy.rows.privacy.text} />
        <LinkRow to={ROUTES.history} icon={<HistoryIcon />} title={copy.rows.history.title} text={copy.rows.history.text} />
        <LinkRow to={ROUTES.collect} icon={<HeartIcon />} title={copy.rows.collect.title} text={copy.rows.collect.text} />
      </div>
    </section>
  );
}

function SessionSection({ service, onChanged }: { readonly service: AuthService; readonly onChanged: () => Promise<void> }): React.JSX.Element {
  const copy = useMessages().account.profile;
  const { pending, error, run } = useAccountAction();
  const { status, forgetDeviceCopies } = useCloudSync();
  const [forget, setForget] = useState(false);
  const titleId = useId();
  const forgetId = useId();
  // Only while syncing is on does the cloud keep the copies that make removing them here safe.
  const canForget = status === 'synced' || status === 'syncing' || status === 'failed';
  const signOut = (): void => {
    void run(async () => {
      if (canForget && forget) await forgetDeviceCopies();
      await service.signOut();
    }).then(onChanged);
  };
  return (
    <section aria-labelledby={titleId} className="profile-section">
      <h2 id={titleId}>{copy.sections.session}</h2>
      <div className="setting-list glass-card">
        <SettingRow icon={<LogOutIcon />} title={copy.rows.signOut.title} text={copy.rows.signOut.text}>
          <button type="button" className="pill-button pill-button-ghost" disabled={pending} onClick={signOut}>
            {copy.rows.signOut.title}
          </button>
        </SettingRow>
        {canForget && (
          <div className="confirmation-control sign-out-forget">
            <input id={forgetId} type="checkbox" checked={forget} onChange={(event) => { setForget(event.target.checked); }} />
            <label htmlFor={forgetId}>{copy.rows.signOut.forget}</label>
          </div>
        )}
        <FormError code={error} />
        <DeleteAccountRow service={service} onChanged={onChanged} />
      </div>
    </section>
  );
}

/**
 * Deletes the account and everything it keeps in the cloud (ADR-18), after
 * asking once more. What this device stores is left alone: it never needed
 * an account.
 */
function DeleteAccountRow({ service, onChanged }: { readonly service: AuthService; readonly onChanged: () => Promise<void> }): React.JSX.Element {
  const t = useMessages();
  const copy = t.account.profile.rows.deleteAccount;
  const { api } = useCloudSync();
  const [failure, setFailure] = useState<CloudErrorCode | null>(null);
  const reasons: Readonly<Record<CloudErrorCode, string>> = t.cloud.errors;

  const deleteAccount = (): void => {
    if (api === null) return;
    setFailure(null);
    api.deleteAccount()
      // The account is gone, so its session on this device is closed; a refusal to sign out changes nothing.
      .then(() => service.signOut().catch(() => undefined))
      .then(onChanged, (cause: unknown) => { setFailure(cause instanceof CloudError ? cause.code : 'unknown'); });
  };

  return (
    <>
      <SettingRow icon={<UserIcon />} title={copy.title} text={api === null ? copy.unavailable : copy.text}>
        {api !== null && <ConfirmButton label={copy.action} confirmLabel={copy.confirm} onConfirm={deleteAccount} />}
      </SettingRow>
      {failure !== null && <p role="alert" className="form-error">{copy.failed(reasons[failure])}</p>}
    </>
  );
}
