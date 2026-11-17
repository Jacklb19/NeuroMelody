import { useEffect, useImperativeHandle, type ComponentProps } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthState } from '../account/authContext';
import type { AudioEngine } from '../audio/engine/AudioEngine';
import type { PlaybackPanel } from '../audio/ui/PlaybackPanel';
import { createMelody } from './melody';
import { MemoryMelodyStore } from './melodyStore';
import { MelodyStoreContext } from './melodyStoreContext';
import { ListeningProvider } from './ListeningProvider';
import { useListening } from './listeningContext';
import { AUTO_NEXT_STORAGE_KEY } from './autoNext';
import { readLastPiece } from './lastPiece';
import { WarningsContext } from '../warnings/warningsContext';
import { WarningsRegistry } from '../warnings/warningsRegistry';

type PanelProps = ComponentProps<typeof PlaybackPanel>;
const audio = vi.hoisted(() => ({ starts: vi.fn(), mounts: vi.fn(), closed: vi.fn(), capture: vi.fn<(props: PanelProps) => void>() }));
vi.mock('../audio/ui/PlaybackPanel', () => ({
  PlaybackPanel: function Panel(props: PanelProps) {
    useEffect(() => { audio.mounts(); return () => { audio.closed(); }; }, []);
    useEffect(() => { audio.capture(props); });
    useImperativeHandle(props.ref, () => ({
      start: (piece) => { audio.starts(piece); props.onEngineChange?.({} as AudioEngine); },
      stop: () => { props.onEngineChange?.(null); },
      endQuietly: () => false,
    }));
    return <div data-testid="audio-panel" />;
  },
}));

const signedIn = (id: string): AuthState => ({ kind: 'signed_in', user: { id, email: `${id}@example.test`, name: null }, assurance: { current: 'aal1', next: 'aal1' } });

function Controls(): React.JSX.Element {
  const player = useListening();
  const { setControlsHost } = player;
  const navigate = useNavigate();
  return <>
    <div ref={setControlsHost} />
    <output data-testid="piece">{player.savedMelody?.name ?? 'none'}:{player.phase}</output>
    <button onClick={() => { const first = player.melodies[0]; if (first !== undefined) player.playMelody(first); }}>play</button>
    <button onClick={player.pause}>pause</button>
    <button onClick={() => { player.save('Saved first'); }}>save</button>
    <button onClick={player.next}>next</button>
    <button onClick={() => { void navigate('/history'); }}>history</button>
    <button onClick={() => { void navigate('/session'); }}>session</button>
    <button onClick={() => { player.changeAutoNext(!player.autoNext); }}>toggle</button>
  </>;
}

async function setup(accepted = true) {
  const warnings = new WarningsRegistry(null);
  if (accepted) warnings.accept(new Date());
  const store = new MemoryMelodyStore();
  const content = { seed: 42, instrument: 'piano', ambience: 'rain', profile: 'original', level: 'target', positionS: 0, durationMin: 30, musicMix: 1, ambienceMix: 1 } as const;
  await store.put(createMelody({ ...content, name: 'Second' }, 'one', new Date('2026-11-15')));
  await store.put(createMelody({ ...content, name: 'First' }, 'one', new Date('2026-11-16')));
  const view = (state: AuthState): React.JSX.Element => (
    <WarningsContext value={warnings}>
    <AuthContext value={{ state, service: null, refresh: () => Promise.resolve(), finishRecovery: () => Promise.resolve() }}>
      <MelodyStoreContext value={store}>
        <MemoryRouter initialEntries={['/listen']}><ListeningProvider><Controls /></ListeningProvider></MemoryRouter>
      </MelodyStoreContext>
    </AuthContext>
    </WarningsContext>
  );
  const rendered = render(view(signedIn('one')));
  await waitFor(() => { expect(audio.capture).toHaveBeenCalled(); });
  return { ...rendered, view, store };
}

beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); });

describe('listening lifetime and queue', () => {
  it('cannot start through global controls until the warnings have been accepted', async () => {
    await setup(false);
    fireEvent.click(screen.getByText('play'));
    expect(audio.starts).not.toHaveBeenCalled();
    expect(screen.getByTestId('piece')).toHaveTextContent('none:ready');
  });
  it('keeps one audio panel on navigation and pauses before a measured session', async () => {
    await setup();
    fireEvent.click(screen.getByText('play'));
    await waitFor(() => { expect(screen.getByTestId('piece')).toHaveTextContent('First:playing'); });
    fireEvent.click(screen.getByText('history'));
    expect(screen.getByTestId('piece')).toHaveTextContent('First:playing');
    expect(audio.mounts).toHaveBeenCalledTimes(1);
    expect(audio.closed).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('session'));
    await waitFor(() => { expect(screen.getByTestId('piece')).toHaveTextContent('First:paused'); });
    expect(audio.closed).toHaveBeenCalledOnce();
  });

  it('advances once to the next melody and stops at the end of the queue', async () => {
    await setup();
    fireEvent.click(screen.getByText('play'));
    act(() => { audio.capture.mock.lastCall?.[0].onFinished?.(); });
    expect(screen.getByTestId('piece')).toHaveTextContent('Second:playing');
    expect(audio.starts.mock.lastCall?.[0]).toMatchObject({ startAtS: 0 });
    act(() => { audio.capture.mock.lastCall?.[0].onFinished?.(); });
    expect(screen.getByTestId('piece')).toHaveTextContent('Second:ended');
    expect(audio.starts).toHaveBeenCalledTimes(2);
  });

  it('remembers disabling automatic advance and leaves the finished melody alone', async () => {
    await setup();
    fireEvent.click(screen.getByText('toggle'));
    expect(localStorage.getItem(AUTO_NEXT_STORAGE_KEY)).toBe('false');
    fireEvent.click(screen.getByText('play'));
    act(() => { audio.capture.mock.lastCall?.[0].onFinished?.(); });
    expect(screen.getByTestId('piece')).toHaveTextContent('First:ended');
    expect(audio.starts).toHaveBeenCalledOnce();
  });

  it('does not attach a late save of the previous piece to the next melody', async () => {
    const { store } = await setup();
    const put = store.put.bind(store);
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    vi.spyOn(store, 'put').mockImplementationOnce((melody) => gate.then(() => put(melody)));
    fireEvent.click(screen.getByText('play'));
    fireEvent.click(screen.getByText('save'));
    fireEvent.click(screen.getByText('next'));
    await act(async () => { release?.(); await gate; });
    await waitFor(async () => { expect(await store.list('one')).toHaveLength(3); });
    expect(screen.getByTestId('piece')).toHaveTextContent('Second:playing');
  });

  it.each(['signout', 'replace'] as const)('closes and forgets playback on account %s', async (change) => {
    const { rerender, view } = await setup();
    fireEvent.click(screen.getByText('play'));
    await waitFor(() => { expect(readLastPiece('one')).not.toBeNull(); });
    rerender(view(change === 'signout' ? { kind: 'signed_out' } : signedIn('two')));
    expect(readLastPiece('one')).toBeNull();
    expect(screen.getByTestId('piece')).toHaveTextContent('none:ready');
    expect(audio.closed).toHaveBeenCalledOnce();
  });
});
