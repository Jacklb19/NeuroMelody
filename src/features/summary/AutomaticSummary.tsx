import { useId, useState } from 'react';
import { Link } from 'react-router';
import { ROUTES } from '../../config/routes';
import { useLocale, useMessages } from '../../i18n/messages';
import { CloudError, type CloudErrorCode } from '../cloud/cloudApi';
import { useCloudSync } from '../cloud/cloudSyncContext';
import type { SessionRecord } from '../records/sessionRecord';
import { narrativeStorage, readNarrative, writeNarrative } from './narrativeCache';
import { narrativeFigures } from './narrativeFigures';

type Request =
  | { readonly kind: 'idle' }
  | { readonly kind: 'working' }
  | { readonly kind: 'failed'; readonly code: CloudErrorCode };

/**
 * The session in a few plain sentences written by the language model
 * (RF-15, HU-08), always marked as generated automatically. It is written
 * only when the person asks, after reading what travels: the aggregated
 * figures this screen already shows, never the signal. It needs an account
 * and nothing else: the session does not have to be in the cloud. The text
 * is kept on the device, so it is asked for once.
 */
export function AutomaticSummary({ record }: { readonly record: SessionRecord }): React.JSX.Element {
  const sessionId = record.id;
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

  const ask = (): void => {
    if (api === null) return;
    setRequest({ kind: 'working' });
    api.summarizeSession(sessionId, locale, narrativeFigures(record)).then(
      (narrative) => {
        writeNarrative(narrativeStorage(), sessionId, locale, narrative.text);
        setWritten({ sessionId, locale, text: narrative.text });
        setRequest({ kind: 'idle' });
      },
      (cause: unknown) => { setRequest({ kind: 'failed', code: cause instanceof CloudError ? cause.code : 'unknown' }); },
    );
  };

  const canAsk = api !== null;

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
        {request.kind === 'failed' && <p className="quiet-notice">{copy.failed(errors[request.code])}</p>}
      </div>
      {!canAsk && text === null && (
        <p className="pending-note">
          {status === 'unavailable' ? copy.unavailable : <>{copy.needsAccount} <Link to={ROUTES.login}>{t.cloud.actions.signed_out}</Link></>}
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
