import type { FuenteSenal } from '../../adquisicion/contrato';
import type { ResultadoIndices } from '../procesamiento/ProcesadorSenal';
import { esMensajeDesdeHilo, type MensajeHaciaHilo } from './protocolo';

/** Canal con el hilo de señal; inyectable para probar sin un Worker real. */
export interface PuertoHilo {
  enviar(mensaje: MensajeHaciaHilo, transferibles?: Transferable[]): void;
  alRecibir(receptor: (dato: unknown) => void): void;
  terminar(): void;
}

/** Puerto sobre el Worker real, empaquetado por Vite como archivo del mismo origen. */
export function crearPuertoWorker(): PuertoHilo {
  const worker = new Worker(new URL('./senal.worker.ts', import.meta.url), {
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
