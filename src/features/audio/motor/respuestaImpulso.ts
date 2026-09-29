import { crearAleatorio } from '../../adquisicion/simulador/prng';

export interface OpcionesRespuesta {
  readonly duracionS: number;
  /** Tiempo en que la cola cae 60 dB. */
  readonly rt60S: number;
  readonly semilla: number;
}

export const RESPUESTA_POR_OMISION: OpcionesRespuesta = { duracionS: 3.5, rt60S: 2.8, semilla: 20260929 };

/** Ln(1000): una caída de 60 dB en amplitud. */
const CAIDA_60_DB = Math.log(1000);
const FUNDIDO_ENTRADA_S = 0.005;

/**
 * Respuesta al impulso estéreo generada en código (ruido con caída
 * exponencial), sin archivos externos. Cada canal usa una secuencia distinta
 * para dar amplitud estéreo. Es determinista para una misma semilla.
 */
export function generarRespuestaImpulso(
  frecuenciaMuestreo: number,
  opciones: OpcionesRespuesta = RESPUESTA_POR_OMISION,
): [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>] {
  const longitud = Math.round(opciones.duracionS * frecuenciaMuestreo);
  const muestrasFundido = Math.max(1, Math.round(FUNDIDO_ENTRADA_S * frecuenciaMuestreo));
  const canales: [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>] = [
    new Float32Array(longitud),
    new Float32Array(longitud),
  ];

  canales.forEach((canal, indice) => {
    const aleatorio = crearAleatorio(opciones.semilla + indice);
    for (let i = 0; i < longitud; i++) {
      const t = i / frecuenciaMuestreo;
      const caida = Math.exp((-CAIDA_60_DB * t) / opciones.rt60S);
      // Entrada suave de 5 ms para que la cola no empiece con un chasquido.
      const entrada = Math.min(1, i / muestrasFundido);
      canal[i] = (aleatorio() * 2 - 1) * caida * entrada;
    }
  });
  return canales;
}
