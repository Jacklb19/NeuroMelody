import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createFakeAudioEnvironment } from '../../../test/fakeAudio';
import { DEFAULT_VOLUME_DB, type EngineOptions } from '../engine/AudioEngine';
import { useAudioEngine } from './useAudioEngine';

const options: EngineOptions = { seed: 7, initialLevel: 'intermediate', outputThroughAudioElement: false };

describe('useAudioEngine interruptions', () => {
  it('reflects a system interruption and resumes only on a user start or an actual running event', async () => {
    const env = createFakeAudioEnvironment();
    const { result } = renderHook(() => useAudioEngine(env.factory));
    await act(async () => { await result.current.start(options, DEFAULT_VOLUME_DB); });
    expect(result.current.state).toBe('playing');
    act(() => { env.context.state = 'interrupted'; env.context.dispatchEvent(new Event('statechange')); });
    expect(result.current.state).toBe('interrupted');
    expect(env.context.state).toBe('interrupted');
    await act(async () => { await result.current.start(options, DEFAULT_VOLUME_DB); });
    expect(result.current.state).toBe('playing');
    expect(env.worklets).toHaveLength(2);
  });

  it('stays stopped and silent when the system resumes after Stop during an interruption', async () => {
    const env = createFakeAudioEnvironment();
    const { result } = renderHook(() => useAudioEngine(env.factory));
    await act(async () => { await result.current.start(options, DEFAULT_VOLUME_DB); });
    act(() => { env.context.state = 'suspended'; env.context.dispatchEvent(new Event('statechange')); });
    await act(async () => { await result.current.stop(); });
    expect(result.current.state).toBe('stopped');
    const envelope = env.context.nodes.filter(node => node.kind === 'gain')[2] as unknown as { gain: { events: { kind: string; value: number }[] } };
    expect(envelope.gain.events.at(-1)).toMatchObject({ kind: 'set', value: 0 });
    await act(async () => { await env.context.resume(); });
    expect(result.current.state).toBe('stopped');
  });

  it('reflects a context closed by the system', async () => {
    const env = createFakeAudioEnvironment();
    const { result } = renderHook(() => useAudioEngine(env.factory));
    await act(async () => { await result.current.start(options, DEFAULT_VOLUME_DB); });
    await act(async () => { await env.context.close(); });
    expect(result.current.state).toBe('stopped');
    expect(result.current.engine()?.state).toBe('closed');
  });

  it('releases the context when an alternative output refuses playback', async () => {
    const env = createFakeAudioEnvironment();
    env.element.play = () => Promise.reject(new DOMException('Playback refused', 'NotAllowedError'));
    const { result } = renderHook(() => useAudioEngine(env.factory));
    await act(async () => { await result.current.start({ ...options, outputThroughAudioElement: true }, DEFAULT_VOLUME_DB); });
    expect(result.current.state).toBe('error');
    expect(result.current.engine()).toBeNull();
    expect(env.context.state).toBe('closed');
    expect(env.element.playing).toBe(false);
  });

  it('closes a context when loading its worklet fails', async () => {
    const env = createFakeAudioEnvironment();
    env.context.audioWorklet.addModule = () => Promise.reject(new Error('Module unavailable'));
    const { result } = renderHook(() => useAudioEngine(env.factory));
    await act(async () => { await result.current.start(options, DEFAULT_VOLUME_DB); });
    expect(result.current.state).toBe('error');
    expect(env.context.state).toBe('closed');
  });

  it('closes a context whose setup finishes after its owner unmounts', async () => {
    const env = createFakeAudioEnvironment();
    let release: (() => void) | undefined;
    const loaded = new Promise<void>(resolve => { release = resolve; });
    env.context.audioWorklet.addModule = () => loaded;
    const { result, unmount } = renderHook(() => useAudioEngine(env.factory));
    let starting: ReturnType<typeof result.current.start> | undefined;
    act(() => { starting = result.current.start(options, DEFAULT_VOLUME_DB); });
    unmount();
    release?.();
    expect(await starting).toBeNull();
    expect(env.context.state).toBe('closed');
  });

  it('does not play after Stop arrives while the worklet is loading', async () => {
    const env = createFakeAudioEnvironment();
    let release: (() => void) | undefined;
    const loaded = new Promise<void>(resolve => { release = resolve; });
    env.context.audioWorklet.addModule = () => loaded;
    const { result } = renderHook(() => useAudioEngine(env.factory));
    let starting: ReturnType<typeof result.current.start> | undefined;
    act(() => { starting = result.current.start(options, DEFAULT_VOLUME_DB); });
    await act(async () => { await result.current.stop(); });
    release?.();
    expect(await starting).toBeNull();
    expect(result.current.state).toBe('stopped');
    expect(env.context.state).toBe('closed');
  });
});
