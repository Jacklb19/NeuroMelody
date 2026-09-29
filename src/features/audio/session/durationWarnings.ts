/**
 * Avisos de duración (RF-18, RNF-06): al llegar a la duración del plan y,
 * si se continúa, cada 60 minutos continuos. Si no hay respuesta en 2
 * minutos, un fundido de 20 s termina la sesión.
 */
export const RESPONSE_WAIT_S = 120;
export const CONTINUOUS_WARNING_PERIOD_S = 60 * 60;

/**
 * Instante del aviso número `indice` (0 = fin del plan), en segundos de
 * reproducción desde el inicio de la sesión.
 */
export function warningInstantS(planDurationS: number, index: number): number {
  let instant = planDurationS;
  for (let i = 0; i < index; i++) {
    instant = (Math.floor(instant / CONTINUOUS_WARNING_PERIOD_S) + 1) * CONTINUOUS_WARNING_PERIOD_S;
  }
  return instant;
}

/** Instante en que empieza el fundido si nadie responde al aviso `indice`. */
export function fadeStartS(planDurationS: number, index: number): number {
  return warningInstantS(planDurationS, index) + RESPONSE_WAIT_S;
}
