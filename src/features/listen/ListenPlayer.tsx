import { useId, type ReactNode } from 'react';
import { useMessages } from '../../i18n/messages';
import { BreathingOrb } from '../../shared/BreathingOrb';
import {
  BackIcon,
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
import type { ListenTab } from './listenCatalog';
import { MAX_MELODIES } from './melody';
import { SeekBar } from './SeekBar';

/** What the player is doing (docs/plan-escuchar.md §2.8). */
export type PlayerPhase = 'ready' | 'playing' | 'paused' | 'ended';

/** The jump of the back and forward buttons, in seconds. */
export const SKIP_S = 15;

interface ListenPlayerProps {
  readonly onControlsHostChange: (node: HTMLDivElement | null) => void;
  readonly autoNext: boolean;
  readonly onAutoNextChange: (enabled: boolean) => void;
  readonly phase: PlayerPhase;
  /** The saved melody's name, the world, or the words for a sound chosen by hand. */
  readonly title: string;
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
  /** The create tab no longer matches what sounds: the new choices wait for a new piece. */
  readonly changedSinceStart: boolean;
  readonly notice: 'saved' | 'full' | 'failed' | null;
  /** Open: the player takes most of the screen, with the melodies as a queue. */
  readonly expanded: boolean;
  readonly tab: ListenTab;
  readonly canPrevious: boolean;
  readonly canNext: boolean;
  /** The saved melodies beside the open player. */
  readonly queue: ReactNode;
  readonly onPlay: () => void;
  readonly onPause: () => void;
  readonly onResume: () => void;
  readonly onRestart: () => void;
  readonly onNewPiece: () => void;
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
  const { seeking, saved, olderSound, changedSinceStart, notice, expanded, tab, queue } = props;
  const { onControlsHostChange } = props;
  const t = useMessages();
  const copy = t.listen.player;
  const titleId = useId();
  const levelNames: Readonly<Record<LevelId, string>> = t.session.journey.levels;
  const instrumentNames: Readonly<Record<InstrumentId, string>> = t.plan.instrument.names;
  const ambienceNames: Readonly<Record<AmbienceId, string>> = t.plan.ambience.names;
  const sound = `${levelNames[level]} · ${instrumentNames[instrument]} · ${ambienceNames[ambience]}`;
  const share = lengthS > 0 ? Math.min(1, positionS / lengthS) : 0;
  // On a phone the bar shows what can be played or what plays; on the melodies tab with nothing chosen, each card plays its own.
  const miniBar = hasPiece || tab === 'create';

  return (
    <aside className={expanded ? 'listen-player is-expanded' : 'listen-player'} aria-labelledby={titleId} data-phase={phase}
      data-mini={miniBar || undefined}>
      {/* The bar of a phone: the whole of it opens the player, and its button plays or pauses. */}
      <div className="player-mini" style={{ '--seek-share': share } as React.CSSProperties}>
        <span className="player-mini-line" aria-hidden="true" />
        <button type="button" className="player-mini-open" onClick={props.onExpand} aria-label={copy.expand}>
          <BreathingOrb className="player-mini-orb" />
          <span className="player-mini-text">
            <strong>{title}</strong>
            <span className="secondary-text">{hasPiece ? copy.phases[phase] : sound}</span>
          </span>
        </button>
        <PrimaryButton {...props} compact />
      </div>

      <div className="player-stage">
        <div className="player-top">
          <p className="eyebrow">{copy.phases[phase]}</p>
          {expanded ? (
            <button type="button" className="icon-button" onClick={props.onCollapse} aria-label={copy.collapse}><CollapseIcon /></button>
          ) : (
            <button type="button" className="icon-button player-open" onClick={props.onExpand} aria-label={copy.expand}><ExpandIcon /></button>
          )}
        </div>
        <BreathingOrb className="listen-orb" />
        <div className="listen-now">
          <h2 id={titleId} className="listen-title">{title}</h2>
          <p className="secondary-text listen-sound">{sound}</p>
          {unsaved && <p className="secondary-text">{copy.unsaved}</p>}
          {olderSound && <p className="quiet-notice">{copy.olderSound}</p>}
          {changedSinceStart && <p className="quiet-notice" role="status">{copy.nextNotice}</p>}
        </div>

        {hasPiece && <SeekBar positionS={positionS} lengthS={lengthS} savedAtS={savedAtS} seeking={seeking} onSeek={props.onSeek} />}

        <div className="player-transport">
          <button type="button" className="icon-button" onClick={props.onPrevious} disabled={!props.canPrevious} aria-label={copy.previous}><PreviousIcon /></button>
          <button type="button" className="icon-button" onClick={() => { props.onSeek(positionS - SKIP_S); }} disabled={!hasPiece || seeking} aria-label={copy.back(SKIP_S)}><BackIcon /></button>
          <PrimaryButton {...props} />
          <button type="button" className="icon-button" onClick={() => { props.onSeek(positionS + SKIP_S); }} disabled={!hasPiece || seeking} aria-label={copy.forward(SKIP_S)}><ForwardIcon /></button>
          <button type="button" className="icon-button" onClick={props.onNext} disabled={!props.canNext} aria-label={copy.next}><NextIcon /></button>
        </div>

        <div className="listen-secondary">
          {hasPiece && phase !== 'ready' && (saved
            ? <p className="listen-saved" role="status"><span aria-hidden="true">✓</span> {copy.saved}</p>
            : <button type="button" className="pill-button pill-button-ghost" onClick={props.onSave}>{copy.save}</button>)}
          {hasPiece && tab === 'create' && (
            <button type="button" className="pill-button pill-button-ghost" onClick={props.onNewPiece}>{copy.newPiece}</button>
          )}
        </div>

        {notice !== null && (
          <p className="listen-notice" role="status">
            {notice === 'saved' && <>{copy.savedNotice} <button type="button" className="text-button" onClick={props.onViewSaved}>{copy.viewSaved}</button></>}
            {notice === 'full' && <>{copy.full(MAX_MELODIES)} <button type="button" className="text-button" onClick={props.onViewSaved}>{copy.goToMelodies}</button></>}
            {notice === 'failed' && copy.saveFailed}
          </p>
        )}

        <label className="player-auto-next">
          <input type="checkbox" checked={props.autoNext} onChange={(event) => { props.onAutoNextChange(event.target.checked); }} />
          {copy.autoNext}
        </label>
        <div ref={onControlsHostChange} className="player-audio-controls" />
      </div>

      {expanded && <div className="player-queue">{queue}</div>}
    </aside>
  );
}

/** Play, pause, resume or start again: one button whose meaning follows the moment. */
function PrimaryButton({ phase, hasPiece, seeking, onPlay, onPause, onResume, onRestart, compact = false }: ListenPlayerProps & { readonly compact?: boolean }): React.JSX.Element {
  const copy = useMessages().listen.player;
  const playing = phase === 'playing';
  const label = playing ? copy.pause : phase === 'ended' ? copy.restart : phase === 'paused' ? copy.resume : copy.play;
  const action = playing ? onPause : phase === 'ended' ? onRestart : phase === 'paused' ? onResume : onPlay;
  return (
    <button type="button" className={compact ? 'player-primary is-compact' : 'player-primary'} onClick={action}
      disabled={seeking || (!hasPiece && phase !== 'ready')} aria-label={label} data-playing={playing || undefined}>
      <span className="player-primary-icon" aria-hidden="true">{playing ? <PlayerPauseIcon /> : <PlayIcon />}</span>
    </button>
  );
}
