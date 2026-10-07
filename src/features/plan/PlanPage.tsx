import { useState } from 'react';
import { useNavigate } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import { LEVELS, CALIBRATION_LEVEL } from '../audio/engine/levels';
import { DURATIONS_MIN, DEFAULT_DURATION_MIN } from './plan';
import { PageHeading } from '../../shared/PageHeading';

/**
 * Session plan (HU-07, RF-18). Only duration is currently configurable;
 * language-model proposals belong to S6.
 */
export function PlanPage(): React.JSX.Element {
  usePageTitle('Plan de sesión');
  const [duration, setDuration] = useState(DEFAULT_DURATION_MIN);
  const navigate = useNavigate();

  return (
    <div className="reading-page plan-page">
      <PageHeading eyebrow="Antes de escuchar" title="Plan de sesión" />
      <fieldset className="duration-fieldset">
        <legend>
          Duración de la sesión
        </legend>
        <div className="duration-options" style={{ '--option-count': DURATIONS_MIN.length } as React.CSSProperties}>
          {DURATIONS_MIN.map((minutes) => (
            <label key={minutes} className="duration-option">
              <input
                type="radio"
                aria-label={`${String(minutes)} minutos`}
                name="duration"
                value={minutes}
                checked={duration === minutes}
                onChange={() => {
                  setDuration(minutes);
                }}
              />
              <span>{minutes}<span className="duration-unit"> minutos</span></span>
            </label>
          ))}
        </div>
      </fieldset>

      <section aria-label="Resumen del plan" className="plan-summary">
        <p>
          Duración: <strong>{duration} minutos</strong>.
        </p>
        <p className="secondary-text">
          La música empieza en el nivel {LEVELS[CALIBRATION_LEVEL].name} durante los primeros 3
          minutos, mientras se toma la referencia de tu señal.
        </p>
      </section>

      <button
        type="button"
        className="button button-primary"
        onClick={() => {
          void navigate(`/session?duration=${String(duration)}`);
        }}
      >
        Continuar a la sesión
      </button>
    </div>
  );
}
