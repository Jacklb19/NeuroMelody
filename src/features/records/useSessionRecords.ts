import { useEffect, useState } from 'react';
import { SECONDS_PER_MINUTE } from '../../shared/time';
import type { SessionRecord } from './sessionRecord';
import { useSessionStore } from './sessionStoreContext';

/**
 * Sessions stored on this device, newest first; `null` while they load.
 * A store that cannot be read counts as empty: the screens that use this
 * (home, profile) show activity, and the history explains real failures.
 */
export function useSessionRecords(): readonly SessionRecord[] | null {
  const store = useSessionStore();
  const [records, setRecords] = useState<readonly SessionRecord[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    store.list().then(
      (list) => { if (!cancelled) setRecords(list); },
      () => { if (!cancelled) setRecords([]); },
    );
    return () => { cancelled = true; };
  }, [store]);
  return records;
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
