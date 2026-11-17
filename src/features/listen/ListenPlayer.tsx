import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useMessages } from '../../i18n/messages';
import { BreathingOrb } from '../../shared/BreathingOrb';
import {
  BackIcon,
  BookmarkIcon,
  CheckIcon,
  CollapseIcon,
  ExpandIcon,
  ForwardIcon,
  NextIcon,
  PlayerPauseIcon,
  PlayIcon,
  PreviousIcon,
} from '../../shared/icons';
import type { AmbienceId } from '../audio/core/ambienceCatalog';
import type { InstrumentId } from '../audio/core/instrumentCatalog';
import type { LevelId } from '../audio/engine/levels';
import type { WorldId } from '../plan/worldCatalog';
import { MAX_MELODIES } from './melody';
import { SeekBar } from './SeekBar';

/** What the player is doing (docs/plan-escuchar.md §2.8). */
export type PlayerPhase = 'ready' | 'playing' | 'paused' | 'ended';

/** The jump of the back and forward buttons, in seconds. */
export const SKIP_S = 15;

interface ListenPlayerProps {
  readonly onControlsHostChange: (node: HTMLDivElement | null) => void;
  readonly phase: PlayerPhase;
  /** The saved melody's name, the world, or the words for a sound chosen by hand. */
  readonly title: string;
  readonly world: WorldId | null;
  readonly place: string;
  /** A piece heard and stopped that nobody saved: it is the last one heard. */
  readonly unsaved: boolean;
  readonly level: LevelId;
  readonly instrument: InstrumentId;
  readonly ambience: AmbienceId;
  readonly hasPiece: boolean;
  readonly positionS: number;
  readonly lengthS: number;
  /** Where the melody was saved, marked on its bar; `null` for a piece not saved. */
  readonly savedAtS: number | null;
  readonly seeking: boolean;
  readonly saved: boolean;
  readonly olderSound: boolean;
  readonly notice: 'saved' | 'full' | 'failed' | null;
  /** Open: the player takes most of the screen, with the melodies as a queue. */
  readonly expanded: boolean;
  readonly canPrevious: boolean;
  readonly canNext: boolean;
  /** The saved melodies beside the open player. */
  readonly queue: ReactNode;
  readonly onPause: () => void;
  readonly onResume: () => void;
  readonly onRestart: () => void;
  readonly onSeek: (seconds: number) => void;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
  readonly onExpand: () => void;
  readonly onCollapse: () => void;
  readonly onSave: () => void;
  readonly onViewSaved: () => void;
}

/**
 * The player of the listening screen (P-17, ADR-67). One component in three
 * looks, so the music never stops between them: a card beside the choices,
 * the open player that takes most of the screen with the melodies as a
 * queue, and, on a phone, a bar at the bottom that opens it. The playback
 * controls of the shared playback panel appear inside it, while the provider
 * keeps the audio alive across routes. Volume, mix, Escape and the system
 * controls are the same everywhere (ADR-16); its own Stop gives way to the
 * pause of the player, which is always in sight while something plays.
 */
