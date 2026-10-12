import { useId, useState } from 'react';
import { Link } from 'react-router';
import { ROUTES } from '../../config/routes';
import { useLocale, useMessages } from '../../i18n/messages';
import { CloudError, type CloudErrorCode } from '../cloud/cloudApi';
import { useCloudSync, type CloudSyncStatus } from '../cloud/cloudSyncContext';
import { narrativeStorage, readNarrative, writeNarrative } from './narrativeCache';

/** Sync statuses in which the session cannot be in the account, so its summary cannot be asked for. */
type BlockingStatus = 'unavailable' | 'signed_out' | 'needs_second_factor' | 'needs_consent';

/** Where each of them is solved; a deployment without an API has nowhere to go. */
const NEXT_STEP: Readonly<Record<BlockingStatus, string | null>> = {
  unavailable: null,
  signed_out: ROUTES.login,
  needs_second_factor: ROUTES.account,
  needs_consent: ROUTES.privacy,
};

const isBlocking = (status: CloudSyncStatus): status is BlockingStatus => status in NEXT_STEP;

type Request =
  | { readonly kind: 'idle' }
  | { readonly kind: 'working' }
  | { readonly kind: 'failed'; readonly code: CloudErrorCode };

/**
 * The session in a few plain sentences written by the language model
 * (RF-15, HU-08), always marked as generated automatically. It is written
 * only when the person asks, after reading what travels: aggregated figures
 * of the session stored in their account, never the signal. The text is
 * kept on the device, so it is asked for once.
 */
export function AutomaticSummary({ sessionId }: { readonly sessionId: string }): React.JSX.Element {
  const t = useMessages();
  const copy = t.summary.automatic;
  const locale = useLocale();
  const { status, api } = useCloudSync();
  const titleId = useId();
  // Written while this screen is open; what an earlier visit wrote is read from the device.
  const [written, setWritten] = useState<{ readonly sessionId: string; readonly locale: string; readonly text: string } | null>(null);
  const [request, setRequest] = useState<Request>({ kind: 'idle' });
  const text = written !== null && written.sessionId === sessionId && written.locale === locale
    ? written.text
    : readNarrative(narrativeStorage(), sessionId, locale);
  const errors: Readonly<Record<CloudErrorCode, string>> = t.cloud.errors;
  const actions: Readonly<Partial<Record<CloudSyncStatus, string>>> = t.cloud.actions;

  const ask = (): void => {
    if (api === null) return;
    setRequest({ kind: 'working' });
    api.summarizeSession(sessionId, locale).then(
      (narrative) => {
        writeNarrative(narrativeStorage(), sessionId, locale, narrative.text);
        setWritten({ sessionId, locale, text: narrative.text });
        setRequest({ kind: 'idle' });
      },
      (cause: unknown) => { setRequest({ kind: 'failed', code: cause instanceof CloudError ? cause.code : 'unknown' }); },
    );
  };

  const blocked = isBlocking(status) ? status : null;
  const nextStep = blocked === null ? null : NEXT_STEP[blocked];
  const canAsk = blocked === null && api !== null;

  return (
    <section className="summary-section automatic-summary" aria-labelledby={titleId}>
      <h2 id={titleId}>{copy.title}</h2>
      <div aria-live="polite">
        {text !== null && (
          <>
            <p className="narrative-text" data-testid="narrative-text">{text}</p>
            <p className="generated-mark">{copy.generatedMark}</p>
          </>
        )}
        {request.kind === 'working' && <p className="secondary-text">{copy.working}</p>}
        {request.kind === 'failed' && (
          <p className="quiet-notice">{request.code === 'not_found' ? copy.notInCloud : copy.failed(errors[request.code])}</p>
        )}
      </div>
      {blocked !== null && text === null && (
        <p className="pending-note">
          {copy.needs[blocked]}
          {nextStep !== null && <> <Link to={nextStep}>{actions[blocked]}</Link></>}
        </p>
      )}
      {canAsk && request.kind !== 'working' && (
        <>
          {text === null && <p className="pending-note">{copy.notice}</p>}
          <button type="button" className={text === null ? 'button button-primary' : 'text-button'} onClick={ask}>
            {text === null ? copy.ask : copy.askAgain}
          </button>
        </>
      )}
    </section>
  );
}
