import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import { reportPath, ROUTES } from '../../config/routes';
import { useFormatters, useMessages } from '../../i18n/messages';
import { ArrowRightIcon } from '../../shared/icons';
import { PageHeading } from '../../shared/PageHeading';
import { measuredSessions } from '../records/retentionPolicy';
import { useRecordFormatter } from '../records/useRecordFormatter';
import { useSessionRecords } from '../records/useSessionRecords';
import { BeforeAfterChart } from './BeforeAfterChart';
import {
  axisOf,
  INSIGHT_DIRECTION,
  PROGRESS_METRIC_IDS,
  progressOf,
  selectRange,
  type Progress,
  type ProgressMetricId,
} from './progress';
import { DEFAULT_PROGRESS_RANGE, type ProgressRangeId } from './progressRangeCatalog';
import { RangePicker } from './RangePicker';
import { useProgressFormatter } from './useProgressFormatter';
import './progress.css';

/**
 * Evolution across the sessions saved on this device (ADR-33): the pulse,
 * the variability and the self-rating at the start and at the end of each
 * one. It describes the figures and concludes nothing from them.
 */
export function ProgressPage(): React.JSX.Element {
  const t = useMessages();
  const copy = t.progress;
  usePageTitle(copy.title);
  const stored = useSessionRecords();
  // Sessions made to try the app before they stopped being kept are nobody's pulse.
  const records = useMemo(() => (stored === null ? null : measuredSessions(stored)), [stored]);
  const [range, setRange] = useState<ProgressRangeId>(DEFAULT_PROGRESS_RANGE);
  const progress = useMemo(() => progressOf(selectRange(records ?? [], range)), [records, range]);

  return (
    <div className="progress-page">
      <PageHeading eyebrow={copy.eyebrow} title={copy.title}>
        <p>{copy.introduction}</p>
      </PageHeading>
      {records === null && <p className="secondary-text">{copy.loading}</p>}
      {records !== null && records.length === 0 && (
        <div className="empty-state">
          <p>{copy.empty}</p>
          <Link to={ROUTES.plan} className="button button-primary">{copy.planSession}</Link>
        </div>
      )}
      {records !== null && records.length > 0 && (
        <>
          <RangePicker value={range} onChange={setRange} />
          <Totals progress={progress} />
          {progress.sessions === 1 && <p className="progress-note">{copy.single}</p>}
          <div className="progress-cards">
            {PROGRESS_METRIC_IDS.map((metric) => <MetricCard key={metric} metric={metric} progress={progress} />)}
          </div>
          <DataTable progress={progress} />
          <ReportInvite range={range} />
          <p className="progress-notice">{copy.notice}</p>
        </>
      )}
    </div>
  );
}

function Totals({ progress }: { readonly progress: Progress }): React.JSX.Element {
  const { totals } = useMessages().progress;
  const format = useFormatters();
  return (
    <dl className="progress-totals">
      <div className="glass-card"><dt>{totals.sessions}</dt><dd>{format.integer(progress.sessions)}</dd></div>
      <div className="glass-card"><dt>{totals.minutes}</dt><dd>{format.integer(progress.minutes)}</dd></div>
      {progress.since !== null && (
        <div className="glass-card"><dt>{totals.since}</dt><dd>{format.shortDate(progress.since)}</dd></div>
      )}
    </dl>
  );
}

interface MetricCardProps {
  readonly metric: ProgressMetricId;
  readonly progress: Progress;
}

function MetricCard({ metric, progress }: MetricCardProps): React.JSX.Element {
  const copy = useMessages().progress;
  const format = useFormatters();
  const formatter = useProgressFormatter();
  const titleId = useId();
  const words = copy.metrics[metric];
  const tally = progress.tallies[metric];
  const axis = axisOf(metric, progress.points);

  return (
    <section className="glass-card progress-card" aria-labelledby={titleId}>
      <div className="progress-copy">
        <h2 id={titleId}>{words.title}</h2>
        <p className="secondary-text">{words.explanation}</p>
        <p className="progress-insight" data-testid={`insight-${metric}`}>
          {tally.compared === 0 ? copy.noComparison : words.insight(tally[INSIGHT_DIRECTION[metric]], tally.compared)}
        </p>
      </div>
      {axis === null ? <p className="progress-note">{copy.noData}</p> : (
        <BeforeAfterChart
          label={words.chartLabel}
          keyboardHint={copy.chart.keyboardHint}
          points={progress.points.map((point) => ({
            key: point.id,
            date: format.shortDate(point.startedAt),
            ...point.values[metric],
          }))}
          domain={axis}
          legend={copy.legend}
          formatValue={(value) => formatter.value(metric, value)}
          formatTick={(value) => format.integer(value)}
        />
      )}
    </section>
  );
}

/** The figures of the charts as text, for whoever prefers or needs to read them. */
function DataTable({ progress }: { readonly progress: Progress }): React.JSX.Element {
  const copy = useMessages().progress;
  const recordFormat = useRecordFormatter();
  const formatter = useProgressFormatter();

  return (
    <details className="progress-data">
      <summary>{copy.table.summary}</summary>
      <div className="progress-table-scroll">
        <table>
          <caption>{copy.table.caption}</caption>
          <thead>
            <tr>
              <th scope="col">{copy.table.session}</th>
              {PROGRESS_METRIC_IDS.map((metric) => <th key={metric} scope="col">{copy.metrics[metric].column}</th>)}
            </tr>
          </thead>
          <tbody>
            {progress.points.map((point) => (
              <tr key={point.id}>
                <th scope="row">{recordFormat.sessionDate(point.startedAt)}</th>
                {PROGRESS_METRIC_IDS.map((metric) => <td key={metric}>{formatter.change(metric, point.values[metric])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/** The same sessions as a sheet to print and share (ADR-33); it opens on the range chosen here. */
function ReportInvite({ range }: { readonly range: ProgressRangeId }): React.JSX.Element {
  const copy = useMessages().progress.report;
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="glass-card progress-invite report-invite">
      <div>
        <h2 id={titleId}>{copy.title}</h2>
        <p className="secondary-text">{copy.text}</p>
      </div>
      <Link to={reportPath(range)} className="pill-button pill-button-primary">{copy.action} <ArrowRightIcon /></Link>
    </section>
  );
}
