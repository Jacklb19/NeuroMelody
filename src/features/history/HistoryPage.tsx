import { useCallback, useEffect, useId, useState } from 'react';
import { Link } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import { ROUTES, summaryPath } from '../../config/routes';
import { useMessages } from '../../i18n/messages';
import type { SessionRecord } from '../records/sessionRecord';
import { useSessionStore } from '../records/sessionStoreContext';
import { storeErrorMessage } from '../records/storeErrorMessage';
import { summarizeSession } from '../records/summarizeSession';
import { useRecordFormatter } from '../records/useRecordFormatter';
import { PageHeading } from '../../shared/PageHeading';
import { Sparkline } from '../../shared/Sparkline';

/** Sessions needed before a trend across them means anything. */
const MIN_SESSIONS_FOR_TREND = 2;

type Loaded =
  | { readonly kind: 'loading' }
  // The cause is kept as is and translated when shown.
  | { readonly kind: 'error'; readonly cause: unknown }
  | { readonly kind: 'ready'; readonly records: readonly SessionRecord[] };

/**
 * Sessions saved on this device and how their indicators evolve
 * (RF-16, HU-10). Everything here can be deleted without an account.
 */
export function HistoryPage(): React.JSX.Element {
  const t = useMessages();
  usePageTitle(t.history.title);
  const store = useSessionStore();
  const [loaded, setLoaded] = useState<Loaded>({ kind: 'loading' });

  const reload = useCallback((): Promise<void> => store.list().then(
    (records) => { setLoaded({ kind: 'ready', records }); },
    (error: unknown) => { setLoaded({ kind: 'error', cause: error }); },
  ), [store]);

  useEffect(() => { void reload(); }, [reload]);

  const remove = (id: string): void => {
    store.delete(id).then(reload, (error: unknown) => { setLoaded({ kind: 'error', cause: error }); });
  };
  const removeAll = (): void => {
    store.clear().then(reload, (error: unknown) => { setLoaded({ kind: 'error', cause: error }); });
  };

  return (
    <div className="history-page">
      <PageHeading eyebrow={t.history.eyebrow} title={t.history.title}>
        <p>{t.history.introduction}</p>
      </PageHeading>
      {loaded.kind === 'loading' && <p className="secondary-text">{t.history.loading}</p>}
      {loaded.kind === 'error' && (
        <p className="quiet-notice" role="alert">{t.records.readFailed(storeErrorMessage(loaded.cause, t))}</p>
      )}
      {loaded.kind === 'ready' && (loaded.records.length === 0 ? <EmptyHistory /> : (
        <>
          <Evolution records={loaded.records} />
          <ol className="history-list">
            {loaded.records.map((record) => (
              <HistoryItem key={record.id} record={record} onDelete={remove} />
            ))}
          </ol>
          <ConfirmButton
            label={t.history.clearAll}
            confirmLabel={t.history.confirmClearAll}
            onConfirm={removeAll}
          />
        </>
      ))}
    </div>
  );
}

function EmptyHistory(): React.JSX.Element {
  const t = useMessages();
  return (
    <div className="empty-state">
      <p>{t.history.empty}</p>
      <Link to={ROUTES.plan} className="button button-primary">{t.history.planSession}</Link>
    </div>
  );
}

/** Trend across sessions, oldest to newest, with the same data listed below as text. */
function Evolution({ records }: { readonly records: readonly SessionRecord[] }): React.JSX.Element | null {
  const { evolution } = useMessages().history;
  const titleId = useId();
  if (records.length < MIN_SESSIONS_FOR_TREND) return null;
  const chronological = [...records].reverse();
  const finalRmssd = chronological.map((record) => summarizeSession(record).rmssd?.end ?? null);
  const ratingsAfter = chronological.map((record) => record.ratingAfter);
  return (
    <section aria-labelledby={titleId} className="evolution">
      <h2 id={titleId}>{evolution.title}</h2>
      <div className="evolution-charts">
        <figure>
          <Sparkline values={finalRmssd} label={evolution.rmssdLabel} />
          <figcaption>{evolution.rmssdCaption}</figcaption>
        </figure>
        <figure>
          <Sparkline values={ratingsAfter} label={evolution.ratingLabel} />
          <figcaption>{evolution.ratingCaption}</figcaption>
        </figure>
      </div>
    </section>
  );
}

interface HistoryItemProps {
  readonly record: SessionRecord;
  readonly onDelete: (id: string) => void;
}

function HistoryItem({ record, onDelete }: HistoryItemProps): React.JSX.Element {
  const t = useMessages();
  const format = useRecordFormatter();
  const summary = summarizeSession(record);
  const titleId = useId();
  const { item } = t.history;
  return (
    <li className="history-item" aria-labelledby={titleId}>
      <div className="history-heading">
        <h3 id={titleId}>{format.sessionDate(record.startedAt)}</h3>
        <span className="secondary-text">{item.listenedOf(format.listened(record.listenedSeconds), record.plannedMinutes)}</span>
      </div>
      <dl className="history-figures">
        <div><dt>{t.records.ratingLabel}</dt><dd>{format.ratings(record.ratingBefore, record.ratingAfter)}</dd></div>
        <div><dt>{item.heartRate}</dt><dd>{format.change(summary.heartRate, t.common.units.beatsPerMinute)}</dd></div>
        <div><dt>{item.rmssd}</dt><dd>{format.change(summary.rmssd, t.common.units.milliseconds)}</dd></div>
      </dl>
      <div className="history-actions">
        <Link to={summaryPath(record.id)} className="button button-secondary">{item.viewSummary}</Link>
        <ConfirmButton label={item.delete} confirmLabel={item.confirmDelete} onConfirm={() => { onDelete(record.id); }} />
      </div>
    </li>
  );
}

interface ConfirmButtonProps {
  readonly label: string;
  readonly confirmLabel: string;
  readonly onConfirm: () => void;
}

/** Deletion asks once more in place, so a stray click never erases data. */
function ConfirmButton({ label, confirmLabel, onConfirm }: ConfirmButtonProps): React.JSX.Element {
  const t = useMessages();
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return <button type="button" className="text-button danger-text" onClick={() => { setAsking(true); }}>{label}</button>;
  }
  return (
    <span className="confirm-group" role="group" aria-label={label}>
      <button type="button" className="button button-danger" onClick={onConfirm}>{confirmLabel}</button>
      <button type="button" className="text-button" onClick={() => { setAsking(false); }}>{t.common.cancel}</button>
    </span>
  );
}
