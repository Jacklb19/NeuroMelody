import { useEffect, useRef } from 'react';
import { HERO_SCENE } from './config';
import type { HeartbeatSimulator } from './heartbeatSimulator';
import { createHeroScene, type HeroPalette, type HeroScene } from './heroScene';

/** CSS tokens the scene is painted with (index.css, ADR-25). */
const PALETTE_TOKENS: Readonly<Record<keyof HeroPalette, string>> = {
  core: '--landing-orb-core',
  glow: '--landing-orb-glow',
  pulse: '--landing-orb-pulse',
  staff: '--landing-staff',
  note: '--landing-note',
};

const MS_PER_SECOND = 1000;

/** Reads the palette, or `null` when a token is missing, so the CSS fallback shows instead. */
function readPalette(element: HTMLElement): HeroPalette | null {
  const style = getComputedStyle(element);
  const read = (token: string): string => style.getPropertyValue(token).trim();
  const palette: HeroPalette = {
    core: read(PALETTE_TOKENS.core),
    glow: read(PALETTE_TOKENS.glow),
    pulse: read(PALETTE_TOKENS.pulse),
    staff: read(PALETTE_TOKENS.staff),
    note: read(PALETTE_TOKENS.note),
  };
  return Object.values(palette).every((value) => value !== '') ? palette : null;
}

const prefersReducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface HeroCanvasProps {
  readonly heart: HeartbeatSimulator;
  /** Called once if WebGL is unavailable, so the page keeps its CSS figure. */
  readonly onUnavailable: () => void;
}

/**
 * Hosts the three.js scene of the hero. Loaded lazily so the rest of the app
 * never downloads three.js. It draws only while visible, stops with the tab
 * hidden and, with reduced motion, draws a single still frame.
 */
export default function HeroCanvas({ heart, onUnavailable }: HeroCanvasProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return undefined;
    const palette = readPalette(canvas);
    let scene: HeroScene;
    try {
      if (palette === null) throw new Error('Missing landing palette tokens.');
      scene = createHeroScene(canvas, palette);
    } catch {
      onUnavailable();
      return undefined;
    }

    const origin = performance.now();
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
    let frameId: number | null = null;
    let visible = true;

    const draw = (now: number): void => {
      // Ease toward the pointer so the figure leans instead of snapping.
      pointer.x += (pointer.targetX - pointer.x) * HERO_SCENE.pointerEasing;
      pointer.y += (pointer.targetY - pointer.y) * HERO_SCENE.pointerEasing;
      const elapsed = now - origin;
      scene.render({ timeS: elapsed / MS_PER_SECOND, beatPhase: heart.phaseAt(elapsed), pointerX: pointer.x, pointerY: pointer.y });
    };
    const loop = (now: number): void => {
      draw(now);
      frameId = requestAnimationFrame(loop);
    };
    const start = (): void => {
      if (frameId !== null || !visible || document.hidden) return;
      if (prefersReducedMotion()) {
        draw(origin);
        return;
      }
      frameId = requestAnimationFrame(loop);
    };
    const stop = (): void => {
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = null;
    };

    const resize = (): void => {
      const { width, height } = canvas.getBoundingClientRect();
      scene.resize(width, height, window.devicePixelRatio || 1);
      if (frameId === null) draw(performance.now());
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (visible) start();
      else stop();
    });
    visibility.observe(canvas);
    const onVisibilityChange = (): void => {
      if (document.hidden) stop();
      else start();
    };
    const onPointerMove = (event: PointerEvent): void => {
      pointer.targetX = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.targetY = (event.clientY / window.innerHeight) * 2 - 1;
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    start();

    return () => {
      stop();
      resizeObserver.disconnect();
      visibility.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pointermove', onPointerMove);
      scene.dispose();
    };
  }, [heart, onUnavailable]);

  return <canvas ref={canvasRef} className="hero-canvas" aria-hidden="true" />;
}
