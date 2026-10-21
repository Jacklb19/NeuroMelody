import { useState } from 'react';
import { useMessages } from '../../i18n/messages';
import type { SourceReading } from '../acquisition/useSignalSource';
import type { AmbienceId } from '../audio/core/ambienceCatalog';
import type { InstrumentId } from '../audio/core/instrumentCatalog';
import type { GoalId } from '../plan/goalCatalog';
import { GoalIcon } from '../plan/GoalIcon';
import { AmbienceIcon } from '../plan/AmbienceIcon';
import { InstrumentIcon } from '../plan/InstrumentIcon';
import { SelfRatingField } from '../records/SelfRatingField';
import { useHeartRateBeats } from './useHeartRateBeats';

interface ArrivalSlideProps {
  readonly reading: SourceReading;
  /** The pulse of a watch that sends no beats (ADR-51): the figure then beats at its pace. */
  readonly watchHeartRate?: number | null;
  readonly goals: readonly GoalId[];
  readonly instrument: InstrumentId;
  readonly ambience: AmbienceId;
  readonly rating: number | null;
  readonly onRatingChange: (rating: number | null) => void;
  /** Starts the music; called inside the click, as browsers require to play sound. */
  readonly onStart: () => void;
  readonly onMeasure: () => void;
}

/**
 * Second slide of the session (ADR-47): the pulse as it is now, beating with
 * each heartbeat, what was chosen for this session, and how the person feels
 * before starting. Starting the music leads to the listening slide.
 */
export function ArrivalSlide({ reading, watchHeartRate = null, goals, instrument, ambience, rating, onRatingChange, onStart, onMeasure }: ArrivalSlideProps): React.JSX.Element {
  const t = useMessages();
  const copy = t.session.arrival;
  const goalNames: Readonly<Record<GoalId, string>> = t.plan.goals.names;
  const instrumentNames: Readonly<Record<InstrumentId, string>> = t.plan.instrument.names;
  const ambienceNames: Readonly<Record<AmbienceId, string>> = t.plan.ambience.names;
  const heartRate = reading.state === 'connected' ? reading.last?.heartRate ?? null : null;
  const [watchBeats, setWatchBeats] = useState(0);
  useHeartRateBeats(watchHeartRate, () => { setWatchBeats((count) => count + 1); });

  return (
    <div className="arrival">
      <div className="arrival-pulse" aria-live="off">
        {heartRate === null ? (
          <>
            <p>{copy.noPulse}</p>
            <button type="button" className="pill-button pill-button-ghost" onClick={onMeasure}>{copy.measure}</button>
          </>
        ) : (
          <>
            <p className="eyebrow">{copy.pulseLabel}</p>
            {/* A new key on every beat restarts the small swell of the figure. */}
            <p className="arrival-rate">
              <span key={watchHeartRate === null ? reading.receivedBeats : `watch-${String(watchBeats)}`} className="arrival-heart" aria-hidden="true" />
              <strong>{heartRate}</strong> <span>{t.common.units.beatsPerMinute}</span>
            </p>
          </>
        )}
      </div>

      <ul className="arrival-choices" aria-label={copy.choicesLabel}>
        <li>
          {goals.length === 0 ? t.plan.noGoals : goals.map((goal) => (
            <span key={goal} className="arrival-choice"><GoalIcon goal={goal} /> {goalNames[goal]}</span>
          ))}
        </li>
        <li><InstrumentIcon instrument={instrument} /> {t.plan.instrument.chosen(instrumentNames[instrument])}</li>
        <li><AmbienceIcon ambience={ambience} /> {ambienceNames[ambience]}</li>
      </ul>

      <div className="check-in arrival-rating">
        <SelfRatingField legend={t.session.checkIn.ratingBeforeLegend} value={rating} onChange={onRatingChange} />
      </div>

      <button type="button" className="pill-button pill-button-primary pill-button-large" onClick={onStart}>
        <span aria-hidden="true">▷</span> {t.audio.playback.start}
      </button>
    </div>
  );
}
