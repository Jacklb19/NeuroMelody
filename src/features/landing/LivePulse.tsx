import { useEffect, useRef } from 'react';
import { PULSE_TRACE } from './config';
import type { HeartbeatSimulator } from './heartbeatSimulator';

/** Height of the trace at a point of the beat: a sharp spike and a soft second wave, flat in between. */
function pulseShape(phase: number): number {
  const spike = Math.exp(-(((phase - 0.06) * 34) ** 2));
  const dip = -0.22 * Math.exp(-(((phase - 0.11) * 30) ** 2));
  const wave = 0.24 * Math.exp(-(((phase - 0.36) * 9) ** 2));
  return spike + dip + wave;
}

/**
 * The simulated pulse drawn as it happens: a trace that scrolls across the
 * hero in step with the 3D figure. It shows what the app listens to instead
 * of describing it. Decorative; the figures beside it are in text.
 */
export function LivePulse({ heart }: { readonly heart: HeartbeatSimulator }): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    // Test environments have a canvas element without a drawing context.
    const context = typeof CanvasRenderingContext2D === 'undefined' ? null : canvas?.getContext('2d') ?? null;
    if (canvas === null || context === null) return undefined;
    const colour = getComputedStyle(canvas).getPropertyValue('--color-accent').trim();
    const samples = new Float32Array(PULSE_TRACE.samples);
    const origin = performance.now();
    let head = 0;
    let frameId: number | null = null;

    const fit = (): void => {
      const ratio = Math.min(window.devicePixelRatio || 1, PULSE_TRACE.maxPixelRatio);
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    };

    const draw = (): void => {
      const { width, height } = canvas;
      const baseline = height * PULSE_TRACE.baseline;
      const amplitude = height * PULSE_TRACE.amplitude;
      context.clearRect(0, 0, width, height);
      context.lineWidth = Math.max(1, height * PULSE_TRACE.lineWidth);
      context.lineJoin = 'round';
      context.strokeStyle = colour;
      context.beginPath();
      for (let i = 0; i < samples.length; i++) {
        // Oldest sample on the left, newest on the right.
        const value = samples[(head + i) % samples.length] ?? 0;
        const x = (i / (samples.length - 1)) * width;
        const y = baseline - value * amplitude;
        if (i === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
    };

    const step = (now: number): void => {
      samples[head] = pulseShape(heart.phaseAt(now - origin));
      head = (head + 1) % samples.length;
      draw();
      frameId = requestAnimationFrame(step);
    };

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    fit();
    if (still) {
      // A still picture of a few beats, so the idea is there without movement.
      for (let i = 0; i < samples.length; i++) samples[i] = pulseShape(((i / samples.length) * PULSE_TRACE.stillBeats) % 1);
      draw();
    } else {
      frameId = requestAnimationFrame(step);
    }
    const observer = new ResizeObserver(() => {
      fit();
      draw();
    });
    observer.observe(canvas);
    return () => {
      if (frameId !== null) cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [heart]);

  return <canvas ref={canvasRef} className="live-pulse" aria-hidden="true" />;
}
