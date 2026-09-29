/**
 * Colores y tipografía de la gráfica. Salen de las variables CSS de
 * src/index.css, leídas en el hilo principal y enviadas al Worker, que no
 * tiene acceso al DOM: así el Worker no contiene ningún color escrito a mano.
 */
export interface ChartPalette {
  readonly line: string;
  readonly grid: string;
  readonly text: string;
  readonly discarded: string;
  readonly lowQualityBackground: string;
  readonly lowQualityHatch: string;
  /** Fuente completa para el canvas, por ejemplo `14px system-ui, sans-serif`. */
  readonly font: string;
}

type PaletteColor = Exclude<keyof ChartPalette, 'font'>;

/** Variable CSS de la que sale cada color de la paleta. */
export const PALETTE_VARIABLES: Readonly<Record<PaletteColor, string>> = {
  line: '--color-grafica-linea',
  grid: '--color-grafica-rejilla',
  text: '--color-grafica-texto',
  discarded: '--color-grafica-descartado',
  lowQualityBackground: '--color-grafica-baja-calidad-fondo',
  lowQualityHatch: '--color-grafica-baja-calidad-rayado',
};

export const FAMILY_VARIABLE = '--fuente-base';
export const SIZE_VARIABLE = '--texto-sm';

/** Falta una variable de la paleta: la gráfica no se puede dibujar con fidelidad. */
export class ChartPaletteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ErrorPaletaGrafica';
  }
}

/** Lo único que se necesita de los estilos calculados; facilita las pruebas. */
export type ComputedStyles = Pick<CSSStyleDeclaration, 'getPropertyValue'>;

function readVariable(styles: ComputedStyles, name: string): string {
  const value = styles.getPropertyValue(name).trim();
  if (value === '') {
    throw new ChartPaletteError(`Falta la variable CSS ${name}.`);
  }
  return value;
}

/** Convierte un tamaño en px o rem a px; en el Worker no hay elemento raíz para resolver rem. */
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
 * Lee la paleta de la gráfica desde las variables CSS del documento.
 *
 * @throws ErrorPaletaGrafica si falta alguna variable o no se puede interpretar.
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
