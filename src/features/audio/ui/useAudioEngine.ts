import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioEngine, type AudioFactory, type EngineOptions } from '../engine/AudioEngine';

export type AudioState = 'inactivo' | 'cargando' | 'sonando' | 'detenido' | 'error';

export interface AudioEngineControl {
  /** Motor actual; `null` antes del primer inicio. */
  readonly engine: () => AudioEngine | null;
  readonly state: AudioState;
  readonly error: string | null;
  readonly start: (options: EngineOptions, volumeDb: number) => Promise<AudioEngine | null>;
  readonly stop: () => Promise<void>;
  /** Cierra el motor para crear uno nuevo en el próximo inicio (por ejemplo, con otra salida). */
  readonly discard: () => Promise<void>;
}

async function defaultFactory(): Promise<AudioFactory> {
  // Se carga al primer inicio: separa el código de audio del paquete inicial.
  const factoryModule = await import('../engine/browserFactory');
  return factoryModule.browserFactory;
}

/**
 * Ciclo de vida del motor de audio para un componente. El contexto se crea
 * en el primer inicio, que siempre ocurre tras una interacción del usuario.
 */
export function useAudioEngine(factory?: AudioFactory): AudioEngineControl {
  const engineRef = useRef<AudioEngine | null>(null);
  const [state, setState] = useState<AudioState>('inactivo');
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(
    async (options: EngineOptions, volumeDb: number): Promise<AudioEngine | null> => {
      setState('cargando');
      setError(null);
      try {
        let engine = engineRef.current;
        if (engine === null || engine.state === 'cerrado') {
          engine = await AudioEngine.create(factory ?? (await defaultFactory()), options);
          engineRef.current = engine;
        }
        engine.setVolumeDb(volumeDb);
        await engine.start();
        setState('sonando');
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
    if (engine?.state !== 'sonando') {
      return;
    }
    // La rampa de 50 ms ya quedó programada: la interfaz refleja la detención de inmediato.
    const stopping = engine.stop();
    setState('detenido');
    await stopping;
  }, []);

  const discard = useCallback(async (): Promise<void> => {
    const engine = engineRef.current;
    engineRef.current = null;
    setState('inactivo');
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
