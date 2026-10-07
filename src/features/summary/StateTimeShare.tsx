import { useId } from 'react';
import type { SessionSummary } from '../records/summarizeSession';

const PARTS = [
  { key: 'calibrating', label: 'Tomando la referencia' },
  { key: 'high', label: 'Más activo que al empezar' },
  { key: 'uncertain', label: 'Cerca del inicio' },
  { key: 'low', label: 'Más tranquilo que al empezar' },
] as const;

function minutes(seconds: number): string {
  const value = Math.round(seconds / 60);
  return value < 1 && seconds > 0 ? 'menos de 1 min' : `${String(value)} min`;
}

/**
 * Share of signal time spent in each estimated state. The bar is a visual
 * aid; the list next to it carries the same figures as text.
 */
export function StateTimeShare({ secondsByState }: Pick<SessionSummary, 'secondsByState'>): React.JSX.Element {
  const titleId = useId();
  const total = PARTS.reduce((sum, part) => sum + secondsByState[part.key], 0);
  return (
    <section aria-labelledby={titleId} className="state-share">
      <h2 id={titleId}>Cómo se fue moviendo tu ritmo</h2>
      {total === 0 ? (
        <p className="secondary-text">No hubo señal suficiente para estimar el estado durante esta sesión.</p>
      ) : (
        <>
          <div className="state-bar" aria-hidden="true">
            {PARTS.filter((part) => secondsByState[part.key] > 0).map((part) => (
              <span key={part.key} className={`state-segment state-${part.key}`} style={{ flexGrow: secondsByState[part.key] }} />
            ))}
          </div>
          <ul className="state-legend">
            {PARTS.map((part) => (
              <li key={part.key}>
                <span className={`state-swatch state-${part.key}`} aria-hidden="true" />
                {part.label}
                <strong>{minutes(secondsByState[part.key])}</strong>
              </li>
            ))}
          </ul>
          <p className="panel-footnote">Tiempo de señal. Estimación con reglas provisionales y confianza no calibrada.</p>
        </>
      )}
    </section>
  );
}
