import { useId } from 'react';
import { useMessages } from '../../i18n/messages';
import { CheckIcon } from '../../shared/icons';
import type { LevelId } from '../audio/engine/levels';
import { worldOf, type WorldId } from '../plan/worldCatalog';
import type { Melody } from './melody';

interface MelodyQueueProps {
  readonly melodies: readonly Melody[];
  /** The melody the player holds, if one. */
  readonly currentId: string | null;
  readonly onPlay: (melody: Melody) => void;
}

/**
 * The saved melodies as a queue beside the open player (ADR-67): one row per
 * melody, the one in the player marked, any other a press away. Renaming and
 * deleting stay in the melodies tab, where there is room for them.
 */
export function MelodyQueue({ melodies, currentId, onPlay }: MelodyQueueProps): React.JSX.Element {
  const t = useMessages();
  const copy = t.listen.player;
  const titleId = useId();
  const worldNames: Readonly<Record<WorldId, string>> = t.plan.worlds.names;
  const levelNames: Readonly<Record<LevelId, string>> = t.session.journey.levels;

  return (
    <section className="melody-queue" aria-labelledby={titleId}>
      <h2 id={titleId} className="melody-queue-title">{copy.queueTitle}</h2>
      {melodies.length === 0 ? (
        <p className="secondary-text">{copy.queueEmpty}</p>
      ) : (
        <ol className="melody-queue-list">
          {melodies.map((melody) => {
            const world = worldOf(melody);
            const current = melody.id === currentId;
            return (
              <li key={melody.id}>
                <button type="button" className={current ? 'melody-queue-item is-current' : 'melody-queue-item'}
                  data-world={world ?? 'custom'} aria-current={current ? 'true' : undefined} onClick={() => { onPlay(melody); }}>
                  <span className="world-swatch world-swatch-small" aria-hidden="true" />
                  <span className="melody-queue-text">
                    <strong>{melody.name}</strong>
                    <span className="secondary-text">
                      {world === null ? copy.custom : worldNames[world]} · {levelNames[melody.level]} · {t.listen.melodies.length(melody.durationMin)}
                    </span>
                  </span>
                  {current && <CheckIcon className="melody-queue-current" />}
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
