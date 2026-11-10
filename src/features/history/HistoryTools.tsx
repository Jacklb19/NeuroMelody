import { useId } from 'react';
import { useMessages } from '../../i18n/messages';
import { SOURCE_KIND_IDS } from '../acquisition/sourceCatalog';
import { GOAL_IDS } from '../plan/goalCatalog';
import { measuredSessions } from '../records/retentionPolicy';
import type { SessionRecord } from '../records/sessionRecord';
import { useRecordFormatter } from '../records/useRecordFormatter';
import { EMPTY_FILTERS, type HistoryFilters } from './historyFilters';
import { weekStart } from './historyWeeks';

interface HistoryFilterPanelProps {
  readonly value: HistoryFilters;
  readonly onChange: (filters: HistoryFilters) => void;
}

export function HistoryFilterPanel({ value, onChange }: HistoryFilterPanelProps): React.JSX.Element {
  const t = useMessages();
  const copy = t.listeningTools;
  return (
    <fieldset className="glass-card listening-tools">
      <legend>{copy.filters}</legend>
      <div className="tool-grid">
        <label>{copy.from}<input type="date" className="tool-input" value={value.from} onChange={(event) => { onChange({ ...value, from: event.target.value }); }} /></label>
        <label>{copy.to}<input type="date" className="tool-input" value={value.to} onChange={(event) => { onChange({ ...value, to: event.target.value }); }} /></label>
        <label>{copy.goal}
          <select className="tool-input" value={value.goal} onChange={(event) => { onChange({ ...value, goal: event.target.value }); }}>
            <option value="">{copy.all}</option>
            {GOAL_IDS.map((goal) => <option key={goal} value={goal}>{t.plan.goals.names[goal]}</option>)}
          </select>
        </label>
        <label>{copy.source}
          <select className="tool-input" value={value.source} onChange={(event) => { onChange({ ...value, source: event.target.value }); }}>
            <option value="">{copy.all}</option>
            <option value="none">{copy.noSensor}</option>
            {SOURCE_KIND_IDS.map((source) => <option key={source} value={source}>{t.acquisition.sources[source]}</option>)}
          </select>
        </label>
      </div>
      <div className="action-row">
        <label className="confirmation-control"><input type="checkbox" checked={value.withNotes} onChange={(event) => { onChange({ ...value, withNotes: event.target.checked }); }} />{copy.withNotes}</label>
        <button type="button" className="pill-button pill-button-ghost" onClick={() => { onChange(EMPTY_FILTERS); }}>{copy.clearFilters}</button>
      </div>
    </fieldset>
  );
}

/** A factual summary of the current local week, independent of list filters. */
export function WeeklyListening({ records }: { readonly records: readonly SessionRecord[] }): React.JSX.Element {
  const titleId = useId();
  const t = useMessages();
  const format = useRecordFormatter();
  const now = new Date();
  const start = weekStart(now).getTime();
  const week = measuredSessions(records).filter((record) => {
    const date = Date.parse(record.startedAt);
    return date >= start && date <= now.getTime();
  });
  const seconds = week.reduce((total, record) => total + record.listenedSeconds, 0);
  const rated = week.filter((record) => record.ratingBefore !== null || record.ratingAfter !== null).length;
  const counts = GOAL_IDS.map((goal) => ({ goal, count: week.filter((record) => record.goals.includes(goal)).length }));
  const most = Math.max(0, ...counts.map(({ count }) => count));
  const goals = counts.filter(({ count }) => count > 0 && count === most).map(({ goal }) => goal);
  return (
    <section className="glass-card listening-tools" aria-labelledby={titleId}>
      <h2 id={titleId}>{t.listeningTools.week}</h2>
      <p>{week.length === 0 ? t.listeningTools.weekEmpty : t.listeningTools.weekTotals(week.length, format.listened(seconds), rated)}</p>
      {goals.length > 0 && <p><strong>{t.listeningTools.weekGoals}</strong>{' · '}{format.goals(goals)}</p>}
    </section>
  );
}
