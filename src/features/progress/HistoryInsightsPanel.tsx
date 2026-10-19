import { useId } from 'react';
import { useMessages } from '../../i18n/messages';
import { MIN_INSIGHT_SESSIONS, type HistoryInsights } from './historyInsights';
import { useInsightText } from './useInsightText';
import type { SessionRecord } from '../records/sessionRecord';
import type { ProgressRangeId } from './progressRangeCatalog';
import { AutomaticInsights } from './AutomaticInsights';

export function HistoryInsightsPanel({ insights, records, range }: { readonly insights: HistoryInsights; readonly records: readonly SessionRecord[]; readonly range: ProgressRangeId }): React.JSX.Element {
  const copy = useMessages().insights;
  const titleId = useId();
  const text = useInsightText();
  return (
    <section className="glass-card history-insights" aria-labelledby={titleId}>
      <h2 id={titleId}>{copy.title}</h2>
      <p className="secondary-text">{copy.intro}</p>
      {insights.observations.length === 0 ? <p>{copy.empty(MIN_INSIGHT_SESSIONS)}</p> : (
        <ul className="insight-observations">
          {insights.observations.map((comparison) => <li key={comparison.id}><h3>{text.scope(comparison)}</h3><p>{text.observation(comparison)}</p></li>)}
        </ul>
      )}
      <p className="secondary-text">{copy.days(insights.knownDays, insights.unknownDates)}</p>
      <p className="quiet-notice">{copy.caution}</p>
      <AutomaticInsights comparisons={insights.observations} records={records} range={range} />
      <details className="progress-data">
        <summary>{copy.methodTitle}</summary>
        <p>{copy.method(MIN_INSIGHT_SESSIONS)}</p>
        <div className="progress-table-scroll">
          <table>
            <caption>{copy.title}</caption>
            <thead><tr><th scope="col">{copy.scope}</th><th scope="col">{copy.option}</th><th scope="col">{copy.count}</th><th scope="col">{copy.median}</th></tr></thead>
            <tbody>{insights.comparisons.flatMap((comparison) => comparison.groups.map((group) => (
              <tr key={`${comparison.id}:${group.value}`}>
                <th scope="row">{text.scope(comparison)}</th><td>{text.option(comparison.dimension, group.value)}</td><td>{group.count}</td><td>{text.number(group.median)}</td>
              </tr>
            )))}</tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
