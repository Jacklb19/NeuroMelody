import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { es } from '../../../i18n/es';
import { FakeDrawingContext } from '../../../test/fakeDrawingContext';
import type { WindowSnapshot } from '../processing/SignalProcessor';
import type { ClassifiedBeat } from '../processing/types';
import { chartLabelsFrom } from './chartLabels';
import { drawTachogram, type CanvasDimensions } from './drawTachogram';
import type { ChartPalette } from './palette';

// Arbitrary, distinguishable values: the test checks that they are used as-is.
const PALETTE: ChartPalette = {
  line: 'rgb(1, 1, 1)',
  grid: 'rgb(2, 2, 2)',
  text: 'rgb(3, 3, 3)',
  discarded: 'rgb(4, 4, 4)',
  lowQualityBackground: 'rgb(5, 5, 5)',
  lowQualityHatch: 'rgb(6, 6, 6)',
  font: '14px sans-serif',
  marginLeft: 50,
  marginRight: 20,
  marginTop: 10,
  marginBottom: 30,
  labelOffset: 5,
  hatchSpacing: 7,
  markerHalfSize: 3,
  lineWidthGrid: 0.5,
  lineWidthHatch: 0.75,
  lineWidthSeries: 2.5,
  lineWidthDiscarded: 1.25,
};
const DIMENSIONS: CanvasDimensions = { widthCss: 600, heightCss: 224, scale: 2 };
const LABELS = chartLabelsFrom(es.common);
const { withUnit, units } = es.common;

function beat(endMs: number, rrMs: number, extra: Partial<ClassifiedBeat> = {}): ClassifiedBeat {
  return { endMs, rrMs, accepted: true, discardReason: null, contiguousWithPrevious: true, ...extra };
}

const SNAPSHOT: WindowSnapshot = {
  timeMs: 10_000,
  beats: [
    beat(1000, 1000),
    beat(2000, 1000),
    beat(2700, 700, { accepted: false, discardReason: 'deviation' }),
    beat(4000, 1300, { accepted: false, discardReason: 'deviation' }),
    beat(5000, 1000),
    beat(6000, 1000),
    beat(9000, 1000, { contiguousWithPrevious: false }),
    beat(10_000, 1000),
  ],
  segments: [{ startMs: 6000, endMs: 9000 }],
};

/** Also records the line width of each stroke, which the shared fake does not. */
class WidthRecordingContext extends FakeDrawingContext {
  readonly strokeWidths = new Map<unknown, Set<number>>();

  override stroke(): void {
    const widths = this.strokeWidths.get(this.strokeStyle) ?? new Set<number>();
    this.strokeWidths.set(this.strokeStyle, widths.add(this.lineWidth));
    super.stroke();
  }
}

function draw(snapshot: WindowSnapshot = SNAPSHOT): WidthRecordingContext {
  const ctx = new WidthRecordingContext();
  drawTachogram(ctx, snapshot, PALETTE, LABELS, DIMENSIONS);
  return ctx;
}

function points(ctx: FakeDrawingContext, operation: 'moveTo' | 'lineTo', strokeStyle: string): number[][] {
  return ctx.operations
    .filter((o) => o.operation === operation && o.strokeStyle === strokeStyle)
    .map((o) => o.args.map(Number));
}

