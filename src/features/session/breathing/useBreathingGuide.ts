import { useEffect, useRef, useState, type RefObject } from 'react';
import type { OrbHandle } from '../../../shared/BreathingOrb';
import { MS_PER_SECOND } from '../../../shared/time';
import type { AudioEngine } from '../../audio/engine/AudioEngine';
import { CALIBRATION_LEVEL, LEVELS } from '../../audio/engine/levels';
import { beatsIn, breathAt, type BreathPhase } from './breathingPattern';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Runs the guided breath while `active`: counts beats on the audio clock at
 * the tempo the music has right now, moves the orb every frame and returns
 * the phase for the words. Without music it keeps the tempo every session
 * starts with, on the wall clock. Nothing audible depends on this loop.
 */
export function useBreathingGuide(
  active: boolean,
  engine: AudioEngine | null,
  orbRef: RefObject<OrbHandle | null>,
): BreathPhase {
  const [phase, setPhase] = useState<BreathPhase>('inhale');
  // Read by the loop, so starting or stopping the music does not restart the breath.
  const engineRef = useRef<AudioEngine | null>(engine);
  useEffect(() => {
    engineRef.current = engine;
  }, [engine]);

  useEffect(() => {
    if (!active) return undefined;
    const orb = orbRef.current;
    const reducedMotion = typeof window.matchMedia === 'function' ? window.matchMedia(REDUCED_MOTION_QUERY) : null;
    let beats = 0;
    let clock: AudioEngine | null = null;
    let lastS: number | null = null;
    // Unknown until the first frame, so turning the guide on again starts from breathing in.
    let shown: BreathPhase | null = null;

    const step = (): void => {
      const current = engineRef.current;
      // The two clocks are unrelated: a change of clock starts a new interval.
      if (current !== clock) {
        clock = current;
        lastS = null;
      }
      const nowS = current === null ? performance.now() / MS_PER_SECOND : current.audioTime;
      const tempo = current === null ? LEVELS[CALIBRATION_LEVEL].tempo : current.tempoBpm;
      if (lastS !== null) beats += beatsIn(nowS - lastS, tempo);
      lastS = nowS;

      const moment = breathAt(beats);
      // With reduced motion the orb stays still and the words alone lead.
      orb?.breathe(reducedMotion?.matches === true ? null : moment.fullness);
      if (moment.phase !== shown) {
        shown = moment.phase;
        setPhase(shown);
      }
      frameId = requestAnimationFrame(step);
    };
    let frameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(frameId);
      orb?.breathe(null);
    };
  }, [active, orbRef]);

  return phase;
}
