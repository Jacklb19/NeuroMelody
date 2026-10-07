import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { FakeDrawingContext } from '../../../test/fakeDrawingContext';
import type { WindowSnapshot } from '../processing/SignalProcessor';
import type { ClassifiedBeat } from '../processing/types';
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
};
const DIMENSIONS: CanvasDimensions = { widthCss: 600, heightCss: 224, scale: 2 };

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

function draw(snapshot: WindowSnapshot = SNAPSHOT): FakeDrawingContext {
  const ctx = new FakeDrawingContext();
  drawTachogram(ctx, snapshot, PALETTE, DIMENSIONS);
  return ctx;
}

describe('drawTachogram', () => {
  it('clears the whole canvas and draws in scaled CSS pixels', () => {
    const ctx = draw();
    expect(ctx.operations[1]).toMatchObject({ operation: 'clearRect', args: [0, 0, 1200, 448] });
    expect(ctx.operations[2]).toMatchObject({ operation: 'setTransform', args: [2, 0, 0, 2, 0, 0] });
  });

  it('uses only colors from the given palette', () => {
    const ctx = draw();
    const colors = new Set(Object.values(PALETTE));
    for (const o of ctx.operations) {
      if (o.operation === 'stroke') {
        expect(colors.has(String(o.strokeStyle))).toBe(true);
      }
      if (o.operation === 'fillRect' || o.operation === 'fillText') {
        expect(colors.has(String(o.fillStyle))).toBe(true);
      }
    }
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
    expect(texts).toContain('1000 ms');
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
      .filter((t) => typeof t === 'string' && !t.endsWith('ms'));
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
