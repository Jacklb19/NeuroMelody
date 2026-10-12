/** English copy of syncing with the account (RF-14, ADR-10, ADR-18). Plain words: where the sessions are and why. */
export const cloud = {
  /** Keys mirror `CloudSyncStatus`, except `failed`, which carries its reason. */
  status: {
    unavailable: 'Your sessions are saved only on this device.',
    signed_out: 'Your sessions are only on this device. With an account you can have them in the cloud too.',
    needs_second_factor: 'Your sessions are only on this device. Saving them in the cloud needs two-step verification.',
    needs_consent: 'Your sessions are only on this device. Saving them in the cloud needs your consent.',
    syncing: 'Syncing with your account…',
    synced: 'Your sessions are on this device and in your account.',
  },
  /** Link that solves each reason for not syncing; keys mirror the statuses that have one. */
  actions: {
    signed_out: 'Sign in',
    needs_second_factor: 'Go to your profile',
    needs_consent: 'Go to privacy',
  },
  /** `reason` is one of `errors`. */
  failed: (reason: string): string => `Could not sync: ${reason} Your sessions are still on this device.`,
  retry: 'Try again',
  /** Keys mirror `CloudErrorCode`. */
  errors: {
    unauthenticated: 'your session expired; sign in again.',
    second_factor_required: 'two-step verification is missing.',
    consent_required: 'your sync consent is missing.',
    session_conflict: 'a session already exists under another account.',
    not_found: 'the session is no longer in the cloud.',
    invalid_request: 'a session is not in a format the service accepts.',
    language_model_unavailable: 'the automatic text is not available right now.',
    storage_unavailable: 'the service is not responding right now.',
    network: 'there is no connection.',
    unknown: 'an unexpected error occurred.',
  },
  /** Sessions already deleted from this device whose deletion has not reached the account yet (HU-09). */
  pendingDeletions: (count: number): string =>
    count === 1
      ? 'One session you deleted here has not been deleted from your account yet: it will be once you are online.'
      : `${String(count)} sessions you deleted here have not been deleted from your account yet: they will be once you are online.`,
};
