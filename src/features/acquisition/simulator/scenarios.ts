/**
 * Escenarios del simulador (RF-02, HU-02). Los valores fueron aprobados en la
 * planificación del sprint 1; el RMSSD esperado es aproximado y sirve de
 * referencia para las pruebas.
 */

/** Parámetros del modelo de la serie RR en un instante dado. */
export interface PhysiologicalParams {
  /** Frecuencia cardíaca media, en latidos por minuto. */
  readonly meanHr: number;
  /** Amplitud de la oscilación respiratoria (banda HF, 0,25 Hz), en ms. */
  readonly respiratoryAmplitudeMs: number;
  /** Amplitud de la onda de Mayer (banda LF, 0,1 Hz), en ms. */
  readonly mayerAmplitudeMs: number;
  /** Desviación estándar del ruido gaussiano latido a latido, en ms. */
  readonly noiseMs: number;
}

export type ScenarioId = 'reposo' | 'activacion' | 'relajacion_progresiva' | 'artefactos';

/**
 * Fallos de lectura simulados para probar el filtrado (RF-04): latidos
 * prematuros seguidos de uno compensatorio y pérdidas periódicas de contacto.
 */
export interface ArtifactConfig {
  /** Probabilidad de que un latido sea prematuro. */
  readonly prematureProbability: number;
  /** Duración del latido prematuro como fracción del RR normal. */
  readonly prematureFraction: number;
  /** Cada cuánto tiempo de señal se pierde el contacto del sensor. */
  readonly contactLossPeriodMs: number;
  /** Cuánto dura cada pérdida de contacto. */
  readonly contactLossDurationMs: number;
}

export interface Scenario {
  readonly id: ScenarioId;
  /** Nombre descriptivo (no clínico) que muestra la interfaz. */
  readonly name: string;
  /** Parámetros vigentes a los `tiempoMs` de señal desde la conexión. */
  paramsAt(timeMs: number): PhysiologicalParams;
  /** Fallos de lectura simulados; `null` en los escenarios limpios. */
  readonly artifacts: ArtifactConfig | null;
}

/** RMSSD esperado ≈ 45 ms. */
export const REST_PARAMS: PhysiologicalParams = {
  meanHr: 62,
  respiratoryAmplitudeMs: 40,
  mayerAmplitudeMs: 25,
  noiseMs: 15,
};

/** RMSSD esperado ≈ 10 ms. */
export const ACTIVATION_PARAMS: PhysiologicalParams = {
  meanHr: 92,
  respiratoryAmplitudeMs: 8,
  mayerAmplitudeMs: 15,
  noiseMs: 5,
};

/** Valores aprobados en el sprint 2 (docs/propuestas.md). */
export const DEFAULT_ARTIFACTS: ArtifactConfig = {
  prematureProbability: 0.02,
  prematureFraction: 0.7,
  contactLossPeriodMs: 90_000,
  contactLossDurationMs: 5000,
};

/** Duración de la transición del escenario de relajación progresiva. */
export const RELAXATION_DURATION_MS = 10 * 60 * 1000;

function interpolate(a: number, b: number, fraction: number): number {
  return a + (b - a) * fraction;
}

function interpolateParameters(
  from: PhysiologicalParams,
  to: PhysiologicalParams,
  fraction: number,
): PhysiologicalParams {
  return {
    meanHr: interpolate(from.meanHr, to.meanHr, fraction),
    respiratoryAmplitudeMs: interpolate(
      from.respiratoryAmplitudeMs,
      to.respiratoryAmplitudeMs,
      fraction,
    ),
    mayerAmplitudeMs: interpolate(from.mayerAmplitudeMs, to.mayerAmplitudeMs, fraction),
    noiseMs: interpolate(from.noiseMs, to.noiseMs, fraction),
  };
}

export const SCENARIOS: Readonly<Record<ScenarioId, Scenario>> = {
  reposo: {
    id: 'reposo',
    name: 'Reposo',
    paramsAt: () => REST_PARAMS,
    artifacts: null,
  },
  activacion: {
    id: 'activacion',
    name: 'Activación',
    paramsAt: () => ACTIVATION_PARAMS,
    artifacts: null,
  },
  relajacion_progresiva: {
    id: 'relajacion_progresiva',
    name: 'Relajación progresiva',
    // Pasa linealmente de activación a reposo y luego se mantiene en reposo.
    paramsAt: (timeMs) =>
      interpolateParameters(
        ACTIVATION_PARAMS,
        REST_PARAMS,
        Math.min(Math.max(timeMs / RELAXATION_DURATION_MS, 0), 1),
      ),
    artifacts: null,
  },
  artefactos: {
    id: 'artefactos',
    // Describe el dispositivo, no el cuerpo: la interfaz no interpreta la señal.
    name: 'Reposo con fallos de lectura',
    paramsAt: () => REST_PARAMS,
    artifacts: DEFAULT_ARTIFACTS,
  },
};

export const SCENARIO_IDS: readonly ScenarioId[] = [
  'reposo',
  'activacion',
  'relajacion_progresiva',
  'artefactos',
];
