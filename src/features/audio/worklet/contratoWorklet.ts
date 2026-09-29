/**
 * Contrato compartido entre el hilo principal y los procesadores del
 * AudioWorklet: nombres de registro, parámetros y opciones de creación.
 * No importa nada del ámbito del worklet, para poder usarse en ambos lados.
 */
import { MODO, esModo, type Modo } from '../nucleo/teoria';

export const NOMBRE_SINTETIZADOR = 'sintetizador-neuromelody';
export const NOMBRE_RECORTADOR = 'recortador-neuromelody';

/** Descriptor de un AudioParam propio (la biblioteca DOM de TypeScript no lo declara). */
interface DescriptorParametro {
  readonly name: string;
  readonly defaultValue: number;
  readonly minValue: number;
  readonly maxValue: number;
  readonly automationRate: AutomationRate;
}

/**
 * Parámetros del sintetizador como `AudioParam`: el hilo principal programa
 * rampas y el hilo de audio las interpola sin mensajes (ADR-07). Son de tasa
 * k (un valor por bloque de 128 muestras), suficiente para tempo, modo y capas.
 */
export const DESCRIPTORES_SINTETIZADOR = [
  { name: 'tempo', defaultValue: 66, minValue: 40, maxValue: 120, automationRate: 'k-rate' },
  { name: 'modo', defaultValue: MODO.lidio, minValue: 0, maxValue: 2, automationRate: 'k-rate' },
  { name: 'capas', defaultValue: 2, minValue: 1, maxValue: 3, automationRate: 'k-rate' },
] as const satisfies readonly DescriptorParametro[];

export type NombreParametro = (typeof DESCRIPTORES_SINTETIZADOR)[number]['name'];

export interface OpcionesSintetizador {
  readonly semilla: number;
  readonly modoInicial: Modo;
  readonly capasIniciales: number;
}

export interface OpcionesRecortador {
  /** Búfer de telemetría; `null` si no hay aislamiento de origen cruzado. */
  readonly telemetria: SharedArrayBuffer | null;
}

type Registro = Record<string, unknown>;

function esRegistro(valor: unknown): valor is Registro {
  return typeof valor === 'object' && valor !== null;
}

/** Valida en la frontera las opciones que llegan al procesador. */
export function leerOpcionesSintetizador(valor: unknown): OpcionesSintetizador {
  if (
    !esRegistro(valor) ||
    typeof valor.semilla !== 'number' ||
    !Number.isInteger(valor.semilla) ||
    typeof valor.modoInicial !== 'number' ||
    !esModo(valor.modoInicial) ||
    typeof valor.capasIniciales !== 'number' ||
    valor.capasIniciales < 1 ||
    valor.capasIniciales > 3
  ) {
    throw new TypeError('Opciones del sintetizador no válidas.');
  }
  return {
    semilla: valor.semilla,
    modoInicial: valor.modoInicial,
    capasIniciales: valor.capasIniciales,
  };
}

export function leerOpcionesRecortador(valor: unknown): OpcionesRecortador {
  if (!esRegistro(valor)) {
    throw new TypeError('Opciones del recortador no válidas.');
  }
  const { telemetria } = valor;
  if (telemetria !== null && !(telemetria instanceof SharedArrayBuffer)) {
    throw new TypeError('La telemetría debe ser un SharedArrayBuffer o null.');
  }
  return { telemetria };
}
