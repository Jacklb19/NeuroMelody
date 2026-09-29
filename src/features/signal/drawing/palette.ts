/**
 * Colores y tipografía de la gráfica. Salen de las variables CSS de
 * src/index.css, leídas en el hilo principal y enviadas al Worker, que no
 * tiene acceso al DOM: así el Worker no contiene ningún color escrito a mano.
 */
export interface PaletaGrafica {
  readonly linea: string;
  readonly rejilla: string;
  readonly texto: string;
  readonly descartado: string;
  readonly bajaCalidadFondo: string;
  readonly bajaCalidadRayado: string;
  /** Fuente completa para el canvas, por ejemplo `14px system-ui, sans-serif`. */
  readonly fuente: string;
}

type ColorPaleta = Exclude<keyof PaletaGrafica, 'fuente'>;

/** Variable CSS de la que sale cada color de la paleta. */
export const VARIABLES_PALETA: Readonly<Record<ColorPaleta, string>> = {
  linea: '--color-grafica-linea',
  rejilla: '--color-grafica-rejilla',
  texto: '--color-grafica-texto',
  descartado: '--color-grafica-descartado',
  bajaCalidadFondo: '--color-grafica-baja-calidad-fondo',
  bajaCalidadRayado: '--color-grafica-baja-calidad-rayado',
};

export const VARIABLE_FAMILIA = '--fuente-base';
export const VARIABLE_TAMANO = '--texto-sm';

/** Falta una variable de la paleta: la gráfica no se puede dibujar con fidelidad. */
export class ErrorPaletaGrafica extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorPaletaGrafica';
  }
}

/** Lo único que se necesita de los estilos calculados; facilita las pruebas. */
export type EstilosCalculados = Pick<CSSStyleDeclaration, 'getPropertyValue'>;

function leerVariable(estilos: EstilosCalculados, nombre: string): string {
  const valor = estilos.getPropertyValue(nombre).trim();
  if (valor === '') {
    throw new ErrorPaletaGrafica(`Falta la variable CSS ${nombre}.`);
  }
  return valor;
}

/** Convierte un tamaño en px o rem a px; en el Worker no hay elemento raíz para resolver rem. */
function tamanoEnPx(valor: string, estilos: EstilosCalculados): number {
  const numero = Number.parseFloat(valor);
  if (valor.endsWith('px') && Number.isFinite(numero)) {
    return numero;
  }
  if (valor.endsWith('rem') && Number.isFinite(numero)) {
    const raizPx = Number.parseFloat(estilos.getPropertyValue('font-size'));
    if (Number.isFinite(raizPx)) {
      return numero * raizPx;
    }
  }
  throw new ErrorPaletaGrafica(`Tamaño de fuente no válido: ${valor}.`);
}

/**
 * Lee la paleta de la gráfica desde las variables CSS del documento.
 *
 * @throws ErrorPaletaGrafica si falta alguna variable o no se puede interpretar.
 */
export function leerPaletaGrafica(
  estilos: EstilosCalculados = getComputedStyle(document.documentElement),
): PaletaGrafica {
  const color = (clave: ColorPaleta): string => leerVariable(estilos, VARIABLES_PALETA[clave]);
  const tamano = tamanoEnPx(leerVariable(estilos, VARIABLE_TAMANO), estilos);
  const familia = leerVariable(estilos, VARIABLE_FAMILIA);
  return {
    linea: color('linea'),
    rejilla: color('rejilla'),
    texto: color('texto'),
    descartado: color('descartado'),
    bajaCalidadFondo: color('bajaCalidadFondo'),
    bajaCalidadRayado: color('bajaCalidadRayado'),
    fuente: `${String(tamano)}px ${familia}`,
  };
}
