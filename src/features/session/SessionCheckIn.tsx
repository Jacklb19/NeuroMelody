import { Link } from 'react-router';
import { SelfRatingField } from '../records/SelfRatingField';

interface SessionCheckInProps {
  readonly playing: boolean;
  readonly ratingBefore: number | null;
  readonly onRatingBeforeChange: (rating: number | null) => void;
  /** Id of the session just saved on the device, if any. */
  readonly savedId: string | null;
  readonly saveError: string | null;
}

/**
 * What surrounds the listening itself: the optional self-rating before
 * starting (ADR-23) and, once the music stops, the way to the summary.
 */
export function SessionCheckIn({
  playing,
  ratingBefore,
  onRatingBeforeChange,
  savedId,
  saveError,
}: SessionCheckInProps): React.JSX.Element | null {
  if (saveError !== null) {
    return (
      <p className="quiet-notice" role="alert">
        No se pudo guardar la sesión en este dispositivo ({saveError}).
      </p>
    );
  }
  if (savedId !== null && !playing) {
    return (
      <div className="session-saved" role="status">
        <p><strong>Sesión guardada en este dispositivo.</strong> Puedes revisarla y descargarla cuando quieras.</p>
        <Link to={`/summary/${savedId}`} className="button button-primary">Ver resumen de la sesión</Link>
      </div>
    );
  }
  if (playing) {
    return ratingBefore === null ? null : (
      <p className="check-in-note">Al empezar te sentías en {ratingBefore} de 10.</p>
    );
  }
  return (
    <div className="check-in">
      <SelfRatingField legend="¿Cómo te sientes antes de empezar?" value={ratingBefore} onChange={onRatingBeforeChange} />
    </div>
  );
}
