import { useId, useSyncExternalStore } from 'react';
import { useFormatters, useMessages } from '../../i18n/messages';
import type { AdaptationSession } from '../adaptation/AdaptationSession';
import type { LevelId } from '../audio/engine/levels';
import { SECONDS_PER_MINUTE } from '../../shared/time';

/**
 * What the music did in the session that just ended (ADR-42): the pace it
 * started and ended at and each step it took, with the minute. It describes;
 * it does not say why the body did anything.
 */
export function SessionRecap({ session, playing }: { readonly session: AdaptationSession; readonly playing: boolean }): React.JSX.Element | null {
  const t = useMessages();
  const format = useFormatters();
  const { recap } = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const titleId = useId();
  if (playing || recap === null || recap.startTempoBpm === null || recap.endTempoBpm === null) {
    return null;
  }
  const copy = t.session.recap;
  const names: Readonly<Record<LevelId, string>> = t.session.journey.levels;
  const from = format.integer(recap.startTempoBpm);
  const to = format.integer(recap.endTempoBpm);
  return (
    <section className="session-recap" aria-labelledby={titleId}>
      <h3 id={titleId}>{copy.title}</h3>
      <p>{from === to ? copy.steadyTempo(from) : copy.tempo(from, to)}</p>
      {recap.steps.length === 0 ? (
        <p>{copy.noSteps}</p>
      ) : (
        <ul>
          {recap.steps.map((step) => {
            // "Minute 4" is the fourth minute of listening: the one that runs from 3:00 to 3:59.
            const minute = Math.floor(step.atS / SECONDS_PER_MINUTE) + 1;
            return (
              <li key={step.atS}>
                {step.calmer ? copy.calmerStep(minute, names[step.level]) : copy.livelierStep(minute, names[step.level])}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
