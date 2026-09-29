import type { FuenteSenal } from '../../acquisition/contract';
import type { DimensionesLienzo } from '../../signal/drawing/drawTachogram';
import type { PaletaGrafica } from '../../signal/drawing/palette';
import type { ResultadoIndices } from '../processing/SignalProcessor';
import { esMensajeDesdeHilo, type MensajeHaciaHilo } from './protocol';

/** Canal con el hilo de señal; inyectable para probar sin un Worker real. */
export interface PuertoHilo {
  enviar(mensaje: MensajeHaciaHilo, transferibles?: Transferable[]): void;
  alRecibir(receptor: (dato: unknown) => void): void;
  terminar(): void;
}

/** Puerto sobre el Worker real, empaquetado por Vite como archivo del mismo origen. */
export function crearPuertoWorker(): PuertoHilo {
  const worker = new Worker(new URL('./signal.worker.ts', import.meta.url), {
    type: 'module',
  });
  return {
    enviar: (mensaje, transferibles = []) => {
      worker.postMessage(mensaje, transferibles);
    },
    alRecibir: (receptor) => {
      worker.onmessage = (evento: MessageEvent<unknown>) => {
        receptor(evento.data);
      };
      worker.onerror = (evento) => {
        receptor({ tipo: 'error', mensaje: evento.message });
      };
      worker.onmessageerror = () => {
        receptor({ tipo: 'error', mensaje: 'No se pudo leer un mensaje del hilo de señal.' });
      };
    },
    terminar: () => {
      worker.terminate();
    },
  };
}

export interface ObservadorHiloSenal {
  readonly alIndices?: (resultado: ResultadoIndices) => void;
  readonly alError?: (mensaje: string) => void;
}

/**
 * Lado del hilo principal: reenvía las notificaciones de la fuente al hilo
 * de señal y reparte sus resultados. No hace ningún cálculo (RNF-04).
 */
export class ClienteHiloSenal {
  readonly #puerto: PuertoHilo;
  readonly #observadores = new Set<ObservadorHiloSenal>();

  constructor(puerto: PuertoHilo) {
    this.#puerto = puerto;
    puerto.alRecibir((dato) => {
      this.#recibir(dato);
    });
  }

  /** Conecta una fuente: el hilo de señal se reinicia con cada nueva conexión. */
  conectarFuente(fuente: FuenteSenal): () => void {
    this.#puerto.enviar({ tipo: 'reiniciar' });
    return fuente.suscribir({
      alNotificar: (notificacion) => {
        this.#puerto.enviar({ tipo: 'notificacion', notificacion });
      },
      alCambiarEstado: (estado) => {
        // conectar() reinicia el tiempo de señal en 0.
        if (estado === 'conectando') {
          this.#puerto.enviar({ tipo: 'reiniciar' });
        }
      },
    });
  }

  /**
   * Transfiere el lienzo al hilo de señal, que dibuja en él a partir de ese
   * momento. La paleta se lee en el hilo principal, donde están las variables CSS.
   */
  adjuntarLienzo(
    lienzo: OffscreenCanvas,
    paleta: PaletaGrafica,
    dimensiones: DimensionesLienzo,
  ): void {
    this.#puerto.enviar({ tipo: 'iniciar-lienzo', lienzo, paleta, dimensiones }, [lienzo]);
  }

  redimensionar(dimensiones: DimensionesLienzo): void {
    this.#puerto.enviar({ tipo: 'redimensionar', dimensiones });
  }

  suscribir(observador: ObservadorHiloSenal): () => void {
    this.#observadores.add(observador);
    return () => {
      this.#observadores.delete(observador);
    };
  }

  terminar(): void {
    this.#puerto.terminar();
    this.#observadores.clear();
  }

  #recibir(dato: unknown): void {
    if (!esMensajeDesdeHilo(dato)) {
      this.#avisarError('Respuesta no reconocida del hilo de señal.');
      return;
    }
    if (dato.tipo === 'error') {
      this.#avisarError(dato.mensaje);
      return;
    }
    for (const observador of this.#observadores) {
      observador.alIndices?.(dato.resultado);
    }
  }

  #avisarError(mensaje: string): void {
    for (const observador of this.#observadores) {
      observador.alError?.(mensaje);
    }
  }
}
