import { useCallback, useEffect, useRef, useState } from 'react';
import { useMessages } from '../../../i18n/messages';
import { DEFAULT_VOLUME_DB, type EngineOptions } from '../engine/AudioEngine';
import { useAudioEngine } from './useAudioEngine';

const PREVIEW_SECONDS = 8;
const PREVIEW_FADE_SECONDS = 1;
const CLEANUP_POLL_MS = 250;

/** Plays the chosen starting sound on demand and frees the graph after its audio-clock fade. */
export function AudioPreview({ options }: { readonly options: Omit<EngineOptions, 'seed' | 'outputThroughAudioElement'> }): React.JSX.Element {
  const copy = useMessages().listeningTools;
  const { start, engine, stop, discard, state, error } = useAudioEngine();
  const end = useRef<number | null>(null);
  const stopPending = useRef(false);
  const [stopping, setStopping] = useState(false);
  const active = state === 'loading' || state === 'playing' || state === 'interrupted';

  const stopPreview = useCallback(async (): Promise<void> => {
    if (stopPending.current) return;
    stopPending.current = true;
    end.current = null;
    setStopping(true);
    try {
      await stop();
      await discard();
    } finally {
      stopPending.current = false;
      setStopping(false);
    }
  }, [stop, discard]);

  useEffect(() => {
    if (!active) return undefined;
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') void stopPreview();
    };
    const cleanup = setInterval(() => {
      const current = engine();
      // The fade has already happened on the audio clock. The timer only frees resources.
      if (end.current !== null && current !== null && current.audioTime >= end.current) {
        end.current = null;
        void discard();
      }
    }, CLEANUP_POLL_MS);
    document.addEventListener('keydown', handleKey);
    return () => {
      clearInterval(cleanup);
      document.removeEventListener('keydown', handleKey);
    };
  }, [active, discard, engine, stopPreview]);

  return (
    <div className="action-row">
      <button type="button" className="pill-button pill-button-ghost" disabled={stopping} onClick={() => {
        if (active) {
          void stopPreview();
          return;
        }
        void start({ ...options, seed: 0, outputThroughAudioElement: false }, DEFAULT_VOLUME_DB).then((current) => {
          if (current !== null) end.current = current.scheduleFinalFade(PREVIEW_SECONDS - PREVIEW_FADE_SECONDS, PREVIEW_FADE_SECONDS);
        });
      }}>{active ? copy.previewStop : copy.preview}</button>
      {state === 'loading' && <span role="status">{copy.previewLoading}</span>}
      {error !== null && <span role="alert">{copy.previewFailed}</span>}
    </div>
  );
}
