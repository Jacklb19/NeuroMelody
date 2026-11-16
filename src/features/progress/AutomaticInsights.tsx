import { useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ROUTES } from '../../config/routes';
import { AccessLink } from '../account/AccessLink';
import { useLocale, useMessages } from '../../i18n/messages';
import { useCloudSync } from '../cloud/cloudSyncContext';
import { AuthContext } from '../account/authContext';
import type { SessionRecord } from '../records/sessionRecord';
import type { InsightComparison } from './historyInsights';
import type { ProgressRangeId } from './progressRangeCatalog';
import { progressObservations, type ProgressNarrative } from './progressNarrative';
import { useInsightText } from './useInsightText';

/** Stale answers belong to their original history, filter, account and language only. */
export function AutomaticInsights({ comparisons, records, range }: {
  readonly comparisons: readonly InsightComparison[];
  readonly records: readonly SessionRecord[];
  readonly range: ProgressRangeId;
}): React.JSX.Element | null {
  const t = useMessages();
  const copy = t.insights.automatic;
  const locale = useLocale();
  const { api, status } = useCloudSync();
  const auth = useContext(AuthContext);
  const account = auth?.state.kind === 'signed_in' ? auth.state.user.id : null;
  const titleId = useId();
  const text = useInsightText();
  const scope = useMemo(() => ({ records, range, locale, api, account }), [records, range, locale, api, account]);
  const generation = useRef(0);
  useEffect(() => () => { generation.current++; }, [scope]);
  const [request, setRequest] = useState<{ scope: typeof scope; state: 'working' | 'failed' | 'done'; narrative?: ProgressNarrative } | null>(null);
  const current = request?.scope === scope ? request : null;
  if (comparisons.length === 0) return null;

  const ask = (): void => {
    if (api === null) return;
    const ticket = ++generation.current;
    setRequest({ scope, state: 'working' });
    void api.summarizeProgress(locale, progressObservations(comparisons)).then((narrative) => {
      if (ticket === generation.current) setRequest({ scope, state: 'done', narrative });
    }, () => {
      if (ticket === generation.current) setRequest({ scope, state: 'failed' });
    });
  };
  return (
    <section className="automatic-insights" aria-labelledby={titleId}>
      <h3 id={titleId}>{copy.title}</h3>
      <div aria-live="polite">
        {current?.state === 'working' && <p>{copy.working}</p>}
        {current?.state === 'failed' && <p>{copy.failed}</p>}
        {current?.narrative !== undefined && <>
          <p className="automatic-lead">{copy[current.narrative.framing]}</p>
          <ol className="insight-readings">
            {comparisons.map((comparison) => {
              const reading = text.reading(comparison);
              if (reading === null) return null;
              return (
                <li key={comparison.id}>
                  <h4>{text.scope(comparison)}</h4>
                  <p>{reading.lead} {reading.size}</p>
                  <p className="secondary-text">{reading.support}</p>
                  <p className="insight-next"><strong>{copy.tryLabel}</strong> {reading.next}</p>
                </li>
              );
            })}
          </ol>
          <p className="generated-mark">{copy.generated}</p>
        </>}
      </div>
      {api === null ? <p className="secondary-text">{status === 'unavailable' ? t.summary.automatic.unavailable : <>{copy.needsAccount} <AccessLink to={ROUTES.login}>{t.cloud.actions.signed_out}</AccessLink></>}</p>
        : current?.state !== 'done' && <>
          <p className="secondary-text">{copy.notice}</p>
          <button type="button" className="button button-secondary" disabled={current?.state === 'working'} onClick={ask}>{copy.ask}</button>
        </>}
    </section>
  );
}
