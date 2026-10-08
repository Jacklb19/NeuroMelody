import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  ChartPaletteError,
  readChartPalette,
  FAMILY_VARIABLE,
  SIZE_VARIABLE,
  PALETTE_VARIABLES,
  type ComputedStyles,
} from './palette';

function styles(values: Record<string, string>): ComputedStyles {
  return { getPropertyValue: (name: string) => values[name] ?? '' };
}

function paletteErrorOf(computed: ComputedStyles): ChartPaletteError {
  try {
    readChartPalette(computed);
  } catch (error) {
    if (error instanceof ChartPaletteError) return error;
    throw error;
  }
  throw new Error('Expected a ChartPaletteError');
}

const COMPLETE_STYLES: Record<string, string> = {
  '--color-chart-line': ' #2563eb',
  '--color-chart-grid': '#e5e7eb',
  '--color-chart-text': '#4b5563',
  '--color-chart-discarded': '#78716c',
  '--color-chart-low-quality-background': '#fffbeb',
  '--color-chart-low-quality-hatch': '#a16207',
  '--font-base': 'system-ui, sans-serif',
  '--text-sm': '0.875rem',
  'font-size': '16px',
};

describe('readChartPalette', () => {
  it('reads the colors from the CSS variables and converts the size from rem to px', () => {
    expect(readChartPalette(styles(COMPLETE_STYLES))).toEqual({
      line: '#2563eb',
      grid: '#e5e7eb',
      text: '#4b5563',
      discarded: '#78716c',
      lowQualityBackground: '#fffbeb',
      lowQualityHatch: '#a16207',
      font: '14px system-ui, sans-serif',
    });
  });

  it('accepts a size in px', () => {
    const palette = readChartPalette(styles({ ...COMPLETE_STYLES, '--text-sm': '13px' }));
    expect(palette.font).toBe('13px system-ui, sans-serif');
  });

  it.each(Object.values(PALETTE_VARIABLES).concat([FAMILY_VARIABLE, SIZE_VARIABLE]))(
    'throws an explicit error when %s is missing',
    (variable) => {
      const incomplete = { ...COMPLETE_STYLES, [variable]: '' };
      expect(() => readChartPalette(styles(incomplete))).toThrow(ChartPaletteError);
      expect(() => readChartPalette(styles(incomplete))).toThrow(variable);
      expect(paletteErrorOf(styles(incomplete))).toMatchObject({ code: 'missing_variable', detail: variable });
    },
  );

  it('throws an error when the size cannot be parsed', () => {
    expect(() => readChartPalette(styles({ ...COMPLETE_STYLES, '--text-sm': 'not-a-size' }))).toThrow(
      ChartPaletteError,
    );
    expect(paletteErrorOf(styles({ ...COMPLETE_STYLES, '--text-sm': 'not-a-size' }))).toMatchObject({
      code: 'invalid_font_size',
      detail: 'not-a-size',
    });
  });
});

describe('chart tokens in src/index.css', () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), 'src', 'index.css'), 'utf-8');
  const tokens = new Map(
    [...css.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1] ?? '', (m[2] ?? '').trim()]),
  );

  function resolve(name: string): string {
    const value = tokens.get(name) ?? '';
    const reference = /^var\((--[a-z0-9-]+)\)$/.exec(value);
    return reference?.[1] === undefined ? value : resolve(reference[1]);
  }

  function luminance(hex: string): number {
    const channels = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
    const [r = 0, g = 0, b = 0] = channels.map((c) =>
      c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
    );
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function contrast(a: string, b: string): number {
    const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
  }

  it('defines every variable the palette reads', () => {
    for (const variable of [...Object.values(PALETTE_VARIABLES), FAMILY_VARIABLE, SIZE_VARIABLE]) {
      expect(resolve(variable), variable).not.toBe('');
    }
  });

  it('does not reuse the error colors in the chart', () => {
    const errors = new Set([resolve('--color-error-text'), resolve('--color-error-background')]);
    for (const variable of Object.values(PALETTE_VARIABLES)) {
      expect(errors.has(resolve(variable)), variable).toBe(false);
    }
  });

  it.each([
    ['--color-text', '--color-background'],
    ['--color-text-secondary', '--color-background'],
    ['--color-text-muted', '--color-background'],
    ['--color-text', '--color-surface'],
    ['--color-text-secondary', '--color-surface'],
    ['--color-text-muted', '--color-surface'],
    ['--color-button-text', '--color-button-background'],
    ['--color-button-text', '--color-button-hover'],
    ['--color-success-text', '--color-success-background'],
    ['--color-error-text', '--color-error-background'],
    ['--color-stop-text', '--color-stop-background'],
  ])('keeps readable UI text at 4.5:1 contrast: %s on %s', (foreground, background) => {
    expect(contrast(resolve(foreground), resolve(background))).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ['--color-border', '--color-paper'],
    ['--color-focus', '--color-background'],
    ['--color-focus', '--color-surface'],
    ['--color-stop-border', '--color-background'],
  ])('keeps control boundaries and focus at 3:1 contrast: %s on %s', (foreground, background) => {
    expect(contrast(resolve(foreground), resolve(background))).toBeGreaterThanOrEqual(3);
  });

  it.each([
    ['--color-chart-line', '--color-background'],
    ['--color-chart-line', '--color-chart-low-quality-background'],
    ['--color-chart-discarded', '--color-background'],
    ['--color-chart-discarded', '--color-chart-low-quality-background'],
    ['--color-chart-low-quality-hatch', '--color-background'],
    ['--color-chart-low-quality-hatch', '--color-chart-low-quality-background'],
    ['--color-chart-text', '--color-background'],
  ])('%s has at least 3:1 contrast on %s', (foreground, background) => {
    expect(contrast(resolve(foreground), resolve(background))).toBeGreaterThanOrEqual(3);
  });
});
