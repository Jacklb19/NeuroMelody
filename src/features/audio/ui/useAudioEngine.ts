import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioEngine, type AudioFactory, type EngineOptions } from '../engine/AudioEngine';
import { AudioEngineError } from '../engine/AudioEngineError';

export type AudioState = 'idle' | 'loading' | 'playing' | 'interrupted' | 'stopped' | 'error';

/**
 * Why the last start failed. The engine's own failures carry a code the
 * interface translates; anything else (usually the browser refusing Web
 * Audio) only has the text the browser gave.
 */
export type AudioStartFailure =
  | { readonly kind: 'engine'; readonly error: AudioEngineError }
  | { readonly kind: 'browser'; readonly detail: string };

export interface AudioEngineControl {
  /** Current engine; `null` before the first start. */
  readonly engine: () => AudioEngine | null;
  readonly state: AudioState;
  readonly error: AudioStartFailure | null;
  readonly start: (options: EngineOptions, volumeDb: number) => Promise<AudioEngine | null>;
  readonly stop: () => Promise<void>;
  /** Closes the engine so a new one is created on the next start (for example, with another output). */
  readonly discard: () => Promise<void>;
}

function toStartFailure(cause: unknown): AudioStartFailure {
  if (cause instanceof AudioEngineError) {
    return { kind: 'engine', error: cause };
  }
  return { kind: 'browser', detail: cause instanceof Error ? cause.message : String(cause) };
}

async function defaultFactory(): Promise<AudioFactory> {
  // Loaded on first start: keeps the audio code out of the initial bundle.
  const factoryModule = await import('../engine/browserFactory');
  return factoryModule.browserFactory;
}

/**
 * Audio engine lifecycle for a component. The audio output is opened while
 * the component mounts, ahead of the first start, and the music starts on a
 * user interaction.
 */
export function useAudioEngine(factory?: AudioFactory): AudioEngineControl {
  const engineRef = useRef<AudioEngine | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const generationRef = useRef(0);
  const [state, setState] = useState<AudioState>('idle');
  const [error, setError] = useState<AudioStartFailure | null>(null);

  // Opens the output once the screen has drawn, and closes it if no session used it.
  useEffect(() => {
    let chosen: AudioFactory | null = null;
    let cancelled = false;
    const timer = setTimeout(() => {
      void (factory === undefined ? defaultFactory() : Promise.resolve(factory)).then((ready) => {
        if (cancelled) return;
        chosen = ready;
        ready.prewarm?.();
      });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      chosen?.release?.();
    };
  }, [factory]);

  const start = useCallback(
    async (options: EngineOptions, volumeDb: number): Promise<AudioEngine | null> => {
      const generation = generationRef.current;
      setState('loading');
      setError(null);
      try {
        let engine = engineRef.current;
        if (engine === null || engine.state === 'closed') {
          engine = await AudioEngine.create(factory ?? (await defaultFactory()), options);
          if (generation !== generationRef.current) {
            await engine.close();
            return null;
          }
          engineRef.current = engine;
          unsubscribeRef.current?.();
          const observed = engine;
          unsubscribeRef.current = engine.subscribeContextState(() => {
            if (engineRef.current !== observed) return;
            if (observed.contextState === 'closed') { setState('stopped'); return; }
            if (observed.state !== 'playing') return;
            setState(observed.contextState === 'running' ? 'playing' : 'interrupted');
          });
        }
        engine.setVolumeDb(volumeDb);
        await engine.start();
        if (generation !== generationRef.current) {
          await engine.close();
          return null;
        }
        if (engine.contextState === 'closed') { setState('stopped'); return null; }
        setState(engine.contextState === 'running' ? 'playing' : 'interrupted');
        return engine;
      } catch (cause) {
        if (generation !== generationRef.current) return null;
        const failed = engineRef.current;
        engineRef.current = null;
        unsubscribeRef.current?.();
        unsubscribeRef.current = null;
        await failed?.close();
        if (generation !== generationRef.current) return null;
        setState('error');
        setError(toStartFailure(cause));
        return null;
      }
    },
    [factory],
  );

  const stop = useCallback(async (): Promise<void> => {
    // System media controls can stop a session while its modules are still loading.
    generationRef.current++;
    const engine = engineRef.current;
    if (engine?.state !== 'playing') {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      engineRef.current = null;
      setState('stopped');
      await engine?.close();
      return;
    }
    // The 50 ms ramp is already scheduled: the interface reflects the stop right away.
    const stopping = engine.stop();
    setState('stopped');
    await stopping;
  }, []);

  const discard = useCallback(async (): Promise<void> => {
    generationRef.current++;
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    const engine = engineRef.current;
    engineRef.current = null;
    setState('idle');
    await engine?.close();
  }, []);

  useEffect(
    () => () => {
      generationRef.current++;
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      void engineRef.current?.close();
      engineRef.current = null;
    },
    [],
  );

  const engine = useCallback(() => engineRef.current, []);
  return { engine, state, error, start, stop, discard };
}
