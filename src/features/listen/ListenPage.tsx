import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import { listenPath, planWithSoundPath, QUERY_PARAMS } from '../../config/routes';
import { useFormatters, useMessages } from '../../i18n/messages';
import { PageHeading } from '../../shared/PageHeading';
import { useMediaQuery } from '../../shared/useMediaQuery';
import type { InstrumentId } from '../audio/core/instrumentCatalog';
import type { LevelId } from '../audio/engine/levels';
import type { MixTrack } from '../audio/engine/soundProfile';
import type { PlaybackHandle, PlaybackPiece } from '../audio/ui/PlaybackPanel';
import { useAuth } from '../account/authContext';
import { readAmbience, readInstrument, rememberAmbience, rememberInstrument } from '../plan/soundChoices';
import { worldOf, type SoundChoices, type WorldId } from '../plan/worldCatalog';
import { SleepDimmer } from '../session/SleepDimmer';
import { readLastPiece, writeLastPiece, type LastPiece } from './lastPiece';
import { DEFAULT_LISTEN_DURATION_MIN, DEFAULT_LISTEN_LEVEL, readListenTab, type ListenDurationMin, type ListenTab } from './listenCatalog';
import { ListenChoices } from './ListenChoices';
import { ListenPlayer, type PlayerPhase } from './ListenPlayer';
import { MAX_MELODIES, MAX_SEED, soundsAsSaved, type Melody } from './melody';
import { MelodyList } from './MelodyList';
import { SaveMelodyDialog } from './SaveMelodyDialog';
import { MelodyLimitError, useMelodies } from './useMelodies';
import '../plan/plan.css';
import './listen.css';

/** Mirrors the breakpoint at which listen.css stacks the player over the tabs. */
const NARROW_SCREEN_QUERY = '(max-width: 900px)';

/** What the player holds: the piece, and the saved melody it is, if it is one. */
interface Current {
  readonly piece: PlaybackPiece;
  readonly melodyId: string | null;
}

type Notice = 'saved' | 'full' | 'failed';

const FULL_MIX: Readonly<Record<MixTrack, number>> = { music: 1, ambience: 1 };

/** A new piece: any seed the synthesizer accepts, so no two presses sound alike. */
function drawSeed(): number {
  return Math.floor(Math.random() * (MAX_SEED + 1));
}

const sameSound = (piece: PlaybackPiece, sound: SoundChoices, level: LevelId): boolean =>
  piece.instrument === sound.instrument && piece.ambience === sound.ambience && piece.profile === sound.profile && piece.initialLevel === level;

/**
 * Listen at /listen (P-17, docs/plan-escuchar.md): music generated while it
 * plays, with no sensor and no preparation, and the melodies the person
 * keeps. Two tabs share one player, so moving between them never stops the
 * music: the tab travels in the query because the layout mounts the screen
 * again when its path changes. Leaving the screen stops the music like a
 * session does, and the piece waits paused, as the last one heard, for the
 * person to resume or save it. The music only starts with a press here.
 */
