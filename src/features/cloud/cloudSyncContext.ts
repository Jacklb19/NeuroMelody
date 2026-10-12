import { createContext, useContext } from 'react';
import type { CloudApi, CloudErrorCode } from './cloudApi';

/**
 * Where syncing with the cloud stands. The first four say why it is off;
 * each has its own sentence and its own way forward.
 */
export const CLOUD_SYNC_STATUS_IDS = [
  /** This deployment has no API configured. */
  'unavailable',
  'signed_out',
  /** Health data in the cloud needs two-step verification (ADR-10). */
  'needs_second_factor',
  /** The person has not agreed to sync (ADR-18). */
  'needs_consent',
  'syncing',
  'synced',
  'failed',
] as const;

export type CloudSyncStatus = (typeof CLOUD_SYNC_STATUS_IDS)[number];

export interface CloudSyncValue {
  readonly status: CloudSyncStatus;
  /** Why the last sync failed, while `status` is `failed`. */
  readonly error: CloudErrorCode | null;
  /** Grows every time a sync changed the history of this device: screens read it again. */
  readonly revision: number;
  /**
   * The instant the person agreed to sync: from their profile when signed in,
   * from this device otherwise. The two are never mixed, so an answer left on
   * a shared device cannot turn syncing on for whoever signs in next.
   */
  readonly consentAt: string | null;
  /** Gives or withdraws the consent; rejects when it could not be stored in the profile. */
  readonly setConsent: (given: boolean) => Promise<void>;
  /** Brings this device and the cloud up to date; does nothing while syncing is off. */
  readonly syncNow: () => Promise<void>;
  /** The API for account actions; `null` when this deployment has none or nobody is signed in. */
  readonly api: CloudApi | null;
}

/** Without a provider (tests, or a deployment without API) the app works on the device alone. */
const DEVICE_ONLY: CloudSyncValue = {
  status: 'unavailable',
  error: null,
  revision: 0,
  consentAt: null,
  setConsent: () => Promise.resolve(),
  syncNow: () => Promise.resolve(),
  api: null,
};

export const CloudSyncContext = createContext<CloudSyncValue>(DEVICE_ONLY);

export function useCloudSync(): CloudSyncValue {
  return useContext(CloudSyncContext);
}
