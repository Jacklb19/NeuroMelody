/**
 * Escenarios del simulador (RF-02, HU-02). Los valores fueron aprobados en la
 * planificación del sprint 1; el RMSSD esperado es aproximado y sirve de
 * referencia para las pruebas.
 */

/** Parámetros del modelo de la serie RR en un instante dado. */
export interface ParametrosFisiologicos {
  /** Frecuencia cardíaca media, en latidos por minuto. */
  readonly fcMedia: number;
  /** Amplitud de la oscilación respiratoria (banda HF, 0,25 Hz), en ms. */
  readonly amplitudRespiratoriaMs: number;
  /** Amplitud de la onda de Mayer (banda LF, 0,1 Hz), en ms. */
  readonly amplitudMayerMs: number;
  /** Desviación estándar del ruido gaussiano latido a latido, en ms. */
  readonly ruidoMs: number;
}

export type IdEscenario = 'reposo' | 'activacion' | 'relajacion_progresiva';

export interface Escenario {
  readonly id: IdEscenario;
  /** Nombre descriptivo (no clínico) que muestra la interfaz. */
  readonly nombre: string;
  /** Parámetros vigentes a los `tiempoMs` de señal desde la conexión. */
  parametrosEn(tiempoMs: number): ParametrosFisiologicos;
}

/** RMSSD esperado ≈ 45 ms. */
export const PARAMETROS_REPOSO: ParametrosFisiologicos = {
  fcMedia: 62,
  amplitudRespiratoriaMs: 40,
  amplitudMayerMs: 25,
  ruidoMs: 15,
};

/** RMSSD esperado ≈ 10 ms. */
export const PARAMETROS_ACTIVACION: ParametrosFisiologicos = {
  fcMedia: 92,
  amplitudRespiratoriaMs: 8,
  amplitudMayerMs: 15,
  ruidoMs: 5,
};

/** Duración de la transición del escenario de relajación progresiva. */
export const DURACION_RELAJACION_MS = 10 * 60 * 1000;

function interpolar(a: number, b: number, fraccion: number): number {
  return a + (b - a) * fraccion;
}

function interpolarParametros(
  desde: ParametrosFisiologicos,
  hasta: ParametrosFisiologicos,
  fraccion: number,
): ParametrosFisiologicos {
  return {
    fcMedia: interpolar(desde.fcMedia, hasta.fcMedia, fraccion),
    amplitudRespiratoriaMs: interpolar(
      desde.amplitudRespiratoriaMs,
      hasta.amplitudRespiratoriaMs,
      fraccion,
    ),
    amplitudMayerMs: interpolar(desde.amplitudMayerMs, hasta.amplitudMayerMs, fraccion),
    ruidoMs: interpolar(desde.ruidoMs, hasta.ruidoMs, fraccion),
  };
}

export const ESCENARIOS: Readonly<Record<IdEscenario, Escenario>> = {
  reposo: {
    id: 'reposo',
    nombre: 'Reposo',
    parametrosEn: () => PARAMETROS_REPOSO,
  },
  activacion: {
    id: 'activacion',
    nombre: 'Activación',
    parametrosEn: () => PARAMETROS_ACTIVACION,
  },
  relajacion_progresiva: {
    id: 'relajacion_progresiva',
    nombre: 'Relajación progresiva',
    // Pasa linealmente de activación a reposo y luego se mantiene en reposo.
    parametrosEn: (tiempoMs) =>
      interpolarParametros(
        PARAMETROS_ACTIVACION,
        PARAMETROS_REPOSO,
        Math.min(Math.max(tiempoMs / DURACION_RELAJACION_MS, 0), 1),
      ),
  },
};

export const IDS_ESCENARIOS: readonly IdEscenario[] = [
  'reposo',
  'activacion',
  'relajacion_progresiva',
];
