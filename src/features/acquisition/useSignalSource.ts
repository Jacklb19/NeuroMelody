import { useMemo, useSyncExternalStore } from 'react';
import type { ConnectionState, SignalSource, BeatNotification } from '../acquisition/contract';

/** What the interface needs to know about a signal source. */
export interface SourceReading {
  readonly state: ConnectionState;
  readonly last: BeatNotification | null;
  /** RR intervals received since connection. */
  readonly receivedBeats: number;
  /** Last error reported; the interface turns its code into text. */
  readonly error: Error | null;
}

interface ReadingStore {
  readonly subscribe: (onStoreChange: () => void) => () => void;
  readonly read: () => SourceReading;
}

const READING_WITHOUT_SOURCE: SourceReading = {
  state: 'disconnected',
  last: null,
  receivedBeats: 0,
  error: null,
};

const STORE_WITHOUT_SOURCE: ReadingStore = {
  subscribe: () => () => undefined,
  read: () => READING_WITHOUT_SOURCE,
};

/**
 * Adapts a source to React's external store model: every event creates a new,
 * immutable reading, and `read` keeps returning the same reference while
 * nothing changes.
 */
function createReadingStore(source: SignalSource): ReadingStore {
  let reading: SourceReading = { ...READING_WITHOUT_SOURCE, state: source.state };

  return {
    subscribe: (onStoreChange) => {
      // The source may have changed state between creating the store and
      // subscribing; React reads again after subscribing and notices it.
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
          reading = { ...reading, error };
          onStoreChange();
        },
      });
    },
    read: () => reading,
  };
}

/** Subscribes the component to a signal source (or to none, with `null`). */
export function useSignalSource(source: SignalSource | null): SourceReading {
  const store = useMemo(
    () => (source === null ? STORE_WITHOUT_SOURCE : createReadingStore(source)),
    [source],
  );
  return useSyncExternalStore(store.subscribe, store.read);
}
