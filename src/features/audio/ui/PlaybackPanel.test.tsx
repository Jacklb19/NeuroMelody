import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { APP_NAME } from '../../../config/app';
import { es } from '../../../i18n/es';
import { SECONDS_PER_MINUTE } from '../../../shared/time';
import { createFakeAudioEnvironment, type FakeParam } from '../../../test/fakeAudio';
import { dbToGain } from '../core/decibels';
import { MODE } from '../core/theory';
import { DEFAULT_VOLUME_DB, type AudioFactory } from '../engine/AudioEngine';
import { CLOCK_CHECK_INTERVAL_MS, CONTINUOUS_WARNING_PERIOD_S, RESPONSE_WAIT_S } from '../session/durationWarnings';
import { PlaybackPanel } from './PlaybackPanel';
import { STOP_SHORTCUT_KEY } from './stopShortcut';

const copy = es.audio.playback;

function setup(durationMin = 10) {
  const env = createFakeAudioEnvironment();
  const view = render(
    <PlaybackPanel durationMin={durationMin} factory={env.factory} generateSeed={() => 42} />,
  );
  const gains = () =>
    env.context.nodes.filter((n) => n.kind === 'gain') as unknown as { gain: FakeParam }[];
  // Creation order in AudioEngine: reverb, volume, envelope.
  const envelope = () => gains()[2]?.gain;
  const volume = () => gains()[1]?.gain;
  return { env, view, envelope, volume };
}

const state = () => screen.getByRole('status').textContent;
const stopButton = () => screen.getByRole('button', { name: copy.stop });

async function start() {
  fireEvent.click(screen.getByRole('button', { name: copy.start }));
  // With setInterval faked, waitFor only re-checks on DOM changes; under a loaded
  // parallel run the start chain can take longer than the default 1 s.
  await waitFor(
    () => {
      expect(state()).toContain(copy.states.playing);
    },
    { timeout: 5000 },
  );
  // Passive effects (the check interval) may still be pending after the DOM update.
  await act(async () => {
    await Promise.resolve();
  });
}

function advanceOneCheck() {
  act(() => {
    vi.advanceTimersByTime(CLOCK_CHECK_INTERVAL_MS);
  });
}

