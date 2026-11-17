import { useEffect, useId, useRef, useState } from 'react';
import { useFormatters, useMessages } from '../../i18n/messages';
import { ConfirmButton } from '../../shared/ConfirmButton';
import { PlayIcon } from '../../shared/icons';
import type { AmbienceId } from '../audio/core/ambienceCatalog';
import type { InstrumentId } from '../audio/core/instrumentCatalog';
import type { LevelId } from '../audio/engine/levels';
import { worldOf, type WorldId } from '../plan/worldCatalog';
import { isMelodyName, MELODY_NAME_LIMIT, soundsAsSaved, type Melody } from './melody';
import type { MelodyCloudState } from './useMelodies';

interface MelodyListProps {
  readonly melodies: readonly Melody[];
  readonly cloud: MelodyCloudState;
  readonly pending: ReadonlySet<string>;
  readonly failed: boolean;
  /** The melody the player holds, if one: it shows as playing or paused, without buttons to play it. */
  readonly playingId: string | null;
  /** Whether that melody is paused rather than sounding. */
  readonly paused: boolean;
  /** A melody a link brought into sight; it gets the focus once. */
  readonly highlightedId: string | null;
  /** Plays the melody from its start without changing the player view. */
  readonly onPlay: (melody: Melody) => void;
  readonly onRename: (id: string, name: string) => void;
  readonly onDelete: (id: string) => void;
  readonly onCreate: () => void;
}

/**
 * The melodies tab of the listening screen (P-17, ADR-67): one card per
 * melody, the newest first, with the way to hear it and a small menu to
 * rename or delete it. The player time bar reaches any moment of it.
 */
export function MelodyList(props: MelodyListProps): React.JSX.Element {
  const { melodies, cloud, failed, onCreate } = props;
  const t = useMessages();
  const copy = t.listen.melodies;
  const titleId = useId();

  return (
    <section className="melody-list" aria-labelledby={titleId}>
      <h2 id={titleId} className="visually-hidden">{copy.listLabel}</h2>
      <p className="secondary-text melody-cloud" role="status">{failed ? copy.failed : copy.cloud[cloud]}</p>
      {melodies.length === 0 ? (
        <div className="melody-empty glass-card">
          <p>{copy.empty}</p>
          <button type="button" className="pill-button pill-button-primary" onClick={onCreate}>{copy.create}</button>
        </div>
      ) : (
        <ul className="melody-cards">
          {melodies.map((melody) => <MelodyCard key={melody.id} melody={melody} {...props} />)}
        </ul>
      )}
    </section>
  );
}

function MelodyCard({ melody, pending, playingId, paused, highlightedId, onPlay, onRename, onDelete }: MelodyListProps & { readonly melody: Melody }): React.JSX.Element {
  const t = useMessages();
  const format = useFormatters();
  const copy = t.listen.melodies;
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(melody.name);
  const cardRef = useRef<HTMLLIElement | null>(null);
  const nameId = useId();
  const world: WorldId | null = worldOf(melody);
  const worldNames: Readonly<Record<WorldId, string>> = t.plan.worlds.names;
  const levelNames: Readonly<Record<LevelId, string>> = t.session.journey.levels;
  const instrumentNames: Readonly<Record<InstrumentId, string>> = t.plan.instrument.names;
  const ambienceNames: Readonly<Record<AmbienceId, string>> = t.plan.ambience.names;
  const playing = playingId === melody.id;
  const highlighted = highlightedId === melody.id;
  const waiting = pending.has(melody.id);
  const sound = world === null
    ? `${t.listen.player.custom} · ${instrumentNames[melody.instrument]} · ${ambienceNames[melody.ambience]}`
    : worldNames[world];

  // A link that names this melody brings it into sight once, with the focus on it, without playing it.
  useEffect(() => {
    if (!highlighted) return;
    cardRef.current?.scrollIntoView({ block: 'center' });
    cardRef.current?.focus();
  }, [highlighted]);

  return (
    <li ref={cardRef} tabIndex={highlighted ? -1 : undefined} data-world={world ?? 'custom'}
      className={`melody-card glass-card${playing ? ' is-playing' : ''}${highlighted ? ' is-highlighted' : ''}`}>
      <span className="world-swatch" aria-hidden="true" />
      <div className="melody-body">
        <h3 className="melody-name">{melody.name}</h3>
        <p className="secondary-text melody-meta">
          {sound} · {levelNames[melody.level]} · <span className="melody-duration">{copy.length(melody.durationMin)}</span>
        </p>
        <p className="melody-details">
          <time className="secondary-text" dateTime={melody.createdAt}>{copy.savedOn(format.shortDate(melody.createdAt))}</time>
          {waiting && <span className="melody-badge">{copy.pending}</span>}
        </p>
        {!soundsAsSaved(melody) && <p className="secondary-text melody-note">{t.listen.player.olderSound}</p>}
      </div>

      {renaming ? (
        <form className="melody-rename" onSubmit={(event) => {
          event.preventDefault();
          const trimmed = name.trim();
          if (!isMelodyName(trimmed)) return;
          onRename(melody.id, trimmed);
          setRenaming(false);
        }}>
          <label htmlFor={nameId} className="visually-hidden">{t.listen.save.nameLabel}</label>
          <input id={nameId} className="tool-input" value={name} maxLength={MELODY_NAME_LIMIT} required autoFocus
            onChange={(event) => { setName(event.target.value); }}
            onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); setRenaming(false); } }} />
          <button type="submit" className="pill-button pill-button-ghost">{copy.renameSave}</button>
          <button type="button" className="text-button" onClick={() => { setName(melody.name); setRenaming(false); }}>{t.common.cancel}</button>
        </form>
      ) : (
        <div className="melody-actions">
          {playing ? (
            <span className="melody-badge is-playing">{paused ? t.listen.player.phases.paused : copy.playing}</span>
          ) : (
            <button type="button" className="pill-button pill-button-ghost" aria-label={copy.playNamed(melody.name)}
              onClick={() => { onPlay(melody); }}>
              <PlayIcon /> {copy.play}
            </button>
          )}
          <details className="melody-menu">
            <summary aria-label={copy.more(melody.name)}><span aria-hidden="true">⋯</span></summary>
            <div className="melody-menu-body">
              <button type="button" className="text-button" onClick={() => { setName(melody.name); setRenaming(true); }}>{copy.rename}</button>
              <ConfirmButton label={copy.delete} confirmLabel={copy.deleteConfirm} onConfirm={() => { onDelete(melody.id); }} />
            </div>
          </details>
        </div>
      )}
    </li>
  );
}
