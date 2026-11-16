import { useEffect, useId, useRef, useState } from 'react';
import { useLocale, useMessages } from '../../i18n/messages';
import { PlayIcon, SparkIcon } from '../../shared/icons';
import { isCheckingSession, useAuth } from '../account/authContext';
import { CloudError, type CloudErrorCode, type ComposedPlan } from '../cloud/cloudApi';
import { useCloudSync } from '../cloud/cloudSyncContext';
import { GoalIcon } from './GoalIcon';
import { PLAN_TEXT_COUNT_FROM, PLAN_TEXT_MAX_CHARS } from './plan';
import type { GoalId } from './goalCatalog';
import type { WorldId } from './worldCatalog';

interface PlanComposerProps {
  /** The person chose to use the plan: the page applies it and opens the session. */
  readonly onUse: (plan: ComposedPlan) => void;
}

type Request =
  | { readonly kind: 'idle' }
  | { readonly kind: 'working' }
  | { readonly kind: 'proposed'; readonly plan: ComposedPlan }
  | { readonly kind: 'failed'; readonly code: CloudErrorCode };

/**
 * The person writes how they are or what they want to hear, and the language
 * model composes a whole plan from the app's catalogs (ADR-68). Pressing
 * "send" is the agreement to send that text; nothing else is asked or warned.
 * The text stays only in this field: it is neither stored on the device nor
 * kept by the API. The plan is shown as an automatic proposal, and nothing
 * changes until the person uses it; if the model cannot answer, the manual
 * plan below is still there. Without an API it is not shown at all.
 */
export function PlanComposer({ onUse }: PlanComposerProps): React.JSX.Element | null {
  const t = useMessages();
  const copy = t.plan.compose;
  const locale = useLocale();
  const { status, api } = useCloudSync();
  const { state } = useAuth();
  const [text, setText] = useState('');
  const [request, setRequest] = useState<Request>({ kind: 'idle' });
  const fieldId = useId();
  const countId = useId();
  const resultRef = useRef<HTMLElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  // An answer that arrives after the person left the screen or wrote again is not shown.
  const pending = useRef(0);
  useEffect(() => () => { pending.current += 1; }, []);
  const errors: Readonly<Record<CloudErrorCode, string>> = t.cloud.errors;
  const goalNames: Readonly<Record<GoalId, string>> = t.plan.goals.names;
  const worldNames: Readonly<Record<WorldId, string>> = t.plan.worlds.names;

  // The proposal takes the focus when it appears, so a keyboard or a screen reader lands on it.
  useEffect(() => {
    if (request.kind === 'proposed') resultRef.current?.focus();
  }, [request.kind]);

  if (status === 'unavailable' || isCheckingSession(state) || api === null) return null;

  const written = text.trim();
  const working = request.kind === 'working';
  const remaining = PLAN_TEXT_MAX_CHARS - text.length;

  const send = (): void => {
    if (written === '' || working) return;
    const asked = ++pending.current;
    setRequest({ kind: 'working' });
    api.composePlan(written, new Date().getHours(), locale).then(
      (plan) => { if (asked === pending.current) setRequest({ kind: 'proposed', plan }); },
      (cause: unknown) => {
        if (asked === pending.current) setRequest({ kind: 'failed', code: cause instanceof CloudError ? cause.code : 'unknown' });
      },
    );
  };

  const dismiss = (): void => {
    setRequest({ kind: 'idle' });
    // The field comes back with the text as it was, ready to change.
    requestAnimationFrame(() => { fieldRef.current?.focus(); });
  };

  if (request.kind === 'proposed') {
    const { plan } = request;
    return (
      <section ref={resultRef} tabIndex={-1} className="plan-compose plan-compose-result glass-card" data-world={plan.world}
        aria-labelledby={`${fieldId}-title`}>
        <div className="plan-compose-heading">
          <span className="world-swatch" data-world={plan.world} aria-hidden="true" />
          <div>
            <p className="generated-mark">{copy.generatedMark}</p>
            <h2 id={`${fieldId}-title`}>{copy.resultTitle}: {worldNames[plan.world]}</h2>
          </div>
        </div>
        <ul className="plan-compose-facts">
          <li><strong>{t.plan.minutes(plan.durationMin)}</strong></li>
          <li>{plan.goal === null ? copy.noGoal : <><GoalIcon goal={plan.goal} /> {goalNames[plan.goal]}</>}</li>
          <li>{plan.fixed ? copy.modes.fixed : copy.modes.adaptive}</li>
        </ul>
        {plan.note !== null && <p className="plan-compose-note">{plan.note}</p>}
        <div className="action-row plan-compose-actions">
          <button type="button" className="pill-button pill-button-primary" onClick={() => { onUse(plan); }}>
            <PlayIcon /> {copy.use}
          </button>
          <button type="button" className="pill-button pill-button-ghost" onClick={dismiss}>{copy.dismiss}</button>
        </div>
      </section>
    );
  }

  return (
    <form className="plan-compose glass-card" aria-busy={working}
      onSubmit={(event) => { event.preventDefault(); send(); }}>
      <label htmlFor={fieldId} className="plan-compose-question"><SparkIcon /> {copy.question}</label>
      <div className="plan-compose-field">
        <textarea
          ref={fieldRef}
          id={fieldId}
          className="tool-input plan-compose-input"
          rows={2}
          maxLength={PLAN_TEXT_MAX_CHARS}
          enterKeyHint="send"
          placeholder={copy.placeholder}
          value={text}
          readOnly={working}
          aria-describedby={remaining <= PLAN_TEXT_COUNT_FROM ? countId : undefined}
          onChange={(event) => {
            setText(event.target.value);
            if (request.kind === 'failed') setRequest({ kind: 'idle' });
          }}
          onKeyDown={(event) => {
            // Enter sends, as in a chat; Shift+Enter keeps a new line. Never while a character is being composed.
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              send();
            }
          }}
        />
        {written !== '' && (
          <button type="submit" className="pill-button pill-button-primary plan-compose-send" disabled={working}>
            {copy.send}
          </button>
        )}
      </div>
      {remaining <= PLAN_TEXT_COUNT_FROM && <p id={countId} className="plan-compose-count secondary-text">{copy.remaining(remaining)}</p>}
      <div aria-live="polite">
        {working && <p className="secondary-text plan-compose-working">{copy.working}</p>}
        {request.kind === 'failed' && <p className="quiet-notice">{copy.failed(errors[request.code])}</p>}
      </div>
    </form>
  );
}
