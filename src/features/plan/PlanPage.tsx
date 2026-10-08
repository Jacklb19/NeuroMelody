import { useState } from 'react';
import { useNavigate } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import { QUERY_PARAMS, sessionPath } from '../../config/routes';
import { useMessages } from '../../i18n/messages';
import { CALIBRATION_LEVEL } from '../audio/engine/levels';
import { CALIBRATION_MIN, DURATIONS_MIN, DEFAULT_DURATION_MIN } from './plan';
import { PageHeading } from '../../shared/PageHeading';

/**
 * Session plan (HU-07, RF-18). Only duration is currently configurable;
 * language-model proposals belong to S6.
 */
export function PlanPage(): React.JSX.Element {
  const t = useMessages();
  usePageTitle(t.plan.pageTitle);
  const [duration, setDuration] = useState(DEFAULT_DURATION_MIN);
  const navigate = useNavigate();

  return (
    <div className="reading-page plan-page">
      <PageHeading eyebrow={t.plan.eyebrow} title={t.plan.pageTitle} />
      <fieldset className="duration-fieldset">
        <legend>
          {t.plan.durationLegend}
        </legend>
        <div className="duration-options" style={{ '--option-count': DURATIONS_MIN.length } as React.CSSProperties}>
          {DURATIONS_MIN.map((minutes) => (
            <label key={minutes} className="duration-option">
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
              <span>{minutes}<span className="duration-unit">{' '}{t.plan.minutesUnit}</span></span>
            </label>
          ))}
        </div>
      </fieldset>

      <section aria-label={t.plan.summaryLabel} className="plan-summary">
        <p>
          {t.plan.chosenDuration.before}<strong>{t.plan.minutes(duration)}</strong>{t.plan.chosenDuration.after}
        </p>
        <p className="secondary-text">
          {t.plan.calibrationNote(t.audio.levels[CALIBRATION_LEVEL], CALIBRATION_MIN)}
        </p>
      </section>

      <button
        type="button"
        className="button button-primary"
        onClick={() => {
          void navigate(sessionPath(duration));
        }}
      >
        {t.plan.continueToSession}
      </button>
    </div>
  );
}
