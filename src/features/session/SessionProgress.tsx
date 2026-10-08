import { formatClock } from '../../shared/formatClock';

interface SessionProgressProps {
  /** Listening time measured on the audio clock, in seconds. */
  readonly elapsedS: number;
  readonly plannedS: number;
}

/**
 * Session progress drawn as a musical staff that fills with ink while the
 * session advances. It is the signature element of the listening screen;
 * the text next to it carries the same information for everyone.
 */
export function SessionProgress({ elapsedS, plannedS }: SessionProgressProps): React.JSX.Element {
  const shownS = Math.min(elapsedS, plannedS);
  const fraction = plannedS > 0 ? shownS / plannedS : 0;
  const plannedMin = Math.round(plannedS / 60);
  const elapsedMin = Math.floor(shownS / 60);
  const extraS = Math.max(0, elapsedS - plannedS);

  return (
    <div className="session-progress">
      <div
        className="staff"
        role="progressbar"
        aria-label="Progreso de la sesión"
        aria-valuemin={0}
        aria-valuemax={plannedS}
        aria-valuenow={Math.round(shownS)}
        aria-valuetext={`${String(elapsedMin)} de ${String(plannedMin)} minutos`}
        style={{ '--progress': fraction } as React.CSSProperties}
      >
        <span className="staff-ink" aria-hidden="true" />
        <span className="staff-note" aria-hidden="true" />
      </div>
      <p className="session-clock">
        <span>{formatClock(shownS)}</span> de {formatClock(plannedS)}
        {extraS > 0 && <span className="session-extra"> · {formatClock(extraS)} más</span>}
      </p>
    </div>
  );
}
