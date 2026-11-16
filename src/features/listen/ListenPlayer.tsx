import { useId, type RefObject } from 'react';
import { useMessages } from '../../i18n/messages';
import { BreathingOrb } from '../../shared/BreathingOrb';
import { PlayIcon } from '../../shared/icons';
import { SECONDS_PER_MINUTE } from '../../shared/time';
import type { AmbienceId } from '../audio/core/ambienceCatalog';
import type { InstrumentId } from '../audio/core/instrumentCatalog';
import type { AudioEngine } from '../audio/engine/AudioEngine';
import type { LevelId } from '../audio/engine/levels';
import type { MixTrack, SoundProfile } from '../audio/engine/soundProfile';
import { PlaybackPanel, type PlaybackHandle } from '../audio/ui/PlaybackPanel';
import { SessionProgress } from '../session/SessionProgress';
import { LISTEN_DURATIONS_MIN, type ListenDurationMin, type ListenTab } from './listenCatalog';
import { MAX_MELODIES } from './melody';

/** What the player is doing (docs/plan-escuchar.md §2.8). */
export type PlayerPhase = 'ready' | 'playing' | 'paused' | 'ended';

interface ListenPlayerProps {
  readonly playbackRef: RefObject<PlaybackHandle | null>;
  readonly phase: PlayerPhase;
  /** The saved melody's name, the world, or the words for a sound chosen by hand. */
  readonly title: string;
  /** A piece heard and stopped that nobody saved: it is the last one heard. */
  readonly unsaved: boolean;
  readonly level: LevelId;
  readonly instrument: InstrumentId;
  readonly ambience: AmbienceId;
  readonly profile: SoundProfile;
  readonly durationMin: ListenDurationMin;
  readonly onDurationChange: (minutes: ListenDurationMin) => void;
  readonly elapsedS: number;
  readonly hasPiece: boolean;
  readonly saved: boolean;
  readonly olderSound: boolean;
  /** The create tab no longer matches what sounds: the new choices wait for a new piece. */
  readonly changedSinceStart: boolean;
  readonly notice: 'saved' | 'full' | 'failed' | null;
  readonly immersive: boolean;
  /** Below the breakpoint the main actions move to a bar at the bottom of the screen. */
  readonly narrow: boolean;
  readonly tab: ListenTab;
  readonly onPlay: () => void;
  readonly onResume: () => void;
  readonly onRestart: () => void;
  readonly onNewPiece: () => void;
  readonly onSave: () => void;
  readonly onViewSaved: () => void;
  readonly onImmersiveChange: (immersive: boolean) => void;
  readonly onEngineChange: (engine: AudioEngine | null) => void;
  readonly onElapsedChange: (seconds: number) => void;
  readonly onFinished: () => void;
  readonly onMixChange: (mix: Readonly<Record<MixTrack, number>>) => void;
}

/**
 * The player of the listening screen (P-17): what sounds, for how long, and
 * the ways on from each moment. The playback panel of the session sits
 * inside it, so volume, mix, Stop, Escape and the system controls are the
 * same everywhere (ADR-16). The piece ends by itself with a quiet fade, as
 * the session for falling asleep does (ADR-41).
 */
