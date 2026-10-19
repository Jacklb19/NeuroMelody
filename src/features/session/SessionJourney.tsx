import { useMessages } from '../../i18n/messages';
import type { GuidanceRange } from '../adaptation/AdaptationEngine';
import { LEVEL_IDS, type LevelId } from '../audio/engine/levels';

interface SessionJourneyProps {
  readonly range: GuidanceRange;
  readonly level: LevelId;
}

/**
 * The steps the music of this session can take, with the current one marked
 * (ADR-42): where it started, where it is and how far it may come down. It
 * also shows a step above the start when the music had to go back up.
 */
export function SessionJourney({ range, level }: SessionJourneyProps): React.JSX.Element {
  const copy = useMessages().session.journey;
  const names: Readonly<Record<LevelId, string>> = copy.levels;
  const current = LEVEL_IDS.indexOf(level);
  const first = Math.min(LEVEL_IDS.indexOf(range.startLevel), current);
  const last = Math.max(LEVEL_IDS.indexOf(range.calmestLevel), current);
  return (
    <ol className="session-journey" aria-label={copy.label}>
      {LEVEL_IDS.slice(first, last + 1).map((id) => (
        <li key={id} className="journey-step" aria-current={id === level ? 'step' : undefined}>
          {names[id]}
        </li>
      ))}
    </ol>
  );
}
