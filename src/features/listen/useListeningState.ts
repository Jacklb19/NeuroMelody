import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { listenPath, QUERY_PARAMS, ROUTES } from '../../config/routes';
import { useFormatters, useMessages } from '../../i18n/messages';
import { SECONDS_PER_MINUTE } from '../../shared/time';
import type { LevelId } from '../audio/engine/levels';
import type { InstrumentId } from '../audio/core/instrumentCatalog';
import type { AudioEngine } from '../audio/engine/AudioEngine';
import type { MixTrack } from '../audio/engine/soundProfile';
import type { PlaybackHandle, PlaybackPiece } from '../audio/ui/PlaybackPanel';
import { useAuth } from '../account/authContext';
import { useWarningsRegistry } from '../warnings/warningsContext';
import { readAmbience, readInstrument, rememberAmbience, rememberInstrument } from '../plan/soundChoices';
import { worldOf, type SoundChoices, type WorldId } from '../plan/worldCatalog';
import { readLastPiece, writeLastPiece, type LastPiece } from './lastPiece';
import {
  DEFAULT_LISTEN_DURATION_MIN,
  DEFAULT_LISTEN_LEVEL,
  LISTEN_DURATIONS_MIN,
  readListenTab,
  type ListenDurationMin,
  type ListenTab,
} from './listenCatalog';
import type { PlayerPhase } from './ListenPlayer';
import { MAX_MELODIES, MAX_SEED, type Melody } from './melody';
import { MelodyLimitError, useMelodies } from './useMelodies';

/** Query value of the open player: it gets an entry of its own, so Back closes it (ADR-67). */
const PLAYER_PARAM = 'player';
const PLAYER_OPEN = 'open';
/** Navigation state left when this screen opened the player, so closing it can step back instead. */
interface OpenedHere { readonly playerOpened: true }
const openedHere = (state: unknown): state is OpenedHere =>
  typeof state === 'object' && state !== null && (state as Record<string, unknown>).playerOpened === true;

/** Pressing "previous" this far into a piece starts it again, as the players people know do. */
export const RESTART_INSTEAD_OF_PREVIOUS_S = 5;

/** What the player holds: the piece, how long it lasts, and the saved melody it is, if it is one. */
interface Current {
  readonly piece: PlaybackPiece;
  readonly lengthS: number;
  readonly melodyId: string | null;
}

type Notice = 'saved' | 'full' | 'failed';

const FULL_MIX: Readonly<Record<MixTrack, number>> = { music: 1, ambience: 1 };

/** A new piece: any seed the synthesizer accepts, so no two presses sound alike. */
function drawSeed(): number {
  return Math.floor(Math.random() * (MAX_SEED + 1));
}

const sameSound = (current: Current, sound: SoundChoices, level: LevelId, durationMin: number): boolean =>
  current.piece.instrument === sound.instrument && current.piece.ambience === sound.ambience &&
  current.piece.profile === sound.profile && current.piece.initialLevel === level && current.lengthS === durationMin * SECONDS_PER_MINUTE;

const clamp = (value: number, max: number): number => Math.min(max, Math.max(0, value));

/** A piece saved before lengths existed, or restored from the tab, takes the nearest length that holds it. */
function lengthHolding(startAtS: number): number {
  const minutes = LISTEN_DURATIONS_MIN.find((length) => length * SECONDS_PER_MINUTE > startAtS) ?? LISTEN_DURATIONS_MIN[LISTEN_DURATIONS_MIN.length - 1] ?? DEFAULT_LISTEN_DURATION_MIN;
  return minutes * SECONDS_PER_MINUTE;
}

import { readAutoNext, rememberAutoNext } from './autoNext';

