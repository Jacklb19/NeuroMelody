import { useId, useState } from 'react';
import { Link } from 'react-router';
import { ROUTES } from '../../config/routes';
import { useMessages, type Messages } from '../../i18n/messages';
import { CSV_MIME_TYPE, csvFileName, sessionToCsv } from '../records/exportCsv';
import { SelfRatingField } from '../records/SelfRatingField';
import type { SessionRecord } from '../records/sessionRecord';
import { useSessionStore } from '../records/sessionStoreContext';
import { storeErrorMessage } from '../records/storeErrorMessage';
import { EDGE_SECONDS, summarizeSession } from '../records/summarizeSession';
import { useRecordFormatter } from '../records/useRecordFormatter';
import { downloadText } from '../../shared/downloadText';
import { PageHeading } from '../../shared/PageHeading';
import { Sparkline } from '../../shared/Sparkline';
import { StateTimeShare } from './StateTimeShare';

interface SessionSummaryViewProps {
  readonly record: SessionRecord;
  readonly onRecordChange: (record: SessionRecord) => void;
}

function describeRatingChange(change: number | null, t: Messages): string | null {
  if (change === null) return null;
  if (change === 0) return t.summary.ratingChange.same;
  return change > 0 ? t.summary.ratingChange.more(change) : t.summary.ratingChange.less(-change);
}

/** Indicators of one finished session, its self-ratings and the CSV download. */
export function SessionSummaryView({ record, onRecordChange }: SessionSummaryViewProps): React.JSX.Element {
  const t = useMessages();
  const format = useRecordFormatter();
  const summary = summarizeSession(record);
  const ratingChange = describeRatingChange(summary.ratingChange, t);
  const figuresId = useId();
  const trendValues = record.samples.map((sample) => (sample.goodQuality ? sample.rmssd : null));
  const { figures, pending } = t.summary;

  return (
    <div className="summary-page">
      <PageHeading eyebrow={t.summary.title} title={format.sessionDate(record.startedAt)}>
        <p>{t.summary.listenedOf(format.listened(record.listenedSeconds), record.plannedMinutes)}</p>
      </PageHeading>

      {record.ratingAfter === null && <AfterRating record={record} onSaved={onRecordChange} />}

      <section aria-labelledby={figuresId} className="summary-section">
        <h2 id={figuresId}>{figures.title}</h2>
        <dl className="summary-figures">
          <div>
            <dt>{t.records.ratingLabel}</dt>
            <dd>{format.ratings(record.ratingBefore, record.ratingAfter)}</dd>
            {ratingChange !== null && <dd className="figure-note">{ratingChange}</dd>}
          </div>
          <div>
            <dt>{figures.heartRate}</dt>
            <dd data-testid="summary-heart-rate">{format.change(summary.heartRate, t.common.units.beatsPerMinute)}</dd>
          </div>
          <div>
            <dt>{figures.rmssd}</dt>
            <dd>{format.change(summary.rmssd, t.common.units.milliseconds)}</dd>
            <dd className="figure-trend">
              <Sparkline values={trendValues} label={figures.rmssdTrend} />
            </dd>
          </div>
          <div>
            <dt>{figures.lfHfAtEnd}</dt>
            <dd>{format.ratio(summary.lfHfAtEnd)}</dd>
          </div>
        </dl>
        <p className="panel-footnote">{figures.footnote(EDGE_SECONDS)}</p>
      </section>

      <StateTimeShare secondsByState={summary.secondsByState} />

      <section className="summary-section" aria-label={pending.label}>
        <p className="pending-note">
          <strong>{pending.title}</strong> {pending.detail}
        </p>
      </section>

      <div className="action-row summary-actions">
        <button
          type="button"
          className="button button-primary"
          onClick={() => { downloadText(csvFileName(record, t), sessionToCsv(record, t), CSV_MIME_TYPE); }}
        >
          {t.summary.download}
        </button>
        <Link to={ROUTES.history} className="button button-secondary">{t.summary.viewHistory}</Link>
        <Link to={ROUTES.plan} className="button button-secondary">{t.summary.planAnother}</Link>
      </div>
    </div>
  );
}

interface AfterRatingProps {
  readonly record: SessionRecord;
  readonly onSaved: (record: SessionRecord) => void;
}

/** Asks how the person feels after listening; skipping it is always fine. */
function AfterRating({ record, onSaved }: AfterRatingProps): React.JSX.Element {
  const t = useMessages();
  const store = useSessionStore();
  const [rating, setRating] = useState<number | null>(null);
  // The cause is kept as is and translated when shown.
  const [failure, setFailure] = useState<{ readonly cause: unknown } | null>(null);
  const { afterRating } = t.summary;

  const save = (): void => {
    store.setRatingAfter(record.id, rating).then(onSaved, (cause: unknown) => {
      setFailure({ cause });
    });
  };

  return (
    <section className="after-rating" aria-label={afterRating.label}>
      <SelfRatingField legend={afterRating.legend} value={rating} onChange={setRating} />
      <button type="button" className="button button-primary" disabled={rating === null} onClick={save}>
        {afterRating.save}
      </button>
      {failure !== null && (
        <p className="quiet-notice" role="alert">{afterRating.saveFailed(storeErrorMessage(failure.cause, t))}</p>
      )}
    </section>
  );
}
