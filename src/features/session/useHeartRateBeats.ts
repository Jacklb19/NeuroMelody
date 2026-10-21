import { useEffect, useRef } from 'react';
import { MS_PER_MINUTE } from '../../shared/time';

/**
 * Calls `onBeat` at the pace of `heartRate`, for a watch that sends the pulse
 * but no beats (ADR-51), so the orb still beats with the person. Visual only:
 * nothing audible depends on it. Paused while `heartRate` is `null`; a new
 * pulse changes the pace from the next beat on.
 */
export function useHeartRateBeats(heartRate: number | null, onBeat: () => void): void {
  const rate = useRef(heartRate);
  const beat = useRef(onBeat);
  useEffect(() => {
    rate.current = heartRate;
    beat.current = onBeat;
  });
  const active = heartRate !== null && heartRate > 0;

  useEffect(() => {
    if (!active) return undefined;
    let handle = 0;
    let nextMs: number | null = null;
    const tick = (now: number): void => {
      const bpm = rate.current;
      if (bpm !== null && bpm > 0) {
        const periodMs = MS_PER_MINUTE / bpm;
        nextMs ??= now;
        if (now >= nextMs) {
          beat.current();
          // After a pause (a hidden tab) the beats start again instead of catching up.
          nextMs = Math.max(nextMs + periodMs, now);
        }
      }
      handle = requestAnimationFrame(tick);
    };
    handle = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(handle); };
  }, [active]);
}
