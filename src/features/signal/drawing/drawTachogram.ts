import type { WindowSnapshot } from '../processing/SignalProcessor';
import type { ClassifiedBeat } from '../processing/types';
import { ANALYSIS_WINDOW_MS } from '../processing/thresholds';
import { formatSignalTime } from '../formatSignalTime';
import {
  DEFAULT_RR_RANGE_MS,
  MIN_PLOT_SIZE_PX,
  RR_AXIS_EXPANSION_MS,
  RR_AXIS_MIN_SPAN_MS,
  RR_AXIS_PADDING_MS,
  RR_AXIS_ROUNDING_MS,
  RR_AXIS_WIDE_SPAN_MS,
  RR_TICK_STEP_MS,
  TIME_TICK_INTERVAL_MS,
} from './chartConfig';
import { fillValueSlot, type ChartLabels } from './chartLabels';
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

function computeScales(snapshot: WindowSnapshot, dims: CanvasDimensions, palette: ChartPalette): Scales {
  // Until the window is full, the axis starts at 0 and fills from left to right.
  const startMs = Math.max(0, snapshot.timeMs - ANALYSIS_WINDOW_MS);
  const endMs = startMs + ANALYSIS_WINDOW_MS;

  const acceptedRr = snapshot.beats.filter((b) => b.accepted).map((b) => b.rrMs);
  const min = acceptedRr.length > 0 ? Math.min(...acceptedRr) : DEFAULT_RR_RANGE_MS.min;
  const max = acceptedRr.length > 0 ? Math.max(...acceptedRr) : DEFAULT_RR_RANGE_MS.max;
  // Range rounded with a margin, so the scale does not jump on every beat.
  let minRr = Math.floor((min - RR_AXIS_PADDING_MS) / RR_AXIS_ROUNDING_MS) * RR_AXIS_ROUNDING_MS;
  let maxRr = Math.ceil((max + RR_AXIS_PADDING_MS) / RR_AXIS_ROUNDING_MS) * RR_AXIS_ROUNDING_MS;
  if (maxRr - minRr < RR_AXIS_MIN_SPAN_MS) {
    minRr -= RR_AXIS_EXPANSION_MS;
    maxRr += RR_AXIS_EXPANSION_MS;
  }
  const step = maxRr - minRr > RR_AXIS_WIDE_SPAN_MS ? RR_TICK_STEP_MS.wide : RR_TICK_STEP_MS.narrow;

  const area = {
    x: palette.marginLeft,
    y: palette.marginTop,
    width: Math.max(MIN_PLOT_SIZE_PX, dims.widthCss - palette.marginLeft - palette.marginRight),
    height: Math.max(MIN_PLOT_SIZE_PX, dims.heightCss - palette.marginTop - palette.marginBottom),
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

function drawAxes(ctx: DrawingContext, scales: Scales, palette: ChartPalette, labels: ChartLabels): void {
  ctx.strokeStyle = palette.grid;
  ctx.fillStyle = palette.text;
  ctx.lineWidth = palette.lineWidthGrid;
  ctx.font = palette.font;

  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let rr = scales.minRr; rr <= scales.maxRr; rr += scales.step) {
    const y = scales.y(rr);
    ctx.beginPath();
    ctx.moveTo(scales.area.x, y);
    ctx.lineTo(scales.area.x + scales.area.width, y);
    ctx.stroke();
    ctx.fillText(fillValueSlot(labels.rrTick, String(rr)), scales.area.x - palette.labelOffset, y);
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  // Ticks on whole signal minutes, even when the window starts mid-minute.
  const firstTickMs = Math.ceil(scales.startMs / TIME_TICK_INTERVAL_MS) * TIME_TICK_INTERVAL_MS;
  for (let t = firstTickMs; t <= scales.endMs; t += TIME_TICK_INTERVAL_MS) {
    ctx.fillText(formatSignalTime(t), scales.x(t), scales.area.y + scales.area.height + palette.labelOffset);
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
    ctx.lineWidth = palette.lineWidthHatch;
    ctx.beginPath();
    for (let x = x0 - scales.area.height; x < x1; x += palette.hatchSpacing) {
      ctx.moveTo(x, scales.area.y + scales.area.height);
      ctx.lineTo(x + scales.area.height, scales.area.y);
    }
    ctx.stroke();
    ctx.restore();
  }
}

function drawSeries(ctx: DrawingContext, scales: Scales, beats: readonly ClassifiedBeat[], palette: ChartPalette): void {
  ctx.strokeStyle = palette.line;
  ctx.lineWidth = palette.lineWidthSeries;
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
  ctx.lineWidth = palette.lineWidthDiscarded;
  const half = palette.markerHalfSize;
  for (const beat of beats) {
    if (beat.accepted) {
      continue;
    }
    const x = scales.x(beat.endMs);
    const y = scales.y(beat.rrMs);
    ctx.beginPath();
    ctx.moveTo(x - half, y - half);
    ctx.lineTo(x + half, y + half);
    ctx.moveTo(x - half, y + half);
    ctx.lineTo(x + half, y - half);
    ctx.stroke();
  }
}

/**
 * Draws the tachogram: RR intervals of the analysis window against signal
 * time. Low-quality segments get a background and hatching, and discarded
 * beats an ×, so the chart does not rely on color alone (WCAG 1.4.1).
 * All colors, the font and the lengths come from the palette, and all text
 * from the labels.
 */
export function drawTachogram(
  ctx: DrawingContext,
  snapshot: WindowSnapshot,
  palette: ChartPalette,
  labels: ChartLabels,
  dims: CanvasDimensions,
): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, dims.widthCss * dims.scale, dims.heightCss * dims.scale);
  // Drawing happens in CSS pixels; the scale adapts the result to the screen density.
  ctx.setTransform(dims.scale, 0, 0, dims.scale, 0, 0);

  const scales = computeScales(snapshot, dims, palette);
  drawSegments(ctx, scales, snapshot, palette);
  drawAxes(ctx, scales, palette, labels);
  drawSeries(ctx, scales, snapshot.beats, palette);
  drawDiscarded(ctx, scales, snapshot.beats, palette);
}
