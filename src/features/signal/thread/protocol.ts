import type { NotificacionLatido } from '../../acquisition/contract';
import type { ContextoDibujo, DimensionesLienzo } from '../../signal/drawing/drawTachogram';
import { VARIABLES_PALETA, type PaletaGrafica } from '../../signal/drawing/palette';
import type { CalidadSenal, ResultadoIndices } from '../processing/SignalProcessor';

/** Lo que el hilo de señal necesita del lienzo transferido (un OffscreenCanvas). */
export interface LienzoHilo {
  width: number;
  height: number;
  getContext(tipo: '2d'): ContextoDibujo | null;
}

/** Mensajes del hilo principal al hilo de señal. */
export type MensajeHaciaHilo =
  | { readonly tipo: 'notificacion'; readonly notificacion: NotificacionLatido }
  | { readonly tipo: 'reiniciar' }
  | {
      readonly tipo: 'iniciar-lienzo';
      readonly lienzo: LienzoHilo;
      readonly paleta: PaletaGrafica;
      readonly dimensiones: DimensionesLienzo;
    }
  | { readonly tipo: 'redimensionar'; readonly dimensiones: DimensionesLienzo };

/** Mensajes del hilo de señal al hilo principal. */
export type MensajeDesdeHilo =
  | { readonly tipo: 'indices'; readonly resultado: ResultadoIndices }
  | { readonly tipo: 'error'; readonly mensaje: string };

type Registro = Record<string, unknown>;

function esRegistro(valor: unknown): valor is Registro {
  return typeof valor === 'object' && valor !== null;
}

function esNumero(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor);
}

function esNumeroONulo(valor: unknown): valor is number | null {
  return valor === null || esNumero(valor);
}

function esNotificacion(valor: unknown): valor is NotificacionLatido {
  return (
    esRegistro(valor) &&
    esNumero(valor.tiempoMs) &&
    esNumero(valor.frecuenciaCardiaca) &&
    Array.isArray(valor.intervalosRRms) &&
    valor.intervalosRRms.every(esNumero) &&
    (valor.contactoSensor === null || typeof valor.contactoSensor === 'boolean')
  );
}

function esTextoNoVacio(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.trim() !== '';
}

function esPaleta(valor: unknown): valor is PaletaGrafica {
  return (
    esRegistro(valor) &&
    esTextoNoVacio(valor.fuente) &&
    Object.keys(VARIABLES_PALETA).every((clave) => esTextoNoVacio(valor[clave]))
  );
}

function esDimensiones(valor: unknown): valor is DimensionesLienzo {
  return (
    esRegistro(valor) &&
    esNumero(valor.anchoCss) &&
    esNumero(valor.altoCss) &&
    esNumero(valor.escala) &&
    valor.anchoCss >= 0 &&
    valor.altoCss >= 0 &&
    valor.escala > 0
  );
}

function esLienzo(valor: unknown): valor is LienzoHilo {
  return (
    esRegistro(valor) &&
    typeof valor.getContext === 'function' &&
    esNumero(valor.width) &&
    esNumero(valor.height)
  );
}

const CALIDADES: readonly CalidadSenal[] = ['reuniendo', 'buena', 'baja'];

function esResultado(valor: unknown): valor is ResultadoIndices {
  return (
    esRegistro(valor) &&
    esNumero(valor.tiempoMs) &&
    esNumeroONulo(valor.fcMedia) &&
    esNumeroONulo(valor.rmssd) &&
    esNumeroONulo(valor.sdnn) &&
    esNumero(valor.duracionNNms) &&
    esNumero(valor.coberturaMs) &&
    esNumero(valor.latidosAceptados) &&
    esNumero(valor.latidosDescartados) &&
    CALIDADES.some((calidad) => calidad === valor.calidad)
  );
}

/** Valida en la frontera un mensaje recibido por el hilo de señal. */
export function esMensajeHaciaHilo(valor: unknown): valor is MensajeHaciaHilo {
  if (!esRegistro(valor)) {
    return false;
  }
  switch (valor.tipo) {
    case 'notificacion':
      return esNotificacion(valor.notificacion);
    case 'reiniciar':
      return true;
    case 'iniciar-lienzo':
      return esLienzo(valor.lienzo) && esPaleta(valor.paleta) && esDimensiones(valor.dimensiones);
    case 'redimensionar':
      return esDimensiones(valor.dimensiones);
    default:
      return false;
  }
}

/** Valida en la frontera un mensaje recibido por el hilo principal. */
export function esMensajeDesdeHilo(valor: unknown): valor is MensajeDesdeHilo {
  if (!esRegistro(valor)) {
    return false;
  }
  switch (valor.tipo) {
    case 'indices':
      return esResultado(valor.resultado);
    case 'error':
      return typeof valor.mensaje === 'string';
    default:
      return false;
  }
}
