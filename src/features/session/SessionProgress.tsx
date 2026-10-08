import { useMessages } from '../../i18n/messages';
import { formatClock } from '../../shared/formatClock';
import { SECONDS_PER_MINUTE } from '../../shared/time';

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
  const t = useMessages();
  const shownS = Math.min(elapsedS, plannedS);
  const fraction = plannedS > 0 ? shownS / plannedS : 0;
  const plannedMin = Math.round(plannedS / SECONDS_PER_MINUTE);
  const elapsedMin = Math.floor(shownS / SECONDS_PER_MINUTE);
  const extraS = Math.max(0, elapsedS - plannedS);

  return (
    <div className="session-progress">
      <div
        className="staff"
        role="progressbar"
        aria-label={t.session.progress.label}
        aria-valuemin={0}
        aria-valuemax={plannedS}
        aria-valuenow={Math.round(shownS)}
        aria-valuetext={t.session.progress.valueText(elapsedMin, plannedMin)}
        style={{ '--progress': fraction } as React.CSSProperties}
      >
        <span className="staff-ink" aria-hidden="true" />
        <span className="staff-note" aria-hidden="true" />
      </div>
      <p className="session-clock">
        {t.session.progress.clock(<span key="elapsed">{formatClock(shownS)}</span>, formatClock(plannedS))}
        {extraS > 0 && <span className="session-extra">{t.session.progress.extra(formatClock(extraS))}</span>}
      </p>
    </div>
  );
}
