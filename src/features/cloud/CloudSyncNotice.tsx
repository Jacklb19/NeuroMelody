import { Link } from 'react-router';
import { ROUTES } from '../../config/routes';
import { useMessages } from '../../i18n/messages';
import type { CloudErrorCode } from './cloudApi';
import { useCloudSync, type CloudSyncStatus } from './cloudSyncContext';

/** Where each reason for not syncing is solved; the others need no link. */
const NEXT_STEP: Readonly<Partial<Record<CloudSyncStatus, string>>> = {
  signed_out: ROUTES.login,
  needs_second_factor: ROUTES.account,
  needs_consent: ROUTES.privacy,
};

/**
 * Says where the sessions live right now: on this device alone, and what
 * is missing to have them in the cloud too, or in step with the account.
 */
export function CloudSyncNotice(): React.JSX.Element {
  const copy = useMessages().cloud;
  const { status, error, syncNow } = useCloudSync();
  const statuses: Readonly<Record<Exclude<CloudSyncStatus, 'failed'>, string>> = copy.status;
  const errors: Readonly<Record<CloudErrorCode, string>> = copy.errors;
  const nextStep = NEXT_STEP[status];
  const actions: Readonly<Partial<Record<CloudSyncStatus, string>>> = copy.actions;

  return (
    <p className="cloud-notice" role="status" data-status={status}>
      {status === 'failed' ? copy.failed(errors[error ?? 'unknown']) : statuses[status]}
      {nextStep !== undefined && <> <Link to={nextStep}>{actions[status]}</Link></>}
      {status === 'failed' && (
        <> <button type="button" className="text-button" onClick={() => { void syncNow(); }}>{copy.retry}</button></>
      )}
    </p>
  );
}
