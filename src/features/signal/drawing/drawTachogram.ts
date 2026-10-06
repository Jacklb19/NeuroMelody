import type { WindowSnapshot } from '../processing/SignalProcessor';
import type { ClassifiedBeat } from '../processing/types';
import { ANALYSIS_WINDOW_MS } from '../processing/thresholds';
import type { ChartPalette } from './palette';

/** Tamaño del lienzo en píxeles CSS y densidad de la pantalla. */
export interface CanvasDimensions {
  readonly widthCss: number;
  readonly heightCss: number;
  readonly scale: number;
}

/** Subconjunto del contexto 2D que usa el dibujo; permite probarlo sin canvas. */
export interface DrawingContext {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  clearRect(x: number, y: number, width: number, height: number): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  rect(x: number, y: number, width: number, height: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  stroke(): void;
  clip(): void;
  save(): void;
  restore(): void;
  fillText(text: string, x: number, y: number): void;
}

// El margen derecho deja sitio a la etiqueta centrada del último minuto.
const MARGIN = { left: 56, right: 24, top: 8, bottom: 24 } as const;
const HATCH_SPACING_PX = 8;
const CROSS_SIZE_PX = 4;
const DEFAULT_RR = { min: 600, max: 1200 } as const;

interface Scales {
  readonly x: (timeMs: number) => number;
  readonly y: (rrMs: number) => number;
  readonly startMs: number;
  readonly endMs: number;
  readonly minRr: number;
  readonly maxRr: number;
  readonly step: number;
  readonly area: { x: number; y: number; width: number; height: number };
}

function computeScales(snapshot: WindowSnapshot, dims: CanvasDimensions): Scales {
  // Mientras la ventana no está llena, el eje va de 0 a 5 min y se llena de izquierda a derecha.
  const startMs = Math.max(0, snapshot.timeMs - ANALYSIS_WINDOW_MS);
  const endMs = startMs + ANALYSIS_WINDOW_MS;

  const acceptedCount = snapshot.beats.filter((l) => l.accepted).map((l) => l.rrMs);
  const min = acceptedCount.length > 0 ? Math.min(...acceptedCount) : DEFAULT_RR.min;
  const max = acceptedCount.length > 0 ? Math.max(...acceptedCount) : DEFAULT_RR.max;
  // Rango redondeado a 100 ms con margen, para que la escala no salte a cada latido.
  let minRr = Math.floor((min - 50) / 100) * 100;
  let maxRr = Math.ceil((max + 50) / 100) * 100;
  if (maxRr - minRr < 200) {
    minRr -= 100;
    maxRr += 100;
  }
  const step = maxRr - minRr > 600 ? 200 : 100;

  const area = {
    x: MARGIN.left,
    y: MARGIN.top,
    width: Math.max(1, dims.widthCss - MARGIN.left - MARGIN.right),
    height: Math.max(1, dims.heightCss - MARGIN.top - MARGIN.bottom),
  };
  return {
    startMs,
    endMs,
    minRr,
    maxRr,
    step,
    area,
    x: (timeMs) => area.x + ((timeMs - startMs) / ANALYSIS_WINDOW_MS) * area.width,
    y: (rrMs) => {
      const clamped = Math.min(Math.max(rrMs, minRr), maxRr);
      return area.y + area.height - ((clamped - minRr) / (maxRr - minRr)) * area.height;
    },
  };
}

function formatMinutes(ms: number): string {
  const seconds = Math.round(ms / 1000);
  return `${String(Math.floor(seconds / 60))}:${String(seconds % 60).padStart(2, '0')}`;
}

function drawAxes(ctx: DrawingContext, e: Scales, palette: ChartPalette): void {
  ctx.strokeStyle = palette.grid;
  ctx.fillStyle = palette.text;
  ctx.lineWidth = 1;
  ctx.font = palette.font;

  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let rr = e.minRr; rr <= e.maxRr; rr += e.step) {
    const y = e.y(rr);
    ctx.beginPath();
    ctx.moveTo(e.area.x, y);
    ctx.lineTo(e.area.x + e.area.width, y);
    ctx.stroke();
    ctx.fillText(`${String(rr)} ms`, e.area.x - 6, y);
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  // Marcas en minutos enteros de señal, aunque la ventana empiece a mitad de minuto.
  for (let t = Math.ceil(e.startMs / 60_000) * 60_000; t <= e.endMs; t += 60_000) {
    ctx.fillText(formatMinutes(t), e.x(t), e.area.y + e.area.height + 6);
  }
}

function drawSegments(
  ctx: DrawingContext,
  e: Scales,
  snapshot: WindowSnapshot,
  palette: ChartPalette,
): void {
  for (const segment of snapshot.segments) {
    const x0 = Math.max(e.x(segment.startMs), e.area.x);
    const x1 = Math.min(e.x(segment.endMs), e.area.x + e.area.width);
    if (x1 <= x0) {
      continue;
    }
    ctx.fillStyle = palette.lowQualityBackground;
    ctx.fillRect(x0, e.area.y, x1 - x0, e.area.height);

    // Rayado diagonal: el tramo se distingue también sin percibir el color.
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, e.area.y, x1 - x0, e.area.height);
    ctx.clip();
    ctx.strokeStyle = palette.lowQualityHatch;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = x0 - e.area.height; x < x1; x += HATCH_SPACING_PX) {
      ctx.moveTo(x, e.area.y + e.area.height);
      ctx.lineTo(x + e.area.height, e.area.y);
    }
    ctx.stroke();
    ctx.restore();
  }
}

