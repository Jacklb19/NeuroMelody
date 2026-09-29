/**
 * Avisos de duración (RF-18, RNF-06): al llegar a la duración del plan y,
 * si se continúa, cada 60 minutos continuos. Si no hay respuesta en 2
 * minutos, un fundido de 20 s termina la sesión.
 */
export const ESPERA_RESPUESTA_S = 120;
export const PERIODO_AVISO_CONTINUO_S = 60 * 60;

/**
 * Instante del aviso número `indice` (0 = fin del plan), en segundos de
 * reproducción desde el inicio de la sesión.
 */
export function instanteAvisoS(duracionPlanS: number, indice: number): number {
  let instante = duracionPlanS;
  for (let i = 0; i < indice; i++) {
    instante = (Math.floor(instante / PERIODO_AVISO_CONTINUO_S) + 1) * PERIODO_AVISO_CONTINUO_S;
  }
  return instante;
}

/** Instante en que empieza el fundido si nadie responde al aviso `indice`. */
export function inicioFundidoS(duracionPlanS: number, indice: number): number {
  return instanteAvisoS(duracionPlanS, indice) + ESPERA_RESPUESTA_S;
}