/** Playback and library outlive route views; only changing account creates a new instance. */
export function useListeningState() {
  const warnings = useWarningsRegistry();
  const t = useMessages();
  const copy = t.listen;
  const format = useFormatters();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const tab = readListenTab(params.get(QUERY_PARAMS.tab));
  const expanded = location.pathname === ROUTES.listen && params.get(PLAYER_PARAM) === PLAYER_OPEN;
  const highlightedId = params.get(QUERY_PARAMS.melody);
  const { state: auth } = useAuth();
  const owner = auth.kind === 'signed_in' ? auth.user.id : null;
  const library = useMelodies(owner);
  const melodies = library.melodies ?? [];

  // What will sound: the device remembers the instrument and the ambience, as in the plan.
  const [sound, setSound] = useState<SoundChoices>(() => ({ instrument: readInstrument(null), ambience: readAmbience(null), profile: 'original' }));
  const [level, setLevel] = useState<LevelId>(DEFAULT_LISTEN_LEVEL);
  const [durationMin, setDurationMin] = useState<ListenDurationMin>(DEFAULT_LISTEN_DURATION_MIN);

  // What sounds, or waits paused: the last piece of this tab comes back as it was left.
  const [restored] = useState(() => (owner === null ? null : readLastPiece(owner)));
  const [current, setCurrent] = useState<Current | null>(() => (restored === null ? null : {
    piece: restored.piece,
    lengthS: restored.piece.playForS === undefined ? lengthHolding(restored.piece.startAtS) : restored.piece.startAtS + restored.piece.playForS,
    melodyId: restored.melodyId,
  }));
  const [phase, setPhase] = useState<PlayerPhase>(restored === null ? 'ready' : 'paused');
  const [elapsedS, setElapsedS] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const mixRef = useRef<Readonly<Record<MixTrack, number>>>(restored?.mix ?? FULL_MIX);
  // Whether the playback panel already holds the current piece; after coming back or a jump while paused it must be given it again.
  const panelHasPiece = useRef(false);
  const playbackRef = useRef<PlaybackHandle | null>(null);
  const previewStop = useRef<(() => void) | null>(null);
  const registerPreviewStop = useCallback((stop: () => void): (() => void) => {
    previewStop.current = stop;
    return () => { if (previewStop.current === stop) previewStop.current = null; };
  }, []);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [saving, setSaving] = useState(false);
  const [controlsHost, setControlsHost] = useState<HTMLDivElement | null>(null);
  const [autoNext, setAutoNext] = useState(readAutoNext);
  const playing = phase === 'playing';

  const positionS = current === null ? 0 : clamp(current.piece.startAtS + elapsedS, current.lengthS);
  const savedMelody: Melody | null = current?.melodyId == null ? null : melodies.find((melody) => melody.id === current.melodyId) ?? null;
  const queueIndex = savedMelody === null ? -1 : melodies.indexOf(savedMelody);

  // The tab recovers paused after a reload; navigation keeps this provider and its live piece.
  const lastRef = useRef<LastPiece | null>(null);
  useEffect(() => {
    lastRef.current = current === null ? null : {
      piece: { ...current.piece, startAtS: positionS, playForS: current.lengthS - positionS },
      // While the list is still being read the link to the melody is kept as it came.
      melodyId: library.melodies === null ? current.melodyId : savedMelody?.id ?? null,
      mix: mixRef.current,
    };
  });
  useEffect(() => {
    if (owner !== null && lastRef.current !== null) writeLastPiece(owner, lastRef.current);
  }, [owner, current, phase]);
  useEffect(() => {
    const keep = (): void => { if (owner !== null && lastRef.current !== null) writeLastPiece(owner, lastRef.current); };
    window.addEventListener('pagehide', keep);
    return () => { window.removeEventListener('pagehide', keep); };
  }, [owner]);

  const openPlayer = useCallback((): void => {
    if (expanded) return;
    const opened = new URLSearchParams(location.pathname === ROUTES.listen ? params : undefined);
    opened.set(PLAYER_PARAM, PLAYER_OPEN);
    // The open player starts at the top of the page, wherever the choices had been scrolled to.
    window.scrollTo({ top: 0 });
    // An entry of its own: Back, on the phone or the browser, closes the player instead of leaving the screen.
    void navigate(`${ROUTES.listen}?${opened.toString()}`, { state: { playerOpened: true } satisfies OpenedHere });
  }, [expanded, params, navigate, location.pathname]);

  const closePlayer = (): void => {
    if (openedHere(location.state)) {
      void navigate(-1);
      return;
    }
    const closed = new URLSearchParams(params);
    closed.delete(PLAYER_PARAM);
    setParams(closed, { replace: true });
  };

  /** Plays a piece from its start point: what is left of it plays, and its ending follows. */
  const startPiece = useCallback((piece: PlaybackPiece, lengthS: number, melodyId: string | null): void => {
    if (!warnings.isAccepted()) { openPlayer(); return; }
    previewStop.current?.();
    const startAtS = clamp(piece.startAtS, Math.max(0, lengthS - 1));
    setCurrent({ piece: { ...piece, startAtS }, lengthS, melodyId });
    setElapsedS(0);
    setNotice(null);
    setSeeking(true);
    panelHasPiece.current = true;
    // Inside the press, as browsers require to play sound.
    playbackRef.current?.start({ ...piece, startAtS, mix: piece.mix ?? mixRef.current, playForS: lengthS - startAtS });
  }, [warnings, openPlayer]);

  const playNew = (): void => {
    startPiece({ seed: drawSeed(), initialLevel: level, ...sound, startAtS: 0 }, durationMin * SECONDS_PER_MINUTE, null);
    openPlayer();
  };
  const resume = (): void => {
    if (!warnings.isAccepted()) { openPlayer(); return; }
    previewStop.current?.();
    if (current === null) { playNew(); return; }
    if (panelHasPiece.current && phase === 'paused') { playbackRef.current?.start(); return; }
    // Back on the screen, or after a jump while paused, the piece is built again where it stands.
    startPiece({ ...current.piece, startAtS: positionS }, current.lengthS, current.melodyId);
  };
  const restart = (): void => {
    if (current !== null) startPiece({ ...current.piece, startAtS: 0 }, current.lengthS, current.melodyId);
  };
  const playMelody = (melody: Melody, showPlayer = true): void => {
    mixRef.current = { music: melody.musicMix, ambience: melody.ambienceMix };
    startPiece({
      seed: melody.seed, initialLevel: melody.level, instrument: melody.instrument, ambience: melody.ambience,
      profile: melody.profile, startAtS: 0, mix: mixRef.current,
    }, melody.durationMin * SECONDS_PER_MINUTE, melody.id);
    if (showPlayer) openPlayer();
  };

  /** A jump on the time bar. Playing, the piece plays from there; paused, it waits there. */
  const seek = (targetS: number): void => {
    if (current === null || seeking) return;
    const startAtS = clamp(Math.round(targetS), Math.max(0, current.lengthS - 1));
    if (phase === 'playing') {
      startPiece({ ...current.piece, startAtS }, current.lengthS, current.melodyId);
      return;
    }
    setCurrent({ ...current, piece: { ...current.piece, startAtS } });
    setElapsedS(0);
    panelHasPiece.current = false;
    if (phase === 'ended') setPhase('paused');
  };

  const previous = (): void => {
    if (current !== null && positionS > RESTART_INSTEAD_OF_PREVIOUS_S) { seek(0); return; }
    const melody = melodies[queueIndex - 1];
    if (melody !== undefined) playMelody(melody);
  };
  const next = (): void => {
    const melody = melodies[queueIndex + 1];
    if (melody !== undefined) playMelody(melody);
  };

  const changeSound = (choices: SoundChoices): void => {
    setSound(choices);
    rememberInstrument(choices.instrument);
    rememberAmbience(choices.ambience);
  };

  const openSave = (): void => {
    setNotice(null);
    if (melodies.length >= MAX_MELODIES) { setNotice('full'); return; }
    setSaving(true);
  };
  const save = (name: string): void => {
    setSaving(false);
    if (current === null) return;
    const { piece, lengthS } = current;
    const lengthMin = LISTEN_DURATIONS_MIN.find((minutes) => minutes * SECONDS_PER_MINUTE === lengthS) ?? DEFAULT_LISTEN_DURATION_MIN;
    library.save({
      name, seed: piece.seed, instrument: piece.instrument, ambience: piece.ambience, profile: piece.profile,
      level: piece.initialLevel, positionS, durationMin: lengthMin, musicMix: mixRef.current.music, ambienceMix: mixRef.current.ambience,
    }).then(
      (melody) => {
        // The queue may have advanced while IndexedDB was writing the previous piece.
        setCurrent((value) => (value === current ? { ...value, melodyId: melody.id } : value));
        setNotice('saved');
      },
      (error: unknown) => { setNotice(error instanceof MelodyLimitError ? 'full' : 'failed'); },
    );
  };

  const goToTab = (nextTab: ListenTab, melodyId?: string): void => {
    // The tab replaces the entry: Back leaves the screen instead of stepping through its tabs.
    void navigate(listenPath(nextTab, melodyId), { replace: true });
  };

  const removeMelody = (id: string): void => {
    void library.remove(id);
    if (highlightedId === id) {
      const rest = new URLSearchParams(params);
      rest.delete(QUERY_PARAMS.melody);
      setParams(rest, { replace: true });
    }
  };

  // A piece in a world, or a sound chosen by hand; what the player names and the screen is coloured by.
  const shown = current === null ? { ...sound, initialLevel: level } : current.piece;
  const world: WorldId | null = worldOf(shown);
  const worldNames: Readonly<Record<WorldId, string>> = t.plan.worlds.names;
  const instrumentNames: Readonly<Record<InstrumentId, string>> = t.plan.instrument.names;
  const place = world === null ? copy.player.custom : worldNames[world];
  const proposedName = copy.save.defaultName(world === null ? instrumentNames[shown.instrument] : worldNames[world], format.shortDate(new Date().toISOString()));
  const changedSinceStart = current !== null && phase !== 'ready' && savedMelody === null && !sameSound(current, sound, level, durationMin);
  const sessionSound = current === null ? sound : current.piece;

  const pause = useCallback((): void => {
    playbackRef.current?.stop();
    setSeeking(false);
    setPhase((value) => value === 'playing' ? 'paused' : value);
  }, []);
  const exclusive = [ROUTES.session, ROUTES.diagnostics, ROUTES.collect].some((route) => location.pathname === route);
  useEffect(() => {
    let cancelled = false;
    if (exclusive) {
      panelHasPiece.current = false;
      // The panel has unmounted and closed its graph; reflect that asynchronous release.
      queueMicrotask(() => { if (!cancelled) pause(); });
    }
    return () => { cancelled = true; };
  }, [exclusive, pause]);
  const changeMix = useCallback((mix: Readonly<Record<MixTrack, number>>): void => { mixRef.current = mix; }, []);
  const onEngineChange = useCallback((engine: AudioEngine | null): void => {
    setSeeking(false);
    if (engine !== null) { setPhase('playing'); return; }
    setPhase((value) => value === 'playing' ? 'paused' : value);
  }, []);
  const finish = (): void => {
    const following = queueIndex >= 0 ? melodies[queueIndex + 1] : undefined;
    if (autoNext && following !== undefined && !exclusive) playMelody(following, false);
    else setPhase('ended');
  };
  const changeAutoNext = (enabled: boolean): void => {
    setAutoNext(enabled);
    rememberAutoNext(enabled);
  };
  return { copy, tab, expanded, highlightedId, library, melodies, sound, level, durationMin,
    setLevel, setDurationMin, current, phase, positionS, savedMelody, queueIndex, playing, seeking,
    playbackRef, notice, saving, setSaving, shown, world, place, proposedName, changedSinceStart, sessionSound,
    openPlayer, closePlayer, playNew, resume, restart, playMelody, seek, previous, next, changeSound,
    openSave, save, goToTab, removeMelody, pause, onEngineChange, setElapsedS,
    finish, changeMix, controlsHost, setControlsHost, exclusive, autoNext, changeAutoNext, registerPreviewStop };
}
