import { useId, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import { QUERY_PARAMS, sessionPath } from '../../config/routes';
import { useMessages } from '../../i18n/messages';
import { BreathingOrb } from '../../shared/BreathingOrb';
import { PlayIcon } from '../../shared/icons';
import { PageHeading } from '../../shared/PageHeading';
import { GOAL_IDS, readGoals, type GoalId } from './goalCatalog';
import { GoalIcon } from './GoalIcon';
import { CALIBRATION_MIN, DEFAULT_DURATION_MIN, DURATIONS_MIN, type DurationMin } from './plan';
import { PlanSuggestionCard } from './PlanSuggestionCard';
import { programFor } from './programCatalog';
import './plan.css';

/**
 * Session plan (HU-07, RF-18): what the person is after and how long they
 * have, with the session they are about to start always in view. The goal
 * is a single choice, because it decides what the music does (ADR-38). A link
 * from the start screen can arrive with a goal already chosen. With an
 * account, the language model can propose the length (RF-13); the person
 * always decides.
 */
export function PlanPage(): React.JSX.Element {
  const t = useMessages();
  usePageTitle(t.plan.pageTitle);
  const [params] = useSearchParams();
  const [duration, setDuration] = useState<DurationMin>(DEFAULT_DURATION_MIN);
  // One goal at most: a link that carries several keeps its first one.
  const [goals, setGoals] = useState<readonly GoalId[]>(() => readGoals(params.get(QUERY_PARAMS.goals)).slice(0, 1));
  const program = programFor(goals);
  const programTexts: Readonly<Record<GoalId, string>> = t.plan.goals.programs;
  const [goal] = goals;
  const goalsHintId = useId();
  const goalNames: Readonly<Record<GoalId, string>> = t.plan.goals.names;
  const navigate = useNavigate();

  // Checking a goal replaces the previous one; unchecking it leaves the session without a goal.
  const toggleGoal = (id: GoalId, chosen: boolean): void => {
    setGoals(chosen ? [id] : []);
  };

  return (
    <div className="plan-page">
      <PageHeading eyebrow={t.plan.eyebrow} title={t.plan.pageTitle}>
        <p>{t.plan.introduction}</p>
      </PageHeading>

      <div className="plan-layout">
        <div className="plan-choices">
          <fieldset className="plan-fieldset" aria-describedby={goalsHintId}>
            <legend>{t.plan.goals.legend}</legend>
            <p id={goalsHintId} className="secondary-text">{t.plan.goals.hint}</p>
            <div className="goal-options">
              {GOAL_IDS.map((id) => (
                <label key={id} className="choice-card goal-option">
                  <input
                    type="checkbox"
                    name={QUERY_PARAMS.goals}
                    value={id}
                    checked={goals.includes(id)}
                    onChange={(event) => {
                      toggleGoal(id, event.target.checked);
                    }}
                  />
                  <span className="icon-badge"><GoalIcon goal={id} /></span>
                  <span>{goalNames[id]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="plan-fieldset">
            <legend>{t.plan.durationLegend}</legend>
            <div className="duration-options" style={{ '--option-count': DURATIONS_MIN.length } as React.CSSProperties}>
              {DURATIONS_MIN.map((minutes) => (
                <label key={minutes} className="choice-card duration-option">
                  <input
                    type="radio"
                    aria-label={t.plan.minutes(minutes)}
                    name={QUERY_PARAMS.duration}
                    value={minutes}
                    checked={duration === minutes}
                    onChange={() => {
                      setDuration(minutes);
                    }}
                  />
                  <span className="duration-figure">{minutes}</span>
                  <span className="duration-unit">{t.plan.minutesUnit}</span>
                </label>
              ))}
            </div>
            <PlanSuggestionCard goals={goals} duration={duration} onAccept={setDuration} />
          </fieldset>
        </div>

        <section aria-label={t.plan.summaryLabel} className="plan-summary glass-card paper">
          <BreathingOrb className="plan-orb" />
          <p className="eyebrow">{t.plan.summaryLabel}</p>
          <p className="plan-duration"><strong>{t.plan.minutes(duration)}</strong></p>
          {goals.length === 0 ? (
            <p className="secondary-text">{t.plan.noGoals}</p>
          ) : (
            <ul className="plan-goals">
              {goals.map((id) => <li key={id}><GoalIcon goal={id} /> {goalNames[id]}</li>)}
            </ul>
          )}
          <p className="plan-program">{goal === undefined ? t.plan.goals.defaultProgram : programTexts[goal]}</p>
          <p className="plan-note">
            {t.plan.calibrationNote(t.audio.levels[program.startLevel], CALIBRATION_MIN)}
          </p>
          <button
            type="button"
            className="pill-button pill-button-primary pill-button-large pill-button-block"
            onClick={() => {
              void navigate(sessionPath(duration, goals));
            }}
          >
            <PlayIcon /> {t.plan.continueToSession}
          </button>
        </section>
      </div>
    </div>
  );
}
