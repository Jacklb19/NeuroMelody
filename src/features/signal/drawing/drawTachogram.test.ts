import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { FakeDrawingContext } from '../../../test/fakeDrawingContext';
import type { WindowSnapshot } from '../processing/SignalProcessor';
import type { ClassifiedBeat } from '../processing/types';
import { drawTachogram, type CanvasDimensions } from './drawTachogram';
import type { ChartPalette } from './palette';

// Valores arbitrarios y distinguibles: la prueba comprueba que se usan tal cual.
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

describe('dibujarTacograma', () => {
  it('limpia el lienzo completo y dibuja en píxeles CSS escalados', () => {
    const ctx = draw();
    expect(ctx.operations[1]).toMatchObject({ operation: 'clearRect', args: [0, 0, 1200, 448] });
    expect(ctx.operations[2]).toMatchObject({ operation: 'setTransform', args: [2, 0, 0, 2, 0, 0] });
  });

  it('usa solo colores de la paleta recibida', () => {
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

  it('marca cada latido descartado con una ×', () => {
    const ctx = draw();
    expect(ctx.count('stroke', (o) => o.strokeStyle === PALETTE.discarded)).toBe(2);
  });

  it('dibuja los tramos de baja calidad con fondo y rayado', () => {
    const ctx = draw();
    expect(ctx.count('fillRect', (o) => o.fillStyle === PALETTE.lowQualityBackground)).toBe(1);
    expect(ctx.count('stroke', (o) => o.strokeStyle === PALETTE.lowQualityHatch)).toBe(1);
    expect(ctx.count('clip')).toBe(1);
  });

  it('corta la línea en los descartes y en los huecos', () => {
    const ctx = draw();
    const lineStart = ctx.operations.findIndex(
      (o) => o.operation === 'beginPath' && o.strokeStyle === PALETTE.line,
    );
    const lineEnd = ctx.operations.findIndex(
      (o, i) => i > lineStart && o.operation === 'stroke' && o.strokeStyle === PALETTE.line,
    );
    const strokes = ctx.operations.slice(lineStart, lineEnd);
    // Tres tramos: [1000, 2000], [5000, 6000] y [9000, 10000].
    expect(strokes.filter((o) => o.operation === 'moveTo')).toHaveLength(3);
    expect(strokes.filter((o) => o.operation === 'lineTo')).toHaveLength(3);
  });

  it('rotula los ejes con milisegundos y minutos de señal', () => {
    const texts = draw()
      .operations.filter((o) => o.operation === 'fillText')
      .map((o) => o.args[0]);
    expect(texts).toContain('1000 ms');
    expect(texts).toContain('0:00');
    expect(texts).toContain('5:00');
  });

  it('desplaza el eje de tiempo cuando la ventana ya está llena', () => {
    const texts = draw({ timeMs: 420_000, beats: [], segments: [] })
      .operations.filter((o) => o.operation === 'fillText')
      .map((o) => o.args[0]);
    expect(texts).toContain('2:00');
    expect(texts).toContain('7:00');
    expect(texts).not.toContain('0:00');
  });

  it('pone las marcas de tiempo en minutos enteros aunque la ventana empiece a mitad de minuto', () => {
    const texts = draw({ timeMs: 350_000, beats: [], segments: [] })
      .operations.filter((o) => o.operation === 'fillText')
      .map((o) => o.args[0])
      .filter((t) => typeof t === 'string' && !t.endsWith('ms'));
    expect(texts).toEqual(['1:00', '2:00', '3:00', '4:00', '5:00']);
  });

  it('dibuja ejes sin fallar cuando no hay datos', () => {
    const ctx = draw({ timeMs: 0, beats: [], segments: [] });
    expect(ctx.count('fillText')).toBeGreaterThan(0);
    expect(ctx.count('stroke', (o) => o.strokeStyle === PALETTE.discarded)).toBe(0);
  });
});

describe('módulos del hilo de señal', () => {
  it('no contienen colores hexadecimales escritos a mano', () => {
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
