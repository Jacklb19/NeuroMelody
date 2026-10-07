import type { WindowSnapshot } from '../processing/SignalProcessor';
import type { ClassifiedBeat } from '../processing/types';
import { ANALYSIS_WINDOW_MS } from '../processing/thresholds';
import type { ChartPalette } from './palette';

/** Canvas size in CSS pixels and screen density. */
export interface CanvasDimensions {
  readonly widthCss: number;
  readonly heightCss: number;
  readonly scale: number;
}

/** Subset of the 2D context used for drawing; allows testing it without a canvas. */
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

// The right margin leaves room for the centered label of the last minute.
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
  // Until the window is full, the axis spans 0 to 5 min and fills from left to right.
  const startMs = Math.max(0, snapshot.timeMs - ANALYSIS_WINDOW_MS);
  const endMs = startMs + ANALYSIS_WINDOW_MS;

  const acceptedRr = snapshot.beats.filter((b) => b.accepted).map((b) => b.rrMs);
  const min = acceptedRr.length > 0 ? Math.min(...acceptedRr) : DEFAULT_RR.min;
  const max = acceptedRr.length > 0 ? Math.max(...acceptedRr) : DEFAULT_RR.max;
  // Range rounded to 100 ms with a margin, so the scale does not jump on every beat.
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

function drawAxes(ctx: DrawingContext, scales: Scales, palette: ChartPalette): void {
  ctx.strokeStyle = palette.grid;
  ctx.fillStyle = palette.text;
  ctx.lineWidth = 1;
  ctx.font = palette.font;

  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let rr = scales.minRr; rr <= scales.maxRr; rr += scales.step) {
    const y = scales.y(rr);
    ctx.beginPath();
    ctx.moveTo(scales.area.x, y);
    ctx.lineTo(scales.area.x + scales.area.width, y);
    ctx.stroke();
    ctx.fillText(`${String(rr)} ms`, scales.area.x - 6, y);
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  // Ticks on whole signal minutes, even when the window starts mid-minute.
  for (let t = Math.ceil(scales.startMs / 60_000) * 60_000; t <= scales.endMs; t += 60_000) {
    ctx.fillText(formatMinutes(t), scales.x(t), scales.area.y + scales.area.height + 6);
  }
}

function drawSegments(
  ctx: DrawingContext,
  scales: Scales,
  snapshot: WindowSnapshot,
  palette: ChartPalette,
): void {
  for (const segment of snapshot.segments) {
    const x0 = Math.max(scales.x(segment.startMs), scales.area.x);
    const x1 = Math.min(scales.x(segment.endMs), scales.area.x + scales.area.width);
    if (x1 <= x0) {
      continue;
    }
    ctx.fillStyle = palette.lowQualityBackground;
    ctx.fillRect(x0, scales.area.y, x1 - x0, scales.area.height);

    // Diagonal hatching: the segment stays distinguishable without perceiving color.
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, scales.area.y, x1 - x0, scales.area.height);
    ctx.clip();
    ctx.strokeStyle = palette.lowQualityHatch;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = x0 - scales.area.height; x < x1; x += HATCH_SPACING_PX) {
      ctx.moveTo(x, scales.area.y + scales.area.height);
      ctx.lineTo(x + scales.area.height, scales.area.y);
    }
    ctx.stroke();
    ctx.restore();
  }
}

function drawSeries(ctx: DrawingContext, scales: Scales, beats: readonly ClassifiedBeat[], palette: ChartPalette): void {
  ctx.strokeStyle = palette.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  let previous: ClassifiedBeat | null = null;
  for (const beat of beats) {
    if (beat.accepted) {
      const x = scales.x(beat.endMs);
      const y = scales.y(beat.rrMs);
      // The line only joins consecutive accepted beats; it breaks at discarded beats and gaps.
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
  scales: Scales,
  beats: readonly ClassifiedBeat[],
  palette: ChartPalette,
): void {
  ctx.strokeStyle = palette.discarded;
  ctx.lineWidth = 1.5;
  for (const beat of beats) {
    if (beat.accepted) {
      continue;
    }
    const x = scales.x(beat.endMs);
    const y = scales.y(beat.rrMs);
    ctx.beginPath();
    ctx.moveTo(x - CROSS_SIZE_PX, y - CROSS_SIZE_PX);
    ctx.lineTo(x + CROSS_SIZE_PX, y + CROSS_SIZE_PX);
    ctx.moveTo(x - CROSS_SIZE_PX, y + CROSS_SIZE_PX);
    ctx.lineTo(x + CROSS_SIZE_PX, y - CROSS_SIZE_PX);
    ctx.stroke();
  }
}

/**
 * Draws the tachogram: RR intervals of the 5-minute window against signal
 * time. Low-quality segments get a background and hatching, and discarded
 * beats an ×, so the chart does not rely on color alone (WCAG 1.4.1).
 * All colors come from the palette.
 */
export function drawTachogram(
  ctx: DrawingContext,
  snapshot: WindowSnapshot,
  palette: ChartPalette,
  dims: CanvasDimensions,
): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, dims.widthCss * dims.scale, dims.heightCss * dims.scale);
  // Drawing happens in CSS pixels; the scale adapts the result to the screen density.
  ctx.setTransform(dims.scale, 0, 0, dims.scale, 0, 0);

  const scales = computeScales(snapshot, dims);
  drawSegments(ctx, scales, snapshot, palette);
  drawAxes(ctx, scales, palette);
  drawSeries(ctx, scales, snapshot.beats, palette);
  drawDiscarded(ctx, scales, snapshot.beats, palette);
}
