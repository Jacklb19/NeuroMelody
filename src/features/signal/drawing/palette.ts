/**
 * Chart colors and typography. They come from the CSS variables in
 * src/index.css, read on the main thread and sent to the Worker, which has no
 * DOM access: this way the Worker contains no hand-written color.
 */
export interface ChartPalette {
  readonly line: string;
  readonly grid: string;
  readonly text: string;
  readonly discarded: string;
  readonly lowQualityBackground: string;
  readonly lowQualityHatch: string;
  /** Full canvas font, for example `14px system-ui, sans-serif`. */
  readonly font: string;
}

type PaletteColor = Exclude<keyof ChartPalette, 'font'>;

/** CSS variable each palette color comes from. */
export const PALETTE_VARIABLES: Readonly<Record<PaletteColor, string>> = {
  line: '--color-chart-line',
  grid: '--color-chart-grid',
  text: '--color-chart-text',
  discarded: '--color-chart-discarded',
  lowQualityBackground: '--color-chart-low-quality-background',
  lowQualityHatch: '--color-chart-low-quality-hatch',
};

export const FAMILY_VARIABLE = '--font-base';
export const SIZE_VARIABLE = '--text-sm';

/** A palette variable is missing: the chart cannot be drawn faithfully. */
export class ChartPaletteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChartPaletteError';
  }
}

/** The only part of the computed styles that is needed; makes testing easier. */
export type ComputedStyles = Pick<CSSStyleDeclaration, 'getPropertyValue'>;

function readVariable(styles: ComputedStyles, name: string): string {
  const value = styles.getPropertyValue(name).trim();
  if (value === '') {
    throw new ChartPaletteError(`Falta la variable CSS ${name}.`);
  }
  return value;
}

/** Converts a px or rem size to px; the Worker has no root element to resolve rem. */
function sizeInPx(value: string, styles: ComputedStyles): number {
  const parsed = Number.parseFloat(value);
  if (value.endsWith('px') && Number.isFinite(parsed)) {
    return parsed;
  }
  if (value.endsWith('rem') && Number.isFinite(parsed)) {
    const rootPx = Number.parseFloat(styles.getPropertyValue('font-size'));
    if (Number.isFinite(rootPx)) {
      return parsed * rootPx;
    }
  }
  throw new ChartPaletteError(`Tamaño de fuente no válido: ${value}.`);
}

/**
 * Reads the chart palette from the document's CSS variables.
 *
 * @throws ChartPaletteError if any variable is missing or cannot be parsed.
 */
export function readChartPalette(
  styles: ComputedStyles = getComputedStyle(document.documentElement),
): ChartPalette {
  const color = (key: PaletteColor): string => readVariable(styles, PALETTE_VARIABLES[key]);
  const size = sizeInPx(readVariable(styles, SIZE_VARIABLE), styles);
  const family = readVariable(styles, FAMILY_VARIABLE);
  return {
    line: color('line'),
    grid: color('grid'),
    text: color('text'),
    discarded: color('discarded'),
    lowQualityBackground: color('lowQualityBackground'),
    lowQualityHatch: color('lowQualityHatch'),
    font: `${String(size)}px ${family}`,
  };
}