export function ListenPage(): React.JSX.Element {
  const t = useMessages();
  const copy = t.listen;
  const format = useFormatters();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = readListenTab(params.get(QUERY_PARAMS.tab));
  const highlightedId = params.get(QUERY_PARAMS.melody);
  usePageTitle(tab === 'melodies' ? copy.melodiesPageTitle : copy.pageTitle);
  const { state: auth } = useAuth();
  const owner = auth.kind === 'signed_in' ? auth.user.id : null;
  const library = useMelodies(owner);
  const melodies = library.melodies ?? [];
  const narrow = useMediaQuery(NARROW_SCREEN_QUERY);

  // What will sound: the device remembers the instrument and the ambience, as in the plan.
  const [sound, setSound] = useState<SoundChoices>(() => ({ instrument: readInstrument(null), ambience: readAmbience(null), profile: 'original' }));
  const [level, setLevel] = useState<LevelId>(DEFAULT_LISTEN_LEVEL);
  const [durationMin, setDurationMin] = useState<ListenDurationMin>(DEFAULT_LISTEN_DURATION_MIN);

  // What sounds, or waits paused: the last piece of this tab comes back as it was left.
  const [restored] = useState(() => (owner === null ? null : readLastPiece(owner)));
  const [current, setCurrent] = useState<Current | null>(() => (restored === null ? null : { piece: restored.piece, melodyId: restored.melodyId }));
  const [phase, setPhase] = useState<PlayerPhase>(restored === null ? 'ready' : 'paused');
  const [elapsedS, setElapsedS] = useState(0);
  const mixRef = useRef<Readonly<Record<MixTrack, number>>>(restored?.mix ?? FULL_MIX);
  // Whether the playback panel already holds the current piece; after coming back it must be given it again.
  const panelHasPiece = useRef(false);
  const playbackRef = useRef<PlaybackHandle | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [saving, setSaving] = useState(false);
  const [immersiveChosen, setImmersiveChosen] = useState(false);
  const playing = phase === 'playing';
  const immersive = immersiveChosen && playing;

  const positionS = (current?.piece.startAtS ?? 0) + elapsedS;
  const savedMelody: Melody | null = current?.melodyId == null ? null : melodies.find((melody) => melody.id === current.melodyId) ?? null;

  // The piece is kept for the tab whenever it changes or stops, and where it stands when the screen goes.
  const lastRef = useRef<LastPiece | null>(null);
  useEffect(() => {
    lastRef.current = current === null
      ? null
      // While the list is still being read the link to the melody is kept as it came.
      : { piece: { ...current.piece, startAtS: positionS }, melodyId: library.melodies === null ? current.melodyId : savedMelody?.id ?? null, mix: mixRef.current };
  });
  useEffect(() => {
    if (owner !== null && lastRef.current !== null) writeLastPiece(owner, lastRef.current);
  }, [owner, current, phase]);
  useEffect(() => () => {
    if (owner !== null && lastRef.current !== null) writeLastPiece(owner, lastRef.current);
  }, [owner]);

  const startPiece = useCallback((piece: PlaybackPiece, melodyId: string | null): void => {
    setCurrent({ piece, melodyId });
    setElapsedS(0);
    setNotice(null);
    panelHasPiece.current = true;
    // Inside the press, as browsers require to play sound.
    playbackRef.current?.start({ ...piece, mix: piece.mix ?? mixRef.current });
  }, []);

  const playNew = (): void => {
    startPiece({ seed: drawSeed(), initialLevel: level, ...sound, startAtS: 0 }, null);
  };
  const resume = (): void => {
    if (current === null) { playNew(); return; }
    if (panelHasPiece.current && phase === 'paused') { playbackRef.current?.start(); return; }
    // Back on the screen, the piece is built again where it was left.
    startPiece({ ...current.piece, startAtS: phase === 'ended' ? 0 : positionS }, current.melodyId);
  };
  const restart = (): void => {
    if (current !== null) startPiece({ ...current.piece, startAtS: 0 }, current.melodyId);
  };
  const playMelody = (melody: Melody, fromSavedPoint: boolean): void => {
    mixRef.current = { music: melody.musicMix, ambience: melody.ambienceMix };
    startPiece({
      seed: melody.seed, initialLevel: melody.level, instrument: melody.instrument, ambience: melody.ambience,
      profile: melody.profile, startAtS: fromSavedPoint ? melody.positionS : 0, mix: mixRef.current,
    }, melody.id);
  };

  const changeSound = (next: SoundChoices): void => {
    setSound(next);
    rememberInstrument(next.instrument);
    rememberAmbience(next.ambience);
  };

  const openSave = (): void => {
    setNotice(null);
    if (melodies.length >= MAX_MELODIES) { setNotice('full'); return; }
    setSaving(true);
  };
  const save = (name: string): void => {
    setSaving(false);
    if (current === null) return;
    const { piece } = current;
    library.save({
      name, seed: piece.seed, instrument: piece.instrument, ambience: piece.ambience, profile: piece.profile,
      level: piece.initialLevel, positionS, musicMix: mixRef.current.music, ambienceMix: mixRef.current.ambience,
    }).then(
      (melody) => {
        setCurrent((value) => (value === null ? value : { ...value, melodyId: melody.id }));
        setNotice('saved');
      },
      (error: unknown) => { setNotice(error instanceof MelodyLimitError ? 'full' : 'failed'); },
    );
  };

  const goToTab = (next: ListenTab, melodyId?: string): void => {
    // The tab replaces the entry: Back leaves the screen instead of stepping through its tabs.
    void navigate(listenPath(next, melodyId), { replace: true });
  };

  const removeMelody = (id: string): void => {
    void library.remove(id);
    if (highlightedId === id) {
      params.delete(QUERY_PARAMS.melody);
      setParams(params, { replace: true });
    }
  };

  // A piece in a world, or a sound chosen by hand; what the player names and the screen is coloured by.
  const shown = current === null ? { ...sound, initialLevel: level } : current.piece;
  const world: WorldId | null = worldOf(shown);
  const worldNames: Readonly<Record<WorldId, string>> = t.plan.worlds.names;
  const instrumentNames: Readonly<Record<InstrumentId, string>> = t.plan.instrument.names;
  const place = world === null ? copy.player.custom : worldNames[world];
  const proposedName = copy.save.defaultName(world === null ? instrumentNames[shown.instrument] : worldNames[world], format.shortDate(new Date().toISOString()));
  const changedSinceStart = current !== null && phase !== 'ready' && !sameSound(current.piece, sound, level);
  const sessionSound = current === null ? sound : current.piece;

  return (
    <div className={immersive ? 'listen-page is-immersive' : 'listen-page'} data-world={world ?? undefined}>
      <SleepDimmer active={playing && shown.initialLevel === 'sleep'} />
      <PageHeading eyebrow={copy.eyebrow} title={copy.pageTitle}>
        <p>{copy.introduction}</p>
      </PageHeading>

      <div className="listen-layout">
        <div className="listen-main">
          <nav className="listen-tabs" aria-label={copy.tabsLabel}>
            <Link to={listenPath('create')} replace aria-current={tab === 'create' ? 'page' : undefined}>{copy.tabs.create}</Link>
            <Link to={listenPath('melodies')} replace aria-current={tab === 'melodies' ? 'page' : undefined}>{copy.tabs.melodies(melodies.length)}</Link>
          </nav>

          {tab === 'create' ? (
            <ListenChoices sound={sound} level={level} onSoundChange={changeSound} onLevelChange={setLevel} />
          ) : (
            <MelodyList
              melodies={melodies}
              cloud={library.cloud}
              pending={library.pending}
              failed={library.failed}
              playingId={playing || phase === 'paused' ? savedMelody?.id ?? null : null}
              paused={phase === 'paused'}
              highlightedId={highlightedId}
              onPlay={playMelody}
              onRename={(id, name) => { void library.rename(id, name); }}
              onDelete={removeMelody}
              onCreate={() => { goToTab('create'); }}
            />
          )}

          <p className="listen-session-link">
            {copy.player.sessionQuestion}{' '}
            <Link to={planWithSoundPath(sessionSound)}>{copy.player.sessionAction}</Link>
          </p>
        </div>

        <ListenPlayer
          playbackRef={playbackRef}
          phase={phase}
          title={savedMelody?.name ?? place}
          unsaved={current !== null && library.melodies !== null && savedMelody === null && phase !== 'ready' && !playing}
          level={shown.initialLevel}
          instrument={shown.instrument}
          ambience={shown.ambience}
          profile={shown.profile}
          durationMin={durationMin}
          onDurationChange={setDurationMin}
          elapsedS={elapsedS}
          hasPiece={current !== null}
          saved={savedMelody !== null}
          olderSound={savedMelody !== null && !soundsAsSaved(savedMelody)}
          changedSinceStart={changedSinceStart}
          notice={notice}
          immersive={immersive}
          narrow={narrow}
          tab={tab}
          onPlay={playNew}
          onResume={resume}
          onRestart={restart}
          onNewPiece={playNew}
          onSave={openSave}
          onViewSaved={() => { goToTab('melodies', current?.melodyId ?? undefined); }}
          onImmersiveChange={setImmersiveChosen}
          onEngineChange={(engine) => {
            if (engine !== null) { setPhase('playing'); return; }
            setPhase((value) => (value === 'playing' ? 'paused' : value));
          }}
          onElapsedChange={setElapsedS}
          onFinished={() => { setPhase('ended'); }}
          onMixChange={(mix) => { mixRef.current = mix; }}
        />
      </div>

      {saving && <SaveMelodyDialog proposedName={proposedName} onSave={save} onCancel={() => { setSaving(false); }} />}
    </div>
  );
}