function drawSeries(ctx: DrawingContext, e: Scales, beats: readonly ClassifiedBeat[], palette: ChartPalette): void {
  ctx.strokeStyle = palette.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  let previous: ClassifiedBeat | null = null;
  for (const beat of beats) {
    if (beat.accepted) {
      const x = e.x(beat.endMs);
      const y = e.y(beat.rrMs);
      // La línea solo une latidos consecutivos aceptados; se corta en descartes y huecos.
      if (previous?.accepted === true && beat.contiguousWithPrevious) {
        ctx.lineTo(x, y);
      } else {
        ctx.moveTo(x, y);
      }
    }
    previous = beat;
  }
  ctx.stroke();
}

function drawDiscarded(
  ctx: DrawingContext,
  e: Scales,
  beats: readonly ClassifiedBeat[],
  palette: ChartPalette,
): void {
  ctx.strokeStyle = palette.discarded;
  ctx.lineWidth = 1.5;
  for (const beat of beats) {
    if (beat.accepted) {
      continue;
    }
    const x = e.x(beat.endMs);
    const y = e.y(beat.rrMs);
    ctx.beginPath();
    ctx.moveTo(x - CROSS_SIZE_PX, y - CROSS_SIZE_PX);
    ctx.lineTo(x + CROSS_SIZE_PX, y + CROSS_SIZE_PX);
    ctx.moveTo(x - CROSS_SIZE_PX, y + CROSS_SIZE_PX);
    ctx.lineTo(x + CROSS_SIZE_PX, y - CROSS_SIZE_PX);
    ctx.stroke();
  }
}

/**
 * Dibuja el tacograma: intervalos RR de la ventana de 5 min frente al tiempo
 * de señal. Los tramos de baja calidad llevan fondo y rayado, y los latidos
 * descartados una ×, para no depender solo del color (WCAG 1.4.1).
 * Todos los colores vienen de la paleta.
 */
export function drawTachogram(
  ctx: DrawingContext,
  snapshot: WindowSnapshot,
  palette: ChartPalette,
  dims: CanvasDimensions,
): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, dims.widthCss * dims.scale, dims.heightCss * dims.scale);
  // Se dibuja en píxeles CSS; la escala adapta el resultado a la densidad de la pantalla.
  ctx.setTransform(dims.scale, 0, 0, dims.scale, 0, 0);

  const scales = computeScales(snapshot, dims);
  drawSegments(ctx, scales, snapshot, palette);
  drawAxes(ctx, scales, palette);
  drawSeries(ctx, scales, snapshot.beats, palette);
  drawDiscarded(ctx, scales, snapshot.beats, palette);
}
