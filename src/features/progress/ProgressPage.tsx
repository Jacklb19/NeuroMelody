import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import { ROUTES } from '../../config/routes';
import { useFormatters, useMessages } from '../../i18n/messages';
import { PageHeading } from '../../shared/PageHeading';
import { useRecordFormatter } from '../records/useRecordFormatter';
import { useSessionRecords } from '../records/useSessionRecords';
import { BeforeAfterChart } from './BeforeAfterChart';
import {
  axisOf,
  INSIGHT_DIRECTION,
  METRIC_UNITS,
  PROGRESS_METRIC_IDS,
  progressOf,
  selectRange,
  type Pair,
  type Progress,
  type ProgressMetricId,
} from './progress';
import {
  DEFAULT_PROGRESS_RANGE,
  PROGRESS_RANGE_IDS,
  PROGRESS_RANGE_SIZES,
  type ProgressRangeId,
} from './progressRangeCatalog';
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
  const records = useSessionRecords();
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
          <div className="range-picker" role="group" aria-label={copy.range.label}>
            {PROGRESS_RANGE_IDS.map((id) => {
              const size = PROGRESS_RANGE_SIZES[id];
              return (
                <button
                  key={id}
                  type="button"
                  className="pill-button pill-button-ghost"
                  aria-pressed={id === range}
                  onClick={() => { setRange(id); }}
                >
                  {size === null ? copy.range.all : copy.range.last(size)}
                </button>
              );
            })}
          </div>
          <Totals progress={progress} />
          {progress.sessions === 1 && <p className="progress-note">{copy.single}</p>}
          <div className="progress-cards">
            {PROGRESS_METRIC_IDS.map((metric) => <MetricCard key={metric} metric={metric} progress={progress} />)}
          </div>
          <DataTable progress={progress} />
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

/** A value with the unit of its metric, as the readout of the chart shows it. */
function useValueFormatter(metric: ProgressMetricId): (value: number | null) => string {
  const { common } = useMessages();
  const format = useFormatters();
  const unit = METRIC_UNITS[metric];
  return (value) => {
    if (value === null) return common.noValue;
    const figure = format.integer(value);
    return unit === null ? figure : common.withUnit(figure, common.units[unit]);
  };
}

interface MetricCardProps {
  readonly metric: ProgressMetricId;
  readonly progress: Progress;
}

function MetricCard({ metric, progress }: MetricCardProps): React.JSX.Element {
  const copy = useMessages().progress;
  const format = useFormatters();
  const formatValue = useValueFormatter(metric);
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
          formatValue={formatValue}
          formatTick={(value) => format.integer(value)}
        />
      )}
    </section>
  );
}

/** The figures of the charts as text, for whoever prefers or needs to read them. */
function DataTable({ progress }: { readonly progress: Progress }): React.JSX.Element {
  const t = useMessages();
  const copy = t.progress;
  const format = useFormatters();
  const recordFormat = useRecordFormatter();

  const measured = (pair: Pair, metric: ProgressMetricId): string => {
    const unit = METRIC_UNITS[metric];
    if (unit === null) return recordFormat.ratings(pair.start, pair.end);
    if (pair.start === null || pair.end === null) return t.common.noValue;
    return t.common.withUnit(t.records.change(format.integer(pair.start), format.integer(pair.end)), t.common.units[unit]);
  };

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
                {PROGRESS_METRIC_IDS.map((metric) => <td key={metric}>{measured(point.values[metric], metric)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
