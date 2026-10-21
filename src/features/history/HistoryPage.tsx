import { useCallback, useEffect, useId, useState } from 'react';
import { Link } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import { ROUTES, summaryPath } from '../../config/routes';
import { ConfirmButton } from '../../shared/ConfirmButton';
import { ArrowRightIcon } from '../../shared/icons';
import { useFormatters, useMessages } from '../../i18n/messages';
import { CloudSyncNotice } from '../cloud/CloudSyncNotice';
import { useCloudSync } from '../cloud/cloudSyncContext';
import type { SessionRecord } from '../records/sessionRecord';
import { useSessionStore } from '../records/sessionStoreContext';
import { storeErrorMessage } from '../records/storeErrorMessage';
import { useRecordFormatter } from '../records/useRecordFormatter';
import { PageHeading } from '../../shared/PageHeading';
import { groupByWeek, type HistoryWeek } from './historyWeeks';

type Loaded =
  | { readonly kind: 'loading' }
  // The cause is kept as is and translated when shown.
  | { readonly kind: 'error'; readonly cause: unknown }
  | { readonly kind: 'ready'; readonly records: readonly SessionRecord[] };

/**
 * Sessions saved on this device (RF-16, HU-10), with the way into how
 * they evolve. Everything here can be deleted without an account.
 */
export function HistoryPage(): React.JSX.Element {
  const t = useMessages();
  usePageTitle(t.history.title);
  const store = useSessionStore();
  const { revision, syncNow } = useCloudSync();
  const [loaded, setLoaded] = useState<Loaded>({ kind: 'loading' });

  const reload = useCallback((): Promise<void> => store.list().then(
    (records) => { setLoaded({ kind: 'ready', records }); },
    (error: unknown) => { setLoaded({ kind: 'error', cause: error }); },
  ), [store]);

  // Read again whenever a sync changed what this device holds.
  useEffect(() => { void reload(); }, [reload, revision]);
  // Opening the history is a good moment to catch up with other devices.
  useEffect(() => { void syncNow(); }, [syncNow]);

  // A deletion never waits for the cloud (HU-09): the line under the title says when one is still on its way.
  const afterDelete = (deleting: Promise<void>): void => {
    deleting.then(() => reload(), (error: unknown) => { setLoaded({ kind: 'error', cause: error }); });
  };
  const remove = (id: string): void => { afterDelete(store.delete(id)); };
  const removeAll = (): void => { afterDelete(store.clear()); };

  return (
    <div className="history-page">
      <PageHeading eyebrow={t.history.eyebrow} title={t.history.title}>
        <p>{t.history.introduction}</p>
        <CloudSyncNotice />
      </PageHeading>
      {loaded.kind === 'loading' && <p className="secondary-text">{t.history.loading}</p>}
      {loaded.kind === 'error' && (
        <p className="quiet-notice" role="alert">{t.records.readFailed(storeErrorMessage(loaded.cause, t))}</p>
      )}
      {loaded.kind === 'ready' && (loaded.records.length === 0 ? <EmptyHistory /> : (
        <>
          <ProgressInvite />
          {groupByWeek(loaded.records, new Date()).map((week) => (
            <HistoryWeekList key={week.key} week={week} onDelete={remove} />
          ))}
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

/** The evolution across sessions has its own screen (ADR-33); the history leads to it. */
function ProgressInvite(): React.JSX.Element {
  const { progress } = useMessages().history;
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="glass-card progress-invite">
      <div>
        <h2 id={titleId}>{progress.title}</h2>
        <p className="secondary-text">{progress.text}</p>
      </div>
      <Link to={ROUTES.progress} className="pill-button pill-button-primary">{progress.action} <ArrowRightIcon /></Link>
    </section>
  );
}

interface HistoryItemProps {
  readonly record: SessionRecord;
  readonly onDelete: (id: string) => void;
}

/** One week of sessions under its heading; each row opens the session's summary. */
function HistoryWeekList({ week, onDelete }: { readonly week: HistoryWeek; readonly onDelete: (id: string) => void }): React.JSX.Element {
  const t = useMessages();
  const formatters = useFormatters();
  const titleId = useId();
  const { weeks } = t.history;
  const title = week.label.kind === 'of' ? weeks.of(formatters.shortDate(week.label.start.toISOString())) : weeks[week.label.kind];
  return (
    <section aria-labelledby={titleId} className="history-week">
      <h2 id={titleId}>{title}</h2>
      <ol className="history-list">
        {week.records.map((record) => <HistoryItem key={record.id} record={record} onDelete={onDelete} />)}
      </ol>
    </section>
  );
}

function HistoryItem({ record, onDelete }: HistoryItemProps): React.JSX.Element {
  const t = useMessages();
  const format = useRecordFormatter();
  const formatters = useFormatters();
  const { item } = t.history;
  return (
    <li className="history-item">
      <Link to={summaryPath(record.id)} className="history-row">
        <span className="history-row-date">{formatters.dayTime(record.startedAt)}</span>
        <span className="history-row-detail">
          {item.listenedOf(format.listened(record.listenedSeconds), record.plannedMinutes)} · {format.goals(record.goals)}
        </span>
        <span className="history-row-feeling">
          {item.feeling} <strong>{format.ratings(record.ratingBefore, record.ratingAfter)}</strong>
        </span>
      </Link>
      <ConfirmButton label={item.delete} confirmLabel={item.confirmDelete} onConfirm={() => { onDelete(record.id); }} />
    </li>
  );
}
