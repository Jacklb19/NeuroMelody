import { useId } from 'react';
import { useMessages } from '../../i18n/messages';
import type { LevelId } from '../audio/engine/levels';
import { worldOf, type WorldId } from '../plan/worldCatalog';
import type { Melody } from './melody';

interface MelodyQueueProps {
  readonly melodies: readonly Melody[];
  /** The melody the player holds, if one. */
  readonly currentId: string | null;
  readonly playing: boolean;
  readonly onPlay: (melody: Melody) => void;
}

/**
 * The saved melodies as a queue beside the open player (ADR-67): one row per
 * melody, the one in the player marked, any other a press away. Renaming and
 * deleting stay in the melodies tab, where there is room for them.
 */
export function MelodyQueue({ melodies, currentId, playing, onPlay }: MelodyQueueProps): React.JSX.Element {
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
                  aria-current={current ? 'true' : undefined} onClick={() => { onPlay(melody); }}>
                  <span className="world-swatch world-swatch-small" data-world={world ?? undefined} aria-hidden="true" />
                  <span className="melody-queue-text">
                    <strong>{melody.name}</strong>
                    <span className="secondary-text">
                      {world === null ? levelNames[melody.level] : `${worldNames[world]} · ${levelNames[melody.level]}`} · {t.listen.melodies.length(melody.durationMin)}
                    </span>
                  </span>
                  {current && (
                    <span className={playing ? 'melody-queue-bars is-playing' : 'melody-queue-bars'} aria-hidden="true">
                      <span /><span /><span />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