describe('drawTachogram', () => {
  it('clears the whole canvas and draws in scaled CSS pixels', () => {
    const ctx = draw();
    expect(ctx.operations[1]).toMatchObject({ operation: 'clearRect', args: [0, 0, 1200, 448] });
    expect(ctx.operations[2]).toMatchObject({ operation: 'setTransform', args: [2, 0, 0, 2, 0, 0] });
  });

  it('uses only colors from the given palette', () => {
    const ctx = draw();
    const colors = new Set(Object.values(PALETTE).filter((value) => typeof value === 'string'));
    for (const o of ctx.operations) {
      if (o.operation === 'stroke') {
        expect(colors.has(String(o.strokeStyle))).toBe(true);
      }
      if (o.operation === 'fillRect' || o.operation === 'fillText') {
        expect(colors.has(String(o.fillStyle))).toBe(true);
      }
    }
  });

  it('places the plot and the axis labels inside the palette margins', () => {
    const ctx = draw();
    const plotBottom = DIMENSIONS.heightCss - PALETTE.marginBottom;
    const gridStarts = points(ctx, 'moveTo', PALETTE.grid);
    const gridEnds = points(ctx, 'lineTo', PALETTE.grid);
    expect(new Set(gridStarts.map(([x]) => x))).toEqual(new Set([PALETTE.marginLeft]));
    expect(new Set(gridEnds.map(([x]) => x))).toEqual(new Set([DIMENSIONS.widthCss - PALETTE.marginRight]));
    expect(Math.min(...gridStarts.map(([, y = 0]) => y))).toBe(PALETTE.marginTop);
    expect(Math.max(...gridStarts.map(([, y = 0]) => y))).toBe(plotBottom);

    const labels = ctx.operations.filter((o) => o.operation === 'fillText');
    const isRrLabel = (text: unknown): boolean => String(text).endsWith(units.milliseconds);
    for (const { args: [text, x, y] } of labels) {
      if (isRrLabel(text)) {
        expect(x).toBe(PALETTE.marginLeft - PALETTE.labelOffset);
      } else {
        expect(y).toBe(plotBottom + PALETTE.labelOffset);
      }
    }
  });

  it('strokes each element with its palette line width', () => {
    const ctx = draw();
    expect(ctx.strokeWidths).toEqual(
      new Map([
        [PALETTE.grid, new Set([PALETTE.lineWidthGrid])],
        [PALETTE.lowQualityHatch, new Set([PALETTE.lineWidthHatch])],
        [PALETTE.line, new Set([PALETTE.lineWidthSeries])],
        [PALETTE.discarded, new Set([PALETTE.lineWidthDiscarded])],
      ]),
    );
  });

  it('sizes the × and the hatching from the palette', () => {
    const ctx = draw();
    const crossStarts = points(ctx, 'moveTo', PALETTE.discarded);
    const crossEnds = points(ctx, 'lineTo', PALETTE.discarded);
    // Two strokes per × and two discarded beats.
    expect(crossStarts).toHaveLength(4);
    crossStarts.forEach(([x = 0], i) => {
      expect((crossEnds[i]?.[0] ?? 0) - x).toBe(2 * PALETTE.markerHalfSize);
    });

    const hatchStarts = points(ctx, 'moveTo', PALETTE.lowQualityHatch).map(([x = 0]) => x);
    expect(hatchStarts.length).toBeGreaterThan(1);
    hatchStarts.slice(1).forEach((x, i) => {
      expect(x - (hatchStarts[i] ?? 0)).toBeCloseTo(PALETTE.hatchSpacing);
    });
  });

  it('marks each discarded beat with an ×', () => {
    const ctx = draw();
    expect(ctx.count('stroke', (o) => o.strokeStyle === PALETTE.discarded)).toBe(2);
  });

  it('draws low-quality segments with a background and hatching', () => {
    const ctx = draw();
    expect(ctx.count('fillRect', (o) => o.fillStyle === PALETTE.lowQualityBackground)).toBe(1);
    expect(ctx.count('stroke', (o) => o.strokeStyle === PALETTE.lowQualityHatch)).toBe(1);
    expect(ctx.count('clip')).toBe(1);
  });

  it('breaks the line at discarded beats and at gaps', () => {
    const ctx = draw();
    const lineStart = ctx.operations.findIndex(
      (o) => o.operation === 'beginPath' && o.strokeStyle === PALETTE.line,
    );
    const lineEnd = ctx.operations.findIndex(
      (o, i) => i > lineStart && o.operation === 'stroke' && o.strokeStyle === PALETTE.line,
    );
    const strokes = ctx.operations.slice(lineStart, lineEnd);
    // Three runs: [1000, 2000], [5000, 6000] and [9000, 10000].
    expect(strokes.filter((o) => o.operation === 'moveTo')).toHaveLength(3);
    expect(strokes.filter((o) => o.operation === 'lineTo')).toHaveLength(3);
  });

  it('labels the axes with milliseconds and signal minutes', () => {
    const texts = draw()
      .operations.filter((o) => o.operation === 'fillText')
      .map((o) => o.args[0]);
    expect(texts).toContain(withUnit('1000', units.milliseconds));
    expect(texts).toContain('0:00');
    expect(texts).toContain('5:00');
  });

  it('shifts the time axis once the window is full', () => {
    const texts = draw({ timeMs: 420_000, beats: [], segments: [] })
      .operations.filter((o) => o.operation === 'fillText')
      .map((o) => o.args[0]);
    expect(texts).toContain('2:00');
    expect(texts).toContain('7:00');
    expect(texts).not.toContain('0:00');
  });

  it('places time ticks on whole minutes even when the window starts mid-minute', () => {
    const texts = draw({ timeMs: 350_000, beats: [], segments: [] })
      .operations.filter((o) => o.operation === 'fillText')
      .map((o) => o.args[0])
      .filter((t) => typeof t === 'string' && !t.endsWith(units.milliseconds));
    expect(texts).toEqual(['1:00', '2:00', '3:00', '4:00', '5:00']);
  });

  it('draws the axes without failing when there is no data', () => {
    const ctx = draw({ timeMs: 0, beats: [], segments: [] });
    expect(ctx.count('fillText')).toBeGreaterThan(0);
    expect(ctx.count('stroke', (o) => o.strokeStyle === PALETTE.discarded)).toBe(0);
  });
});

describe('signal modules', () => {
  it('contain no hand-written hexadecimal colors', () => {
    const root = path.resolve(process.cwd(), 'src', 'features', 'signal');
    const files = fs
      .readdirSync(root, { recursive: true, encoding: 'utf-8' })
      .filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file));

    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const fileContent = fs.readFileSync(path.join(root, file), 'utf-8');
      expect(fileContent, file).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });
});