export function ListenPlayer(props: ListenPlayerProps): React.JSX.Element {
  const { phase, title, unsaved, level, instrument, ambience, hasPiece, positionS, lengthS, savedAtS } = props;
  const { seeking, saved, olderSound, notice, expanded, queue, world, place } = props;
  const { onControlsHostChange } = props;
  const t = useMessages();
  const copy = t.listen.player;
  const titleId = useId();
  const miniTextId = useId();
  const miniOpenRef = useRef<HTMLButtonElement>(null);
  const cardOpenRef = useRef<HTMLButtonElement>(null);
  const collapseRef = useRef<HTMLButtonElement>(null);
  const wasExpanded = useRef(false);
  useEffect(() => {
    if (expanded) collapseRef.current?.focus();
    else if (wasExpanded.current) {
      const opener = miniOpenRef.current?.getClientRects().length ? miniOpenRef.current : cardOpenRef.current;
      opener?.focus({ preventScroll: true });
    }
    wasExpanded.current = expanded;
  }, [expanded]);
  const levelNames: Readonly<Record<LevelId, string>> = t.session.journey.levels;
  const instrumentNames: Readonly<Record<InstrumentId, string>> = t.plan.instrument.names;
  const ambienceNames: Readonly<Record<AmbienceId, string>> = t.plan.ambience.names;
  const sound = `${levelNames[level]} · ${instrumentNames[instrument]} · ${ambienceNames[ambience]}`;
  const share = lengthS > 0 ? Math.min(1, positionS / lengthS) : 0;
  return (
    <aside className={expanded ? 'listen-player is-expanded' : 'listen-player'} aria-labelledby={titleId} data-phase={phase}
      data-world={world ?? 'custom'} data-mini={hasPiece || undefined}>
      {/* The bar of a phone: the whole of it opens the player, and its button plays or pauses. */}
      <div className="player-mini" style={{ '--seek-share': share } as React.CSSProperties}>
        <span className="player-mini-line" aria-hidden="true" />
        <button ref={miniOpenRef} type="button" className="player-mini-open" onClick={props.onExpand}
          aria-label={copy.expand} aria-describedby={miniTextId}>
          <BreathingOrb className="player-mini-orb" />
          <span className="player-mini-text" id={miniTextId}>
            <strong>{title}</strong>
            <span className="secondary-text">{title === place ? copy.phases[phase] : `${place} · ${copy.phases[phase]}`}</span>
          </span>
        </button>
        <PrimaryButton {...props} compact />
      </div>

      <div className="player-stage">
        <div className="player-top">
          <p className="secondary-text player-phase">{seeking && phase === 'paused' ? copy.preparing : copy.phases[phase]}</p>
          <div className="player-header-actions">
            {hasPiece && (saved
              ? <button type="button" className="text-button listen-saved" onClick={props.onViewSaved}
                aria-description={copy.viewSaved}><CheckIcon /> {copy.saved}</button>
              : <button type="button" className="text-button player-save" onClick={props.onSave} disabled={seeking}
                aria-label={copy.save}><BookmarkIcon /> {copy.saveShort}</button>)}
            {expanded ? (
              <button ref={collapseRef} type="button" className="icon-button" onClick={props.onCollapse} aria-label={copy.collapse}><CollapseIcon /></button>
            ) : hasPiece && (
              <button ref={cardOpenRef} type="button" className="icon-button" onClick={props.onExpand} aria-label={copy.expand}><ExpandIcon /></button>
            )}
          </div>
        </div>
        <div className="player-identity">
          <BreathingOrb className="listen-orb" />
          <div className="listen-now">
            <h2 id={titleId} className="listen-title">{title}</h2>
            {hasPiece && <p className="secondary-text listen-sound">{title === place ? sound : `${place} · ${sound}`}</p>}
            {unsaved && <p className="secondary-text">{copy.unsaved}</p>}
            {olderSound && <p className="quiet-notice">{copy.olderSound}</p>}
          </div>
        </div>

        {hasPiece && <SeekBar positionS={positionS} lengthS={lengthS} savedAtS={savedAtS} seeking={seeking} onSeek={props.onSeek} />}

        {hasPiece && <div className="player-transport">
          <button type="button" className="icon-button" onClick={props.onPrevious} disabled={!props.canPrevious} aria-label={copy.previous}><PreviousIcon /></button>
          <button type="button" className="icon-button" onClick={() => { props.onSeek(positionS - SKIP_S); }} disabled={seeking} aria-label={copy.back(SKIP_S)}><BackIcon /></button>
          <PrimaryButton {...props} />
          <button type="button" className="icon-button" onClick={() => { props.onSeek(positionS + SKIP_S); }} disabled={seeking} aria-label={copy.forward(SKIP_S)}><ForwardIcon /></button>
          <button type="button" className="icon-button" onClick={props.onNext} disabled={!props.canNext} aria-label={copy.next}><NextIcon /></button>
        </div>}

        <p role="status" className="visually-hidden">{notice === 'saved' && copy.savedNotice}</p>
        {(notice === 'full' || notice === 'failed') && (
          <p className="listen-notice" role="status">
            {notice === 'full' && <>{copy.full(MAX_MELODIES)} <button type="button" className="text-button" onClick={props.onViewSaved}>{copy.goToMelodies}</button></>}
            {notice === 'failed' && copy.saveFailed}
          </p>
        )}

        <div ref={onControlsHostChange} className="player-audio-controls" />
      </div>

      {expanded && <div className="player-queue">{queue}</div>}
    </aside>
  );
}

/** Play, pause, resume or start again: one button whose meaning follows the moment. */
function PrimaryButton({ phase, hasPiece, seeking, onPause, onResume, onRestart, compact = false }: ListenPlayerProps & { readonly compact?: boolean }): React.JSX.Element {
  const copy = useMessages().listen.player;
  const playing = phase === 'playing';
  const label = playing ? copy.pause : phase === 'ended' ? copy.restart : copy.resume;
  const action = playing ? onPause : phase === 'ended' ? onRestart : onResume;
  return (
    <button type="button" className={compact ? 'player-primary is-compact' : 'player-primary'} onClick={action}
      disabled={seeking || !hasPiece} aria-label={label} data-playing={playing || undefined}>
      <span className="player-primary-icon" aria-hidden="true">{playing ? <PlayerPauseIcon /> : <PlayIcon />}</span>
    </button>
  );
}
