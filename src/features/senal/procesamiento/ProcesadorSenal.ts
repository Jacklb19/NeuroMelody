import type { NotificacionLatido } from '../../adquisicion/contrato';
import { aceptacionBaja } from './calidadSenal';
import { FiltroLatidos } from './FiltroLatidos';
import { calcularIndicesTemporales } from './indicesTemporales';
import type { LatidoClasificado, TramoBajaCalidad } from './tipos';
import {
  HUECO_MAXIMO_MS,
  NN_MINIMO_PARA_INDICES_MS,
  PERIODO_CALCULO_MS,
  VENTANA_ANALISIS_MS,
} from './umbrales';
import { VentanaDeslizante } from './VentanaDeslizante';

/** Estado de la señal que ve el usuario (siempre en lenguaje descriptivo). */
export type CalidadSenal = 'reuniendo' | 'buena' | 'baja';

/** Resultado publicado cada 5 s de señal (RF-05). */
export interface ResultadoIndices {
  readonly tiempoMs: number;
  /** Los índices son `null` mientras no haya 60 s de NN válidos en la ventana. */
  readonly fcMedia: number | null;
  readonly rmssd: number | null;
  readonly sdnn: number | null;
  readonly duracionNNms: number;
  /** Parte de la ventana de 5 min ya cubierta por la señal. */
  readonly coberturaMs: number;
  readonly latidosAceptados: number;
  readonly latidosDescartados: number;
  readonly calidad: CalidadSenal;
}

/** Contenido de la ventana, para dibujarlo. */
export interface InstantaneaVentana {
  readonly tiempoMs: number;
  readonly latidos: readonly LatidoClasificado[];
  readonly tramos: readonly TramoBajaCalidad[];
}

/**
 * Procesamiento completo del hilo de señal, sin dependencias del Worker para
 * poder probarlo de forma determinista.
 *
 * Por cada notificación: clasifica los RR (RF-04), marca huecos, pérdidas de
 * contacto y tramos con poca aceptación, y mantiene la ventana de 5 min.
 * Cada vez que el tiempo de señal cruza un múltiplo de 5 s publica los
 * índices (RF-05). La cadencia depende del tiempo de señal y no de
 * temporizadores, así que es la misma a cualquier velocidad.
 */
export class ProcesadorSenal {
  readonly #alIndices: (resultado: ResultadoIndices) => void;
  readonly #filtro = new FiltroLatidos();
  readonly #ventana = new VentanaDeslizante();
  #ultimoTiempoMs = 0;
  #ultimoRRMs = 0;
  #proximoCalculoMs = PERIODO_CALCULO_MS;
  /** Hubo un hueco o pérdida de contacto desde el último latido. */
  #continuidadRota = false;
  #bajaAhora = false;

  constructor(alIndices: (resultado: ResultadoIndices) => void) {
    this.#alIndices = alIndices;
  }

  get instantanea(): InstantaneaVentana {
    return {
      tiempoMs: this.#ultimoTiempoMs,
      latidos: this.#ventana.latidos,
      tramos: this.#ventana.tramos,
    };
  }

  procesar(notificacion: NotificacionLatido): void {
    const { tiempoMs } = notificacion;
    const anteriorMs = this.#ultimoTiempoMs;
    let baja = false;

    if (tiempoMs - this.#ultimoRRMs > HUECO_MAXIMO_MS) {
      this.#ventana.agregarTramo({ inicioMs: this.#ultimoRRMs, finMs: tiempoMs });
      this.#continuidadRota = true;
      baja = true;
    }

    if (notificacion.contactoSensor === false) {
      this.#ventana.agregarTramo({ inicioMs: anteriorMs, finMs: tiempoMs });
      this.#continuidadRota = true;
      baja = true;
      this.#agregarLatidos(notificacion, () => ({
        aceptado: false,
        motivoDescarte: 'sin_contacto',
      }));
    } else if (notificacion.intervalosRRms.length > 0) {
      this.#agregarLatidos(notificacion, (rr) => this.#filtro.clasificar(rr));
      this.#ultimoRRMs = tiempoMs;
    }

    if (aceptacionBaja(this.#ventana.latidos, tiempoMs)) {
      this.#ventana.agregarTramo({ inicioMs: anteriorMs, finMs: tiempoMs });
      baja = true;
    }

    this.#bajaAhora = baja;
    this.#ultimoTiempoMs = tiempoMs;
    this.#ventana.podar(tiempoMs);

    if (tiempoMs >= this.#proximoCalculoMs) {
      this.#alIndices(this.#calcular(tiempoMs));
      while (this.#proximoCalculoMs <= tiempoMs) {
        this.#proximoCalculoMs += PERIODO_CALCULO_MS;
      }
    }
  }

  /** Vuelve al estado inicial; se usa al iniciar una nueva conexión. */
  reiniciar(): void {
    this.#filtro.reiniciar();
    this.#ventana.vaciar();
    this.#ultimoTiempoMs = 0;
    this.#ultimoRRMs = 0;
    this.#proximoCalculoMs = PERIODO_CALCULO_MS;
    this.#continuidadRota = false;
    this.#bajaAhora = false;
  }

  /**
   * La notificación no dice cuándo terminó cada latido, solo que terminaron
   * antes de ella: se asume que el último termina en el instante de la
   * notificación y los anteriores se ubican hacia atrás (error < 1 s).
   */
  #agregarLatidos(
    notificacion: NotificacionLatido,
    clasificar: (rrMs: number) => Pick<LatidoClasificado, 'aceptado' | 'motivoDescarte'>,
  ): void {
    const rr = notificacion.intervalosRRms;
    let finMs = notificacion.tiempoMs - rr.reduce((suma, valor) => suma + valor, 0);
    for (const rrMs of rr) {
      finMs += rrMs;
      this.#ventana.agregarLatido({
        finMs,
        rrMs,
        ...clasificar(rrMs),
        contiguoAlAnterior: !this.#continuidadRota,
      });
      this.#continuidadRota = false;
    }
  }

  #calcular(tiempoMs: number): ResultadoIndices {
    const latidos = this.#ventana.latidos;
    const indices = calcularIndicesTemporales(latidos);
    const suficiente = indices.duracionNNms >= NN_MINIMO_PARA_INDICES_MS;
    let calidad: CalidadSenal = suficiente ? 'buena' : 'reuniendo';
    if (this.#bajaAhora) {
      calidad = 'baja';
    }
    return {
      tiempoMs,
      fcMedia: suficiente ? indices.fcMedia : null,
      rmssd: suficiente ? indices.rmssd : null,
      sdnn: suficiente ? indices.sdnn : null,
      duracionNNms: indices.duracionNNms,
      coberturaMs: Math.min(tiempoMs, VENTANA_ANALISIS_MS),
      latidosAceptados: indices.nnValidos,
      latidosDescartados: latidos.length - indices.nnValidos,
      calidad,
    };
  }
}
