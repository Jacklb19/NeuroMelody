import { useCallback, useEffect, useState } from 'react';
import { CloudError, type CloudErrorCode } from '../cloud/cloudApi';
import { useCloudSync } from '../cloud/cloudSyncContext';
import type { CollectionRecording } from './collectionRecording';

/**
 * Whether guided recordings can be sent for training from here, or what is
 * missing. They are heartbeats, so the cloud takes them only from a session
 * that passed two-step verification (ADR-10).
 */
export const SHARING_AVAILABILITY_IDS = ['ready', 'unavailable', 'signed_out', 'needs_second_factor'] as const;

export type SharingAvailability = (typeof SHARING_AVAILABILITY_IDS)[number];

export interface RecordingSharing {
  readonly availability: SharingAvailability;
  /** Ids of the recordings already sent; empty until the cloud has answered. */
  readonly sent: ReadonlySet<string>;
  /** Why the last action failed. */
  readonly error: CloudErrorCode | null;
  /** Sends a recording. Calling it states the person's consent to send that one. */
  readonly send: (recording: CollectionRecording) => Promise<void>;
  /** Withdraws a recording from the cloud; rejects when the cloud did not confirm it. */
  readonly withdraw: (id: string) => Promise<void>;
}

const codeOf = (cause: unknown): CloudErrorCode => (cause instanceof CloudError ? cause.code : 'unknown');

/**
 * Sending guided recordings to train the classifier (ADR-33): which were
 * sent, and the two actions on them. Sending is always the person's choice,
 * one recording at a time, and can be undone.
 */
export function useRecordingSharing(): RecordingSharing {
  const { status, api } = useCloudSync();
  let availability: SharingAvailability = 'ready';
  if (status === 'unavailable') availability = 'unavailable';
  else if (api === null || status === 'signed_out') availability = 'signed_out';
  else if (status === 'needs_second_factor') availability = 'needs_second_factor';
  const ready = availability === 'ready' ? api : null;

  const [sent, setSent] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState<CloudErrorCode | null>(null);

  useEffect(() => {
    if (ready === null) return undefined;
    let cancelled = false;
    ready.listSentRecordings().then(
      (ids) => { if (!cancelled) setSent(new Set(ids)); },
      (cause: unknown) => { if (!cancelled) setError(codeOf(cause)); },
    );
    return () => { cancelled = true; };
  }, [ready]);

  const send = useCallback(async (recording: CollectionRecording): Promise<void> => {
    if (ready === null) return;
    try {
      await ready.sendRecording(recording);
      setSent((current) => new Set([...current, recording.id]));
      setError(null);
    } catch (cause) {
      setError(codeOf(cause));
    }
  }, [ready]);

  const withdraw = useCallback(async (id: string): Promise<void> => {
    if (ready === null) return;
    try {
      await ready.withdrawRecording(id);
      setSent((current) => new Set([...current].filter((sentId) => sentId !== id)));
      setError(null);
    } catch (cause) {
      setError(codeOf(cause));
      throw cause;
    }
  }, [ready]);

  return { availability, sent: ready === null ? new Set() : sent, error, send, withdraw };
}
