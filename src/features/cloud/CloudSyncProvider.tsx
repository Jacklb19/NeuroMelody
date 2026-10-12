import { useCallback, useEffect, useMemo, useState } from 'react';
import { env } from '../../config/env';
import { useAuth } from '../account/authContext';
import { readConsent, writeConsent } from '../privacy/consentStore';
import { SessionStoreContext, useSessionStore } from '../records/sessionStoreContext';
import { CloudError, createCloudApi, type CloudApi, type CloudErrorCode } from './cloudApi';
import { CloudSyncContext, type CloudSyncStatus, type CloudSyncValue } from './cloudSyncContext';
import { createMirroredSessionStore } from './mirroredSessionStore';
import { createSyncMarks, syncSessions, type SyncMarks } from './syncSessions';

interface CloudSyncProviderProps {
  readonly children: React.ReactNode;
  /** Base URL of the API; injectable for tests. `null` leaves the app on the device alone. */
  readonly apiBaseUrl?: string | null;
  /** Injectable to test without a network. */
  readonly fetch?: typeof fetch;
}

type Progress = 'idle' | 'syncing' | 'synced' | 'failed';

const errorCode = (cause: unknown): CloudErrorCode => (cause instanceof CloudError ? cause.code : 'unknown');

/**
 * What the mirrored store and the sync read at the moment they act: the API
 * while syncing is on, and the marks of whoever is signed in. It lives
 * outside React's rendering because the store must keep its identity (the
 * session screen ends its recording when the store it holds changes).
 */
class SyncLink {
  api: CloudApi | null = null;
  marks: SyncMarks = createSyncMarks(null);
  #running = false;

  connect(api: CloudApi | null): void {
    this.api = api;
  }

  useMarksOf(userId: string | null): void {
    this.marks = createSyncMarks(userId);
  }

  /** Claims the single sync pass; `false` when one is already running. */
  begin(): boolean {
    if (this.#running) return false;
    this.#running = true;
    return true;
  }

  end(): void {
    this.#running = false;
  }
}

/**
 * Keeps the sessions of this device and of the cloud in step (RF-14) while
 * three things hold: an account, two-step verification passed in this
 * session (ADR-10) and the person's consent (ADR-18). Otherwise the app
 * works exactly as without it. Screens keep using the same session store:
 * the one provided here mirrors what they write.
 */
export function CloudSyncProvider({
  children, apiBaseUrl = env.apiBaseUrl, fetch: send,
}: CloudSyncProviderProps): React.JSX.Element {
  const { state, service } = useAuth();
  const local = useSessionStore();
  const userId = state.kind === 'signed_in' ? state.user.id : null;
  const secondFactorPassed = state.kind === 'signed_in' && state.assurance.current === 'aal2';

  const api = useMemo<CloudApi | null>(() => (
    apiBaseUrl === null || service === null
      ? null
      : createCloudApi({ baseUrl: apiBaseUrl, accessToken: () => service.accessToken(), ...(send === undefined ? {} : { fetch: send }) })
  ), [apiBaseUrl, service, send]);

  // Without an account the consent is the one kept on this device. With one, only the
  // profile counts (ADR-18): until it has been read for this very person, there is none.
  const [deviceConsent, setDeviceConsent] = useState<string | null>(readConsent);
  const [profileConsent, setProfileConsent] = useState<{ readonly userId: string; readonly at: string | null } | null>(null);
  useEffect(() => {
    if (service === null || userId === null) return undefined;
    let cancelled = false;
    service.syncConsent().then((at) => {
      if (!cancelled) setProfileConsent({ userId, at });
    }, () => {
      // Unreadable profile: no consent is assumed, the safe side.
      if (!cancelled) setProfileConsent({ userId, at: null });
    });
    return () => { cancelled = true; };
  }, [service, userId]);
  const consentAt = userId === null ? deviceConsent : profileConsent?.userId === userId ? profileConsent.at : null;

  const active = api !== null && userId !== null && secondFactorPassed && consentAt !== null;
  const [progress, setProgress] = useState<Progress>('idle');
  const [error, setError] = useState<CloudErrorCode | null>(null);
  const [revision, setRevision] = useState(0);

  const fail = useCallback((cause: unknown): void => {
    setError(errorCode(cause));
    setProgress('failed');
  }, []);

  const [{ link, mirrored }] = useState(() => {
    const created = new SyncLink();
    return {
      link: created,
      mirrored: createMirroredSessionStore({
        local,
        marks: () => created.marks,
        cloud: () => created.api,
        onUploadError: fail,
      }),
    };
  });
  useEffect(() => {
    link.connect(active ? api : null);
  }, [link, active, api]);
  useEffect(() => {
    link.useMarksOf(userId);
  }, [link, userId]);

  const syncNow = useCallback(async (): Promise<void> => {
    const current = link.api;
    if (current === null || !link.begin()) return;
    setProgress('syncing');
    try {
      const result = await syncSessions({ api: current, store: local, marks: link.marks });
      if (result.downloaded > 0 || result.removed > 0) setRevision((value) => value + 1);
      setError(null);
      setProgress('synced');
    } catch (cause) {
      fail(cause);
    } finally {
      link.end();
    }
  }, [link, local, fail]);

  // Syncing starts by itself as soon as it becomes possible: after signing in,
  // after the second step, or after giving consent.
  useEffect(() => {
    if (!active) return undefined;
    // Deferred so the link above is already connected by its own effects.
    const id = setTimeout(() => { void syncNow(); }, 0);
    return () => { clearTimeout(id); };
  }, [active, userId, syncNow]);

  const setConsent = useCallback(async (given: boolean): Promise<void> => {
    const now = new Date();
    if (service === null || userId === null) {
      setDeviceConsent(writeConsent(given, now));
      return;
    }
    const at = given ? now.toISOString() : null;
    await service.setSyncConsent(at);
    setProfileConsent({ userId, at });
  }, [service, userId]);

  let status: CloudSyncStatus;
  if (apiBaseUrl === null) status = 'unavailable';
  else if (userId === null) status = 'signed_out';
  else if (!secondFactorPassed) status = 'needs_second_factor';
  else if (consentAt === null) status = 'needs_consent';
  else status = progress === 'idle' ? 'syncing' : progress;

  const value = useMemo<CloudSyncValue>(() => ({
    status, error: status === 'failed' ? error : null, revision, consentAt, setConsent, syncNow, api: userId === null ? null : api,
  }), [status, error, revision, consentAt, setConsent, syncNow, api, userId]);

  return (
    <CloudSyncContext value={value}>
      <SessionStoreContext value={mirrored}>{children}</SessionStoreContext>
    </CloudSyncContext>
  );
}
