import type { NotificacionLatido } from '../../adquisicion/contrato';
import type { CalidadSenal, ResultadoIndices } from '../procesamiento/ProcesadorSenal';

/** Mensajes del hilo principal al hilo de señal. */
export type MensajeHaciaHilo =
  | { readonly tipo: 'notificacion'; readonly notificacion: NotificacionLatido }
  | { readonly tipo: 'reiniciar' };

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
