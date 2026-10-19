import { useEffect, useState } from 'react';
import { SECONDS_PER_MINUTE } from '../../shared/time';
import { useCloudSync } from '../cloud/cloudSyncContext';
import type { SessionRecord } from './sessionRecord';
import { useSessionStore } from './sessionStoreContext';

/**
 * Sessions stored on this device, newest first; `null` while they load.
 * A store that cannot be read counts as empty: the screens that use this
 * (home, profile) show activity, and the history explains real failures.
 */
export function useSessionRecords(): readonly SessionRecord[] | null {
  return useSessionHistory().records;
}

/** Comparisons distinguish an unreadable store from a history with no sessions. */
export function useSessionHistory(): { readonly records: readonly SessionRecord[] | null; readonly failure: { readonly cause: unknown } | null } {
  const store = useSessionStore();
  // A sync that brought or removed sessions makes the list be read again.
  const { revision } = useCloudSync();
  const [loaded, setLoaded] = useState<{
    readonly store: typeof store;
    readonly revision: number;
    readonly records: readonly SessionRecord[];
    readonly failure: { readonly cause: unknown } | null;
  } | null>(null);
  useEffect(() => {
    let cancelled = false;
    store.list().then(
      (records) => { if (!cancelled) setLoaded({ store, revision, records, failure: null }); },
      (cause: unknown) => { if (!cancelled) setLoaded({ store, revision, records: [], failure: { cause } }); },
    );
    return () => { cancelled = true; };
  }, [store, revision]);
  return loaded?.store === store && loaded.revision === revision ? loaded : { records: null, failure: null };
}

/** Activity at a glance. */
export interface SessionTotals {
  readonly count: number;
  /** Whole minutes listened across every session. */
  readonly minutes: number;
  readonly last: SessionRecord | null;
}

export function sessionTotals(records: readonly SessionRecord[]): SessionTotals {
  const seconds = records.reduce((sum, record) => sum + record.listenedSeconds, 0);
  return { count: records.length, minutes: Math.floor(seconds / SECONDS_PER_MINUTE), last: records[0] ?? null };
}
