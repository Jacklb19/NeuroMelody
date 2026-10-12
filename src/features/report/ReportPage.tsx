import { useId, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { usePreferences } from '../../app/preferences/preferencesContext';
import { usePageTitle } from '../../app/usePageTitle';
import { APP_NAME } from '../../config/app';
import { QUERY_PARAMS, ROUTES } from '../../config/routes';
import { useFormatters, useMessages } from '../../i18n/messages';
import { BrandMark } from '../../shared/BrandMark';
import { PageHeading } from '../../shared/PageHeading';
import { parseOption } from '../../shared/parseOption';
import { BeforeAfterChart } from '../progress/BeforeAfterChart';
import { axisOf, INSIGHT_DIRECTION, PROGRESS_METRIC_IDS, selectRange, type ProgressMetricId } from '../progress/progress';
import { DEFAULT_PROGRESS_RANGE, PROGRESS_RANGE_IDS, type ProgressRangeId } from '../progress/progressRangeCatalog';
import { RangePicker } from '../progress/RangePicker';
import { useProgressFormatter } from '../progress/useProgressFormatter';
import { MAX_RATING, MIN_RATING } from '../records/sessionRecord';
import { EDGE_SECONDS } from '../records/summarizeSession';
import { useRecordFormatter } from '../records/useRecordFormatter';
import { useSessionRecords } from '../records/useSessionRecords';
import { measuredSessions } from '../records/retentionPolicy';
import { AVERAGE_DECIMALS, reportOf, type Report } from './report';
import './report.css';

/**
 * Printable summary of a range of sessions (ADR-33), for the person to take
 * to whoever accompanies them. It is made with the browser's own printing:
 * the sheet below is what gets printed, and everything around it is left out.
 * It only reads the sessions saved on this device and sends nothing anywhere.
 */
export function ReportPage(): React.JSX.Element {
  const t = useMessages();
  const copy = t.report;
  usePageTitle(copy.pageTitle);
  const records = useSessionRecords();
  const [params, setParams] = useSearchParams();
  // The range travels in the address, so the sheet survives a reload and opens as "Tu progreso" left it.
  const range = parseOption(PROGRESS_RANGE_IDS, params.get(QUERY_PARAMS.range), DEFAULT_PROGRESS_RANGE);
  const setRange = (next: ProgressRangeId): void => {
    setParams({ [QUERY_PARAMS.range]: next }, { replace: true });
  };
  // Sessions made to try the app (simulator, sample recordings) are nobody's pulse: they never reach the sheet.
  const measured = useMemo(() => (records === null ? null : measuredSessions(records)), [records]);
  const report = useMemo(() => reportOf(selectRange(measured ?? [], range)), [measured, range]);
  const excluded = records === null || measured === null ? 0 : records.length - measured.length;

  return (
    <div className="report-page">
      <div className="screen-only">
        <PageHeading eyebrow={copy.eyebrow} title={copy.pageTitle}>
          <p>{copy.introduction}</p>
        </PageHeading>
        {records === null && <p className="secondary-text">{t.progress.loading}</p>}
        {measured !== null && measured.length === 0 && (
          <div className="empty-state">
            <p>{excluded === 0 ? copy.empty : copy.onlyTrials}</p>
            <Link to={ROUTES.plan} className="button button-primary">{t.progress.planSession}</Link>
          </div>
        )}
        {measured !== null && measured.length > 0 && (
          <div className="report-controls">
            <RangePicker value={range} onChange={setRange} />
            <div className="report-print">
              <button type="button" className="pill-button pill-button-primary pill-button-large" onClick={() => { window.print(); }}>
                {copy.print}
              </button>
              <p className="secondary-text">{copy.printHint}</p>
            </div>
          </div>
        )}
        {measured !== null && measured.length > 0 && excluded > 0 && (
          <p className="secondary-text report-excluded" data-testid="report-excluded">{copy.excluded(excluded)}</p>
        )}
      </div>
      {measured !== null && measured.length > 0 && <ReportSheet report={report} />}
    </div>
  );
}

/** The printed page. It always reads on the ivory palette, whatever the theme of the app. */
function ReportSheet({ report }: { readonly report: Report }): React.JSX.Element {
  const t = useMessages();
  const copy = t.report;
  const format = useFormatters();
  const recordFormat = useRecordFormatter();
  const formatter = useProgressFormatter();
  // `.paper` is the ivory palette only on the dark theme; on the light one the page already has it.
  const { theme } = usePreferences();
  const titleId = useId();
  const { progress } = report;
  // Read once per sheet: the date it was prepared belongs to the printed page.
  const preparedOn = useMemo(() => new Date().toISOString(), []);

  return (
    <article className={theme === 'dark' ? 'report-sheet paper' : 'report-sheet'} aria-labelledby={titleId}>
      <header className="report-header">
        <p className="report-brand"><BrandMark /> {APP_NAME}</p>
        <p className="report-prepared">{copy.preparedOn(format.longDate(preparedOn))}</p>
        <h2 id={titleId}>{copy.sheetTitle}</h2>
        {progress.since !== null && report.until !== null && (
          <p className="report-period">{copy.period(format.longDate(progress.since), format.longDate(report.until))}</p>
        )}
      </header>

      <dl className="report-totals">
        <div><dt>{t.progress.totals.sessions}</dt><dd>{format.integer(progress.sessions)}</dd></div>
        <div><dt>{t.progress.totals.minutes}</dt><dd>{format.integer(progress.minutes)}</dd></div>
        <div>
          <dt>{copy.goals.label}</dt>
          <dd className="report-goals">
            {report.goals.length === 0 ? copy.goals.none : (
              <ul>
                {report.goals.map((goal) => (
                  <li key={goal.id}>{copy.goals.count(t.plan.goals.names[goal.id], goal.sessions)}</li>
                ))}
              </ul>
            )}
          </dd>
        </div>
      </dl>

      {PROGRESS_METRIC_IDS.map((metric) => <MetricSection key={metric} metric={metric} report={report} />)}

      <section className="report-section">
        <h3>{copy.table.title}</h3>
        <div className="report-table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">{copy.table.date}</th>
                <th scope="col">{copy.table.listened}</th>
                <th scope="col">{copy.table.source}</th>
                {PROGRESS_METRIC_IDS.map((metric) => <th key={metric} scope="col">{copy.metrics[metric].title}</th>)}
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row) => (
                <tr key={row.id}>
                  <th scope="row">{recordFormat.sessionDate(row.startedAt)}</th>
                  <td>{recordFormat.listened(row.listenedSeconds)}</td>
                  <td>{row.sourceKind === null ? t.common.noValue : t.acquisition.sources[row.sourceKind]}</td>
                  {PROGRESS_METRIC_IDS.map((metric) => <td key={metric}>{formatter.change(metric, row.values[metric])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="report-notes">
        <h3>{copy.notes.title}</h3>
        <ul>
          <li>{copy.notes.whatItIs(APP_NAME)}</li>
          <li>{t.common.nonClinicalIndicators}</li>
          <li>{copy.notes.edges(EDGE_SECONDS)}</li>
        </ul>
      </footer>
    </article>
  );
}

interface MetricSectionProps {
  readonly metric: ProgressMetricId;
  readonly report: Report;
}

function MetricSection({ metric, report }: MetricSectionProps): React.JSX.Element {
  const t = useMessages();
  const copy = t.report;
  const format = useFormatters();
  const formatter = useProgressFormatter();
  const words = copy.metrics[metric];
  const { progress, averages } = report;
  const tally = progress.tallies[metric];
  const axis = axisOf(metric, progress.points);
  const average = averages[metric];
  const decimals = AVERAGE_DECIMALS[metric];

  return (
    <section className="report-section report-metric">
      <div>
        <h3>{words.title}</h3>
        <p className="report-explanation">{words.explanation(MIN_RATING, MAX_RATING)}</p>
        {tally.compared === 0 ? <p>{t.progress.noComparison}</p> : (
          <>
            <dl className="report-averages">
              <div><dt>{copy.averages.start}</dt><dd>{formatter.value(metric, average.start, decimals)}</dd></div>
              <div><dt>{copy.averages.end}</dt><dd>{formatter.value(metric, average.end, decimals)}</dd></div>
            </dl>
            <p data-testid={`report-insight-${metric}`}>{words.insight(tally[INSIGHT_DIRECTION[metric]], tally.compared)}</p>
          </>
        )}
      </div>
      {axis !== null && (
        <BeforeAfterChart
          label={t.progress.metrics[metric].chartLabel}
          keyboardHint={t.progress.chart.keyboardHint}
          points={progress.points.map((point) => ({
            key: point.id,
            date: format.shortDate(point.startedAt),
            ...point.values[metric],
          }))}
          domain={axis}
          legend={t.progress.legend}
          formatValue={(value) => formatter.value(metric, value)}
          formatTick={(value) => format.integer(value)}
        />
      )}
    </section>
  );
}
