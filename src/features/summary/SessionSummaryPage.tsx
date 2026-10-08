import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import { ROUTES } from '../../config/routes';
import { useMessages } from '../../i18n/messages';
import { useSessionStore } from '../records/sessionStoreContext';
import type { SessionRecord } from '../records/sessionRecord';
import { storeErrorMessage } from '../records/storeErrorMessage';
import { PageHeading } from '../../shared/PageHeading';
import { SessionSummaryView } from './SessionSummaryView';

type Loaded =
  | { readonly kind: 'loading' }
  | { readonly kind: 'missing' }
  // The cause is kept as is and translated when shown.
  | { readonly kind: 'error'; readonly cause: unknown }
  | { readonly kind: 'ready'; readonly record: SessionRecord };

/** Summary of one session at /summary/:id (RF-15, HU-08), read from the device. */
export function SessionSummaryPage(): React.JSX.Element {
  const t = useMessages();
  usePageTitle(t.summary.title);
  const { id = '' } = useParams();
  const store = useSessionStore();
  const [loaded, setLoaded] = useState<Loaded>({ kind: 'loading' });

  useEffect(() => {
    let current = true;
    store.get(id).then(
      (record) => { if (current) setLoaded(record === null ? { kind: 'missing' } : { kind: 'ready', record }); },
      (error: unknown) => {
        if (current) setLoaded({ kind: 'error', cause: error });
      },
    );
    return () => { current = false; };
  }, [id, store]);

  if (loaded.kind === 'ready') {
    return (
      <SessionSummaryView
        record={loaded.record}
        onRecordChange={(record) => { setLoaded({ kind: 'ready', record }); }}
      />
    );
  }
  return (
    <div className="reading-page">
      <PageHeading eyebrow={t.summary.title} title={loaded.kind === 'loading' ? t.summary.loading : t.summary.missing.title}>
        {loaded.kind === 'missing' && <p>{t.summary.missing.detail}</p>}
        {loaded.kind === 'error' && <p role="alert">{t.records.readFailed(storeErrorMessage(loaded.cause, t))}</p>}
      </PageHeading>
      {loaded.kind !== 'loading' && <Link to={ROUTES.history} className="button button-secondary">{t.summary.goToHistory}</Link>}
    </div>
  );
}
