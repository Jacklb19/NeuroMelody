import { useFormatters, useMessages } from '../../i18n/messages';
import type { MusicRecap } from '../adaptation/AdaptationSession';
import type { LevelId } from '../audio/engine/levels';
import { SECONDS_PER_MINUTE } from '../../shared/time';

interface MusicRecapViewProps {
  readonly recap: MusicRecap;
  /** Id of the heading, so the section around it can name itself after it. */
  readonly titleId: string;
  /** Level of the heading: under the stage of the session or as a section of the summary. */
  readonly headingLevel: 2 | 3;
}

/**
 * What the music did in a session (ADR-42): the pace it started and ended at
 * and each step it took, with the minute. It describes; it does not say why
 * the body did anything. Shown when the session ends and in its summary.
 */
export function MusicRecapView({ recap, titleId, headingLevel }: MusicRecapViewProps): React.JSX.Element | null {
  const t = useMessages();
  const format = useFormatters();
  if (recap.startTempoBpm === null || recap.endTempoBpm === null) {
    return null;
  }
  const copy = t.session.recap;
  const names: Readonly<Record<LevelId, string>> = t.session.journey.levels;
  const from = format.integer(recap.startTempoBpm);
  const to = format.integer(recap.endTempoBpm);
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <>
      <Heading id={titleId}>{copy.title}</Heading>
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
    </>
  );
}
