/**
 * Chart design values: colors, typography and lengths. They come from the CSS
 * variables in src/index.css, read on the main thread and sent to the Worker,
 * which has no DOM access: this way the Worker contains no hand-written color
 * or size.
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
  /** Plot margins, in CSS pixels; the right one leaves room for the centred label of the last minute. */
  readonly marginLeft: number;
  readonly marginRight: number;
  readonly marginTop: number;
  readonly marginBottom: number;
  /** Gap between an axis and its tick labels, in CSS pixels. */
  readonly labelOffset: number;
  /** Distance between the diagonal lines that hatch a low-quality segment, in CSS pixels. */
  readonly hatchSpacing: number;
  /** Half the side of the × that marks a discarded beat, in CSS pixels. */
  readonly markerHalfSize: number;
  /** Stroke widths of each chart element, in CSS pixels. */
  readonly lineWidthGrid: number;
  readonly lineWidthHatch: number;
  readonly lineWidthSeries: number;
  readonly lineWidthDiscarded: number;
}

/** Palette fields whose value has the given type. */
type KeysWith<Value> = {
  [Key in keyof ChartPalette]: ChartPalette[Key] extends Value ? Key : never;
}[keyof ChartPalette];

type PaletteColor = Exclude<KeysWith<string>, 'font'>;
type PaletteLength = KeysWith<number>;

/** CSS variable each palette color comes from. */
export const PALETTE_VARIABLES: Readonly<Record<PaletteColor, string>> = {
  line: '--color-chart-line',
  grid: '--color-chart-grid',
  text: '--color-chart-text',
  discarded: '--color-chart-discarded',
  lowQualityBackground: '--color-chart-low-quality-background',
  lowQualityHatch: '--color-chart-low-quality-hatch',
};

/** CSS variable each palette length comes from. */
export const PALETTE_LENGTH_VARIABLES: Readonly<Record<PaletteLength, string>> = {
  marginLeft: '--chart-margin-left',
  marginRight: '--chart-margin-right',
  marginTop: '--chart-margin-top',
  marginBottom: '--chart-margin-bottom',
  labelOffset: '--chart-label-offset',
  hatchSpacing: '--chart-hatch-spacing',
  markerHalfSize: '--chart-marker-half-size',
  lineWidthGrid: '--chart-line-width-grid',
  lineWidthHatch: '--chart-line-width-hatch',
  lineWidthSeries: '--chart-line-width-series',
  lineWidthDiscarded: '--chart-line-width-discarded',
};

export const FAMILY_VARIABLE = '--font-base';
export const SIZE_VARIABLE = '--text-sm';

/** Why the palette could not be read; the panel words it from the dictionary (ADR-25). */
export const CHART_PALETTE_ERROR_CODES = ['missing_variable', 'invalid_font_size', 'invalid_length'] as const;
export type ChartPaletteErrorCode = (typeof CHART_PALETTE_ERROR_CODES)[number];

const DEVELOPER_MESSAGES: Readonly<Record<ChartPaletteErrorCode, (detail: string) => string>> = {
  missing_variable: (detail) => `Missing CSS variable ${detail}.`,
  invalid_font_size: (detail) => `Invalid font size: ${detail}.`,
  invalid_length: (detail) => `CSS variable ${detail} is not a positive px or rem length.`,
};

/** A palette variable is missing or unreadable: the chart cannot be drawn faithfully. */
export class ChartPaletteError extends Error {
  readonly code: ChartPaletteErrorCode;
  /**
   * The CSS variable that is missing or is not a positive length, or the font
   * size that could not be parsed.
   */
  readonly detail: string;

  constructor(code: ChartPaletteErrorCode, detail: string) {
    super(DEVELOPER_MESSAGES[code](detail));
    this.name = 'ChartPaletteError';
    this.code = code;
    this.detail = detail;
  }
}

/** The only part of the computed styles that is needed; makes testing easier. */
export type ComputedStyles = Pick<CSSStyleDeclaration, 'getPropertyValue'>;

function readVariable(styles: ComputedStyles, name: string): string {
  const value = styles.getPropertyValue(name).trim();
  if (value === '') {
    throw new ChartPaletteError('missing_variable', name);
  }
  return value;
}

/**
 * Converts a px or rem length to px, or gives null when it is neither; the
 * Worker has no root element to resolve rem.
 */
function lengthInPx(value: string, styles: ComputedStyles): number | null {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  if (value.endsWith('px')) {
    return parsed;
  }
  if (value.endsWith('rem')) {
    const rootPx = Number.parseFloat(styles.getPropertyValue('font-size'));
    return Number.isFinite(rootPx) ? parsed * rootPx : null;
  }
  return null;
}

function fontSizeInPx(styles: ComputedStyles): number {
  const value = readVariable(styles, SIZE_VARIABLE);
  const size = lengthInPx(value, styles);
  if (size === null) {
    throw new ChartPaletteError('invalid_font_size', value);
  }
  return size;
}

/**
 * A chart length must be positive: canvas ignores a zero line width and a zero
 * hatch spacing would never finish the hatching.
 */
function chartLength(styles: ComputedStyles, key: PaletteLength): number {
  const name = PALETTE_LENGTH_VARIABLES[key];
  const length = lengthInPx(readVariable(styles, name), styles);
  if (length === null || length <= 0) {
    throw new ChartPaletteError('invalid_length', name);
  }
  return length;
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
  const length = (key: PaletteLength): number => chartLength(styles, key);
  const size = fontSizeInPx(styles);
  const family = readVariable(styles, FAMILY_VARIABLE);
  return {
    line: color('line'),
    grid: color('grid'),
    text: color('text'),
    discarded: color('discarded'),
    lowQualityBackground: color('lowQualityBackground'),
    lowQualityHatch: color('lowQualityHatch'),
    font: `${String(size)}px ${family}`,
    marginLeft: length('marginLeft'),
    marginRight: length('marginRight'),
    marginTop: length('marginTop'),
    marginBottom: length('marginBottom'),
    labelOffset: length('labelOffset'),
    hatchSpacing: length('hatchSpacing'),
    markerHalfSize: length('markerHalfSize'),
    lineWidthGrid: length('lineWidthGrid'),
    lineWidthHatch: length('lineWidthHatch'),
    lineWidthSeries: length('lineWidthSeries'),
    lineWidthDiscarded: length('lineWidthDiscarded'),
  };
}
