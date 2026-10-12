import { useState } from 'react';
import { Link } from 'react-router';
import { ROUTES } from '../../config/routes';
import { useLocale, useMessages } from '../../i18n/messages';
import { SparkIcon } from '../../shared/icons';
import { CloudError, type CloudErrorCode, type PlanSuggestion } from '../cloud/cloudApi';
import { useCloudSync } from '../cloud/cloudSyncContext';
import type { GoalId } from './goalCatalog';
import type { DurationMin } from './plan';

interface PlanSuggestionCardProps {
  readonly goals: readonly GoalId[];
  /** The length chosen right now. */
  readonly duration: DurationMin;
  readonly onAccept: (duration: DurationMin) => void;
}

type Request =
  | { readonly kind: 'idle' }
  | { readonly kind: 'working' }
  | { readonly kind: 'proposed'; readonly plan: PlanSuggestion }
  | { readonly kind: 'failed'; readonly code: CloudErrorCode };

/**
 * A session length proposed by the language model for the goals chosen
 * (RF-13). It only proposes: the person takes it or keeps their own choice,
 * and the note is always shown as generated automatically. Without an
 * account it says what one adds; without an API it is not shown at all.
 */
export function PlanSuggestionCard({ goals, duration, onAccept }: PlanSuggestionCardProps): React.JSX.Element | null {
  const t = useMessages();
  const copy = t.plan.suggestion;
  const locale = useLocale();
  const { status, api } = useCloudSync();
  const [request, setRequest] = useState<Request>({ kind: 'idle' });
  const errors: Readonly<Record<CloudErrorCode, string>> = t.cloud.errors;

  if (status === 'unavailable') return null;
  if (api === null) {
    return (
      <p className="plan-suggestion secondary-text">
        {copy.signedOut} <Link to={ROUTES.login}>{copy.signIn}</Link>
      </p>
    );
  }

  const ask = (): void => {
    setRequest({ kind: 'working' });
    api.suggestPlan(goals, new Date().getHours(), locale).then(
      (plan) => { setRequest({ kind: 'proposed', plan }); },
      (cause: unknown) => { setRequest({ kind: 'failed', code: cause instanceof CloudError ? cause.code : 'unknown' }); },
    );
  };

  return (
    <div className="plan-suggestion">
      <div className="plan-suggestion-ask">
        <button type="button" className="pill-button pill-button-ghost" disabled={goals.length === 0 || request.kind === 'working'} onClick={ask}>
          <SparkIcon /> {copy.ask}
        </button>
        <p className="secondary-text">{goals.length === 0 ? copy.needsGoal : copy.notice}</p>
      </div>
      <div aria-live="polite">
        {request.kind === 'working' && <p className="secondary-text">{copy.working}</p>}
        {request.kind === 'failed' && <p className="quiet-notice">{copy.failed(errors[request.code])}</p>}
        {request.kind === 'proposed' && (
          <div className="plan-proposal">
            <p className="plan-proposal-length"><strong>{copy.proposal(t.plan.minutes(request.plan.durationMin))}</strong></p>
            <p>{request.plan.note}</p>
            <p className="generated-mark">{copy.generatedMark}</p>
            {request.plan.durationMin === duration ? <p className="secondary-text">{copy.accepted}</p> : (
              <button type="button" className="pill-button pill-button-primary" onClick={() => { onAccept(request.plan.durationMin); }}>
                {copy.accept}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
