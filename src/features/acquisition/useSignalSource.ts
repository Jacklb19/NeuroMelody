import { useMemo, useSyncExternalStore } from 'react';
import type { ConnectionState, SignalSource, BeatNotification } from '../acquisition/contract';

/** Lo que la interfaz necesita saber de una fuente de señal. */
export interface SourceReading {
  readonly state: ConnectionState;
  readonly last: BeatNotification | null;
  /** Intervalos RR recibidos desde la conexión. */
  readonly receivedBeats: number;
  readonly error: string | null;
}

interface ReadingStore {
  readonly subscribe: (onStoreChange: () => void) => () => void;
  readonly read: () => SourceReading;
}

const READING_WITHOUT_SOURCE: SourceReading = {
  state: 'desconectada',
  last: null,
  receivedBeats: 0,
  error: null,
};

const STORE_WITHOUT_SOURCE: ReadingStore = {
  subscribe: () => () => undefined,
  read: () => READING_WITHOUT_SOURCE,
};

/**
 * Adapta una fuente al modelo de almacén externo de React: cada evento crea
 * una lectura nueva e inmutable, y `leer` devuelve siempre la misma
 * referencia mientras no haya cambios.
 */
function createReadingStore(source: SignalSource): ReadingStore {
  let reading: SourceReading = { ...READING_WITHOUT_SOURCE, state: source.state };

  return {
    subscribe: (onStoreChange) => {
      // La fuente pudo cambiar de estado entre la creación del almacén y la
      // suscripción; React vuelve a leer tras suscribirse y lo detecta.
      if (reading.state !== source.state) {
        reading = { ...reading, state: source.state };
      }
      return source.subscribe({
        onNotification: (notification) => {
          reading = {
            ...reading,
            last: notification,
            receivedBeats: reading.receivedBeats + notification.rrIntervalsMs.length,
          };
          onStoreChange();
        },
        onStateChange: (state) => {
          reading = { ...reading, state };
          onStoreChange();
        },
        onError: (error) => {
          reading = { ...reading, error: error.message };
          onStoreChange();
        },
      });
    },
    read: () => reading,
  };
}

/** Suscribe el componente a una fuente de señal (o a ninguna, con `null`). */
export function useSignalSource(source: SignalSource | null): SourceReading {
  const store = useMemo(
    () => (source === null ? STORE_WITHOUT_SOURCE : createReadingStore(source)),
    [source],
  );
  return useSyncExternalStore(store.subscribe, store.read);
}
