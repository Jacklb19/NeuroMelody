import { Link } from 'react-router';
import { summaryPath } from '../../config/routes';
import { useMessages } from '../../i18n/messages';
import { SelfRatingField } from '../records/SelfRatingField';
import { MAX_RATING } from '../records/sessionRecord';

interface SessionCheckInProps {
  readonly playing: boolean;
  readonly ratingBefore: number | null;
  readonly onRatingBeforeChange: (rating: number | null) => void;
  /** Id of the session just saved on the device, if any. */
  readonly savedId: string | null;
  /** Why the session could not be saved, already in the interface language. */
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
  const { checkIn } = useMessages().session;
  if (saveError !== null) {
    return (
      <p className="quiet-notice" role="alert">
        {checkIn.saveFailed(saveError)}
      </p>
    );
  }
  if (savedId !== null && !playing) {
    return (
      <div className="session-saved" role="status">
        <p><strong>{checkIn.saved}</strong> {checkIn.savedDetail}</p>
        <Link to={summaryPath(savedId)} className="button button-primary">{checkIn.viewSummary}</Link>
      </div>
    );
  }
  if (playing) {
    return ratingBefore === null ? null : (
      <p className="check-in-note">{checkIn.ratingBefore(ratingBefore, MAX_RATING)}</p>
    );
  }
  return (
    <div className="check-in">
      <SelfRatingField legend={checkIn.ratingBeforeLegend} value={ratingBefore} onChange={onRatingBeforeChange} />
    </div>
  );
}
