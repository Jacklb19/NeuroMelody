import { useState } from 'react';
import { useNavigate } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import { LEVELS, CALIBRATION_LEVEL } from '../audio/engine/levels';
import { DURATIONS_MIN, DEFAULT_DURATION_MIN } from './plan';

/**
 * Plan de sesión (HU-07, RF-18). En el S3 solo se elige la duración; la
 * propuesta de objetivos con el modelo de lenguaje llega en el S6.
 */
export function PlanPage(): React.JSX.Element {
  usePageTitle('Plan de sesión');
  const [duration, setDuration] = useState(DEFAULT_DURATION_MIN);
  const navigate = useNavigate();

  return (
    <>
      <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-4)' }}>Plan de sesión</h1>
      <fieldset style={{ border: 'none', marginBottom: 'var(--space-6)' }}>
        <legend style={{ marginBottom: 'var(--space-2)', fontWeight: 'var(--font-weight-strong)' }}>
          Duración de la sesión
        </legend>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          {DURATIONS_MIN.map((minutes) => (
            <label key={minutes} style={{ display: 'flex', gap: 'var(--space-1)', alignItems: 'center' }}>
              <input
                type="radio"
                name="duration"
                value={minutes}
                checked={duration === minutes}
                onChange={() => {
                  setDuration(minutes);
                }}
              />
              {minutes} minutos
            </label>
          ))}
        </div>
      </fieldset>

      <section aria-label="Resumen del plan" style={{ marginBottom: 'var(--space-6)' }}>
        <p>
          Duración: <strong>{duration} minutos</strong>.
        </p>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          La música empieza en el nivel {LEVELS[CALIBRATION_LEVEL].name} durante los primeros 3
          minutos, mientras se toma la referencia de tu señal.
        </p>
      </section>

      <button
        type="button"
        onClick={() => {
          void navigate(`/session?duration=${String(duration)}`);
        }}
        style={{
          padding: 'var(--space-2) var(--space-4)',
          backgroundColor: 'var(--color-button-background)',
          color: 'var(--color-button-text)',
          border: 'none',
          borderRadius: 'var(--border-radius)',
          fontSize: 'var(--text-base)',
          cursor: 'pointer',
        }}
      >
        Continuar a la sesión
      </button>
    </>
  );
}
