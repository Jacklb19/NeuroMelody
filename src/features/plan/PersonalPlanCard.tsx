import { useId, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { QUERY_PARAMS, ROUTES } from '../../config/routes';
import { useMessages } from '../../i18n/messages';
import { useSessionHistory } from '../records/useSessionRecords';
import { storeErrorMessage } from '../records/storeErrorMessage';
import { historyInsights, personalComparisons } from '../progress/historyInsights';
import { useInsightText } from '../progress/useInsightText';
import type { GoalId } from './goalCatalog';
import { personalChoices, type PersonalChoices } from './personalPlan';

/** No asynchronous result changes a field. The person applies the suggestion explicitly. */
export function PersonalPlanCard({ goals, onAccept }: { readonly goals: readonly GoalId[]; readonly onAccept: (choices: PersonalChoices) => void }): React.JSX.Element {
  const t = useMessages();
  const copy = t.insights.forYou;
  const [params] = useSearchParams();
  const { records, failure } = useSessionHistory();
  const titleId = useId();
  const text = useInsightText();
  const comparisons = useMemo(() => personalComparisons(historyInsights(records ?? []), goals), [records, goals]);
  const linked = { instrument: params.has(QUERY_PARAMS.instrument), ambience: params.has(QUERY_PARAMS.ambience), duration: params.has(QUERY_PARAMS.duration) };
  const choices = personalChoices(comparisons, linked);
  const [applied, setApplied] = useState(false);
  return (
    <section className="glass-card personal-plan" aria-labelledby={titleId}>
      <h2 id={titleId}>{copy.title}</h2>
      {failure !== null ? <p role="alert">{t.records.readFailed(storeErrorMessage(failure.cause, t))}</p>
        : comparisons.length === 0 ? <p className="secondary-text">{records === null ? t.progress.loading : copy.empty}</p> : <>
        <p>{copy.intro}</p>
        <ul>{comparisons.map((comparison) => <li key={comparison.id}><strong>{text.scope(comparison)}</strong><p>{text.observation(comparison)}</p></li>)}</ul>
        {Object.values(linked).some(Boolean) && <p className="secondary-text">{copy.linked}</p>}
        <button type="button" className="button button-secondary" disabled={Object.values(choices).every((value) => value === undefined)} onClick={() => { onAccept(choices); setApplied(true); }}>{copy.accept}</button>
        <p role="status">{applied ? copy.applied : ''}</p>
      </>}
      <Link to={ROUTES.progress}>{copy.history}</Link>
    </section>
  );
}