describe('PlaybackPanel', () => {
  beforeEach(() => {
    // Only the check interval is faked; waitFor keeps using the real setTimeout.
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the moderate volume notice and an always visible Stop button', () => {
    setup();
    expect(screen.getByText(copy.volumeNotice)).toBeInTheDocument();
    expect(stopButton()).toBeVisible();
    expect(stopButton()).toBeDisabled();
    expect(stopButton()).toHaveAttribute('aria-keyshortcuts', STOP_SHORTCUT_KEY);
    expect(state()).toBe(`${copy.statusLabel} ${copy.states.idle}`);
  });

  it('starts at the calibration level at −12 dB and schedules the final fade on the audio clock', async () => {
    const { env, envelope, volume } = setup(10);
    await start();

    const synthesizer = env.worklets[0];
    expect(synthesizer?.options.processorOptions).toEqual({ seed: 42, initialMode: MODE.lydian, initialLayers: 2 });
    expect(DEFAULT_VOLUME_DB).toBe(-12);
    expect(volume()?.value).toBeCloseTo(dbToGain(DEFAULT_VOLUME_DB), 10);
    expect(stopButton()).toBeEnabled();
    // 10 min plan: warning at 600 s; without an answer, fade from 720 to 740 s.
    expect(envelope()?.events.slice(-2)).toEqual([
      { kind: 'set', value: 1, time: 720 },
      { kind: 'linear', value: 0, time: 740 },
    ]);
  });

  it('adjusts the volume within range and shows it', async () => {
    const { volume } = setup();
    await start();
    fireEvent.change(screen.getByLabelText(copy.volume), { target: { value: '-20' } });
    const shown = es.common.withUnit('-20', es.common.units.decibels);
    expect(shown).toBe('-20 dB');
    expect(screen.getByText(shown)).toBeInTheDocument();
    expect(screen.getByLabelText(copy.volume)).toHaveAttribute('aria-valuetext', shown);
    expect(volume()?.last('target')?.value).toBeCloseTo(dbToGain(-20), 10);
  });

  it('the Escape key stops with a 50 ms ramp (HU-06)', async () => {
    const { env, envelope } = setup();
    await start();
    env.context.currentTime = 30;
    fireEvent.keyDown(document, { key: STOP_SHORTCUT_KEY });

    expect(state()).toContain(copy.states.stopped);
    expect(envelope()?.last('linear')).toEqual({ kind: 'linear', value: 0, time: 30.05 });
    // Suspending does not change the DOM: waitFor would not re-check with a faked setInterval.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(env.context.state).toBe('suspended');
  });

  it('the fixed Stop button stops the music', async () => {
    setup();
    await start();
    fireEvent.click(stopButton());
    expect(state()).toContain(copy.states.stopped);
  });

  it('warns when the plan ends, and Escape does not stop while the warning is open', async () => {
    const { env } = setup(10);
    await start();
    env.context.currentTime = 600;
    advanceOneCheck();

    const warning = screen.getByRole('alertdialog', { name: copy.planEndedTitle });
    expect(RESPONSE_WAIT_S / SECONDS_PER_MINUTE).toBe(2);
    expect(warning).toHaveTextContent(copy.fadeNotice(RESPONSE_WAIT_S / SECONDS_PER_MINUTE));
    expect(screen.getByRole('button', { name: copy.continue })).toHaveFocus();

    fireEvent.keyDown(document, { key: STOP_SHORTCUT_KEY });
    expect(state()).toContain(copy.states.playing);
  });

  it('continue cancels the fade and schedules the next warning at 60 minutes', async () => {
    const { env, envelope } = setup(10);
    await start();
    env.context.currentTime = 600;
    advanceOneCheck();

    fireEvent.click(screen.getByRole('button', { name: copy.continue }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(envelope()?.last('cancel')?.time).toBe(600);
    expect(envelope()?.events.slice(-2)).toEqual([
      { kind: 'set', value: 1, time: 3720 },
      { kind: 'linear', value: 0, time: 3740 },
    ]);

    env.context.currentTime = 3600;
    advanceOneCheck();
    expect(CONTINUOUS_WARNING_PERIOD_S / SECONDS_PER_MINUTE).toBe(60);
    expect(
      screen.getByRole('alertdialog', {
        name: copy.continuousListeningTitle(CONTINUOUS_WARNING_PERIOD_S / SECONDS_PER_MINUTE),
      }),
    ).toBeInTheDocument();
  });

  it('without an answer, the session ends when the fade finishes', async () => {
    const { env } = setup(10);
    await start();
    env.context.currentTime = 600;
    advanceOneCheck();
    env.context.currentTime = 740;
    advanceOneCheck();

    expect(state()).toContain(copy.finished);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('finishing from the warning stops the session', async () => {
    const { env } = setup(10);
    await start();
    env.context.currentTime = 600;
    advanceOneCheck();
    fireEvent.click(screen.getByRole('button', { name: copy.finish }));
    expect(state()).toContain(copy.finished);
  });

  it('reports when the audio cannot start', async () => {
    const env = createFakeAudioEnvironment();
    const factory = {
      ...env.factory,
      createAudioContext: () => {
        throw new Error('AudioContext no disponible');
      },
    };
    render(<PlaybackPanel durationMin={20} factory={factory} />);
    fireEvent.click(screen.getByRole('button', { name: copy.start }));
    await waitFor(() => {
      expect(state()).toContain(copy.states.error);
    });
    expect(screen.getByText(copy.unavailable('AudioContext no disponible'))).toBeInTheDocument();
  });

  it('translates the engine error code instead of showing its developer message', async () => {
    const env = createFakeAudioEnvironment();
    const factory: AudioFactory = {
      ...env.factory,
      createWorkletNode: (context, name, options) => {
        const node = env.factory.createWorkletNode(context, name, options);
        env.worklets.at(-1)?.parameters.delete('mode');
        return node;
      },
    };
    render(<PlaybackPanel durationMin={20} factory={factory} />);
    fireEvent.click(screen.getByRole('button', { name: copy.start }));
    await waitFor(() => {
      expect(state()).toContain(copy.states.error);
    });
    const message = copy.unavailable(es.audio.errors.missing_parameter({ parameter: 'mode' }));
    expect(message).toBe('El audio no está disponible en este navegador (El sintetizador no expone el parámetro mode.).');
    expect(screen.getByText(message)).toBeInTheDocument();
  });
});

describe('PlaybackPanel with Media Session', () => {
  const handlers = new Map<string, (() => void) | null>();
  const session = {
    playbackState: 'none' as MediaSessionPlaybackState,
    metadata: null as MediaMetadata | null,
    setActionHandler: (action: string, handler: (() => void) | null) => {
      handlers.set(action, handler);
    },
  };

  beforeEach(() => {
    Object.defineProperty(navigator, 'mediaSession', { value: session, configurable: true });
  });
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'mediaSession');
    handlers.clear();
    vi.unstubAllGlobals();
  });

  it('registers pause and stop, mirrors the state and stops from the system', async () => {
    vi.stubGlobal('MediaMetadata', class {
      constructor(readonly init: MediaMetadataInit) {}
    });
    setup();
    expect(handlers.has('pause')).toBe(true);
    expect(handlers.has('stop')).toBe(true);
    expect(session.metadata).toMatchObject({ init: { title: APP_NAME, artist: copy.mediaArtist } });

    await start();
    expect(session.playbackState).toBe('playing');

    act(() => {
      handlers.get('stop')?.();
    });
    expect(state()).toContain(copy.states.stopped);
    expect(session.playbackState).toBe('paused');
  });
});
