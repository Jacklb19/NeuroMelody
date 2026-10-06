import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioEngine, type AudioFactory, type EngineOptions } from '../engine/AudioEngine';

export type AudioState = 'idle' | 'loading' | 'playing' | 'stopped' | 'error';

export interface AudioEngineControl {
  /** Current engine; `null` before the first start. */
  readonly engine: () => AudioEngine | null;
  readonly state: AudioState;
  readonly error: string | null;
  readonly start: (options: EngineOptions, volumeDb: number) => Promise<AudioEngine | null>;
  readonly stop: () => Promise<void>;
  /** Closes the engine so a new one is created on the next start (for example, with another output). */
  readonly discard: () => Promise<void>;
}

async function defaultFactory(): Promise<AudioFactory> {
  // Loaded on first start: keeps the audio code out of the initial bundle.
  const factoryModule = await import('../engine/browserFactory');
  return factoryModule.browserFactory;
}

/**
 * Audio engine lifecycle for a component. The context is created on the
 * first start, which always follows a user interaction.
 */
export function useAudioEngine(factory?: AudioFactory): AudioEngineControl {
  const engineRef = useRef<AudioEngine | null>(null);
  const [state, setState] = useState<AudioState>('idle');
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(
    async (options: EngineOptions, volumeDb: number): Promise<AudioEngine | null> => {
      setState('loading');
      setError(null);
      try {
        let engine = engineRef.current;
        if (engine === null || engine.state === 'closed') {
          engine = await AudioEngine.create(factory ?? (await defaultFactory()), options);
          engineRef.current = engine;
        }
        engine.setVolumeDb(volumeDb);
        await engine.start();
        setState('playing');
        return engine;
      } catch (cause) {
        setState('error');
        setError(cause instanceof Error ? cause.message : String(cause));
        return null;
      }
    },
    [factory],
  );

  const stop = useCallback(async (): Promise<void> => {
    const engine = engineRef.current;
    if (engine?.state !== 'playing') {
      return;
    }
    // The 50 ms ramp is already scheduled: the interface reflects the stop right away.
    const stopping = engine.stop();
    setState('stopped');
    await stopping;
  }, []);

  const discard = useCallback(async (): Promise<void> => {
    const engine = engineRef.current;
    engineRef.current = null;
    setState('idle');
    await engine?.close();
  }, []);

  useEffect(
    () => () => {
      void engineRef.current?.close();
      engineRef.current = null;
    },
    [],
  );

  const engine = useCallback(() => engineRef.current, []);
  return { engine, state, error, start, stop, discard };
}