export function ListenPlayer(props: ListenPlayerProps): React.JSX.Element {
  const { phase, title, unsaved, level, instrument, ambience, profile, durationMin, onDurationChange, elapsedS, hasPiece, saved } = props;
  const { olderSound, changedSinceStart, notice, immersive, narrow, tab, playbackRef } = props;
  const t = useMessages();
  const copy = t.listen.player;
  const titleId = useId();
  const levelNames: Readonly<Record<LevelId, string>> = t.session.journey.levels;
  const instrumentNames: Readonly<Record<InstrumentId, string>> = t.plan.instrument.names;
  const ambienceNames: Readonly<Record<AmbienceId, string>> = t.plan.ambience.names;
  const playing = phase === 'playing';

  const actions = <PlayerActions {...props} />;
  return (
    <aside className="listen-player glass-card paper" aria-labelledby={titleId} data-phase={phase}>
      <BreathingOrb className="listen-orb" />
      <div className="listen-now">
        <p className="eyebrow">{copy.phases[phase]}</p>
        <h2 id={titleId} className="listen-title">{title}</h2>
        <p className="secondary-text listen-sound">
          {levelNames[level]} · {instrumentNames[instrument]} · {ambienceNames[ambience]}
        </p>
        {unsaved && <p className="secondary-text">{copy.unsaved}</p>}
        {olderSound && <p className="quiet-notice">{copy.olderSound}</p>}
        {changedSinceStart && <p className="quiet-notice" role="status">{copy.nextNotice}</p>}
      </div>

      <fieldset className="listen-durations">
        <legend>{copy.durationLegend}</legend>
        <div className="listen-duration-options">
          {LISTEN_DURATIONS_MIN.map((minutes) => (
            <label key={minutes} className="listen-duration">
              <input type="radio" name="listen-duration" value={minutes} aria-label={copy.minutesLong(minutes)}
                checked={durationMin === minutes} onChange={() => { onDurationChange(minutes); }} />
              <span aria-hidden="true">{copy.minutes(minutes)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {hasPiece && phase !== 'ready' && <SessionProgress elapsedS={elapsedS} plannedS={durationMin * SECONDS_PER_MINUTE} />}

      {/* On a phone the main actions live in the bar at the bottom; here they would only repeat it. */}
      {!narrow && actions}

      <div className="listen-secondary">
        {hasPiece && phase !== 'ready' && (saved
          ? <p className="listen-saved" role="status"><span aria-hidden="true">✓</span> {copy.saved}</p>
          : <button type="button" className="pill-button pill-button-ghost" onClick={props.onSave}>{copy.save}</button>)}
        {playing && (
          <button type="button" className="pill-button pill-button-ghost immersive-toggle" aria-pressed={immersive}
            onClick={() => { props.onImmersiveChange(!immersive); }}>
            {immersive ? t.session.immersive.exit : t.session.immersive.enter}
          </button>
        )}
      </div>

      {notice !== null && (
        <p className="listen-notice" role="status">
          {notice === 'saved' && <>{copy.savedNotice} <button type="button" className="text-button" onClick={props.onViewSaved}>{copy.viewSaved}</button></>}
          {notice === 'full' && <>{copy.full(MAX_MELODIES)} <button type="button" className="text-button" onClick={props.onViewSaved}>{copy.goToMelodies}</button></>}
          {notice === 'failed' && copy.saveFailed}
        </p>
      )}

      <PlaybackPanel
        ref={playbackRef}
        durationMin={durationMin}
        initialLevel={level}
        ambience={ambience}
        instrument={instrument}
        profile={profile}
        quietEnding
        hideStart
        onEngineChange={props.onEngineChange}
        onElapsedChange={props.onElapsedChange}
        onFinished={props.onFinished}
        onMixChange={props.onMixChange}
      />

      {narrow && <ListenBar {...props} tab={tab} />}
    </aside>
  );
}

/** The ways on from each moment: play what is chosen, resume or restart the piece, or ask for a new one. */
function PlayerActions({ phase, tab, onPlay, onResume, onRestart, onNewPiece }: ListenPlayerProps): React.JSX.Element | null {
  const copy = useMessages().listen.player;
  if (phase === 'playing') return null;
  if (phase === 'ready') {
    return (
      <div className="listen-actions">
        <button type="button" className="pill-button pill-button-primary pill-button-large" onClick={onPlay}><PlayIcon /> {copy.play}</button>
      </div>
    );
  }
  return (
    <div className="listen-actions">
      <button type="button" className="pill-button pill-button-primary" onClick={phase === 'ended' ? onRestart : onResume}>
        <PlayIcon /> {phase === 'ended' ? copy.restart : copy.resume}
      </button>
      {/* A new piece plays what the create tab holds; from the melodies it would play something not in sight. */}
      {(tab === 'create' || phase === 'ended') && (
        <button type="button" className="pill-button pill-button-ghost" onClick={onNewPiece}>{copy.newPiece}</button>
      )}
    </div>
  );
}

/**
 * The bar at the bottom of a phone (900 px or less). While the music plays
 * the Stop button of the playback panel takes its place, so there is never
 * more than one bar; with nothing to offer it is not there at all.
 */
function ListenBar(props: ListenPlayerProps): React.JSX.Element | null {
  const { phase, tab, title, durationMin } = props;
  const copy = useMessages().listen.player;
  if (phase === 'playing' || (phase === 'ready' && tab !== 'create')) return null;
  return (
    <div className="listen-bar">
      {phase === 'ready' && (
        <p>
          <strong>{title}</strong>
          <span className="secondary-text">{copy.minutesLong(durationMin)}</span>
        </p>
      )}
      <PlayerActions {...props} />
    </div>
  );
}
