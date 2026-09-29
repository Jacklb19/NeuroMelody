import type { FabricaAudio } from '../features/audio/engine/AudioEngine';

export interface EventoParametro {
  readonly tipo: 'set' | 'lineal' | 'exponencial' | 'objetivo' | 'cancelar';
  readonly valor: number;
  readonly tiempo: number;
}

/**
 * AudioParam falso: registra lo programado y mantiene `value` como el último
 * valor fijado (suficiente para verificar qué se programa; la interpolación
 * real ocurre en el navegador).
 */
export class ParametroFalso {
  value: number;
  readonly eventos: EventoParametro[] = [];

  constructor(valor = 0) {
    this.value = valor;
  }

  setValueAtTime(valor: number, tiempo: number): this {
    this.eventos.push({ tipo: 'set', valor, tiempo });
    return this;
  }
  linearRampToValueAtTime(valor: number, tiempo: number): this {
    this.eventos.push({ tipo: 'lineal', valor, tiempo });
    return this;
  }
  exponentialRampToValueAtTime(valor: number, tiempo: number): this {
    this.eventos.push({ tipo: 'exponencial', valor, tiempo });
    return this;
  }
  setTargetAtTime(valor: number, tiempo: number): this {
    this.eventos.push({ tipo: 'objetivo', valor, tiempo });
    this.value = valor;
    return this;
  }
  cancelScheduledValues(tiempo: number): this {
    this.eventos.push({ tipo: 'cancelar', valor: Number.NaN, tiempo });
    return this;
  }
  /** Último evento de un tipo. */
  ultimo(tipo: EventoParametro['tipo']): EventoParametro | undefined {
    return this.eventos.filter((e) => e.tipo === tipo).at(-1);
  }
}

export class NodoFalso {
  readonly conexiones: NodoFalso[] = [];
  constructor(readonly tipo: string) {}
  connect(destino: NodoFalso): NodoFalso {
    this.conexiones.push(destino);
    return destino;
  }
}

class GananciaFalsa extends NodoFalso {
  readonly gain = new ParametroFalso(1);
  constructor() {
    super('ganancia');
  }
}

class FiltroFalso extends NodoFalso {
  type = 'lowpass';
  readonly frequency = new ParametroFalso(350);
  readonly Q = new ParametroFalso(1);
  constructor() {
    super('filtro');
  }
}

class ConvolucionFalsa extends NodoFalso {
  buffer: unknown = null;
  constructor() {
    super('convolucion');
  }
}

class LimitadorFalso extends NodoFalso {
  readonly threshold = new ParametroFalso(-24);
  readonly ratio = new ParametroFalso(12);
  readonly knee = new ParametroFalso(30);
  readonly attack = new ParametroFalso(0.003);
  readonly release = new ParametroFalso(0.25);
  constructor() {
    super('limitador');
  }
}

export class NodoWorkletFalso extends NodoFalso {
  readonly parameters = new Map<string, ParametroFalso>();
  constructor(
    readonly nombre: string,
    readonly opciones: AudioWorkletNodeOptions,
  ) {
    super(`worklet:${nombre}`);
    for (const nombreParametro of ['tempo', 'modo', 'capas']) {
      this.parameters.set(nombreParametro, new ParametroFalso());
    }
  }
}

export class ContextoFalso {
  currentTime = 0;
  state: 'suspended' | 'running' | 'closed' = 'suspended';
  readonly sampleRate = 48_000;
  readonly destination = new NodoFalso('destino');
  readonly modulosCargados: string[] = [];
  readonly nodos: NodoFalso[] = [];
  playbackStats: unknown = undefined;
  readonly audioWorklet = {
    addModule: (url: string) => {
      this.modulosCargados.push(url);
      return Promise.resolve();
    },
  };

  #registrar<T extends NodoFalso>(nodo: T): T {
    this.nodos.push(nodo);
    return nodo;
  }
  createGain(): GananciaFalsa {
    return this.#registrar(new GananciaFalsa());
  }
  createBiquadFilter(): FiltroFalso {
    return this.#registrar(new FiltroFalso());
  }
  createConvolver(): ConvolucionFalsa {
    return this.#registrar(new ConvolucionFalsa());
  }
  createDynamicsCompressor(): LimitadorFalso {
    return this.#registrar(new LimitadorFalso());
  }
  createMediaStreamDestination(): NodoFalso & { stream: object } {
    return Object.assign(this.#registrar(new NodoFalso('flujo')), { stream: { id: 'flujo' } });
  }
  createBuffer(canales: number, longitud: number, frecuencia: number) {
    return { canales, longitud, frecuencia, copiados: [] as number[], copyToChannel(_d: Float32Array, c: number) { this.copiados.push(c); } };
  }
  resume(): Promise<void> {
    this.state = 'running';
    return Promise.resolve();
  }
  suspend(): Promise<void> {
    this.state = 'suspended';
    return Promise.resolve();
  }
  close(): Promise<void> {
    this.state = 'closed';
    return Promise.resolve();
  }
}

export class ElementoAudioFalso {
  srcObject: unknown = null;
  reproduciendo = false;
  play(): Promise<void> {
    this.reproduciendo = true;
    return Promise.resolve();
  }
  pause(): void {
    this.reproduciendo = false;
  }
}

export interface EntornoAudioFalso {
  readonly contexto: ContextoFalso;
  readonly worklets: NodoWorkletFalso[];
  readonly elemento: ElementoAudioFalso;
  readonly esperas: number[];
  readonly fabrica: FabricaAudio;
}

/** Fábrica de audio en memoria: las clases falsas se entregan con el tipo real a propósito. */
export function crearEntornoAudioFalso(telemetria: SharedArrayBuffer | null = null): EntornoAudioFalso {
  const contexto = new ContextoFalso();
  const worklets: NodoWorkletFalso[] = [];
  const elemento = new ElementoAudioFalso();
  const esperas: number[] = [];
  const fabrica: FabricaAudio = {
    crearContexto: () => contexto as unknown as AudioContext,
    modulos: ['sintetizador.js', 'recortador.js'],
    crearNodoWorklet: (_contexto, nombre, opciones) => {
      const nodo = new NodoWorkletFalso(nombre, opciones);
      worklets.push(nodo);
      contexto.nodos.push(nodo);
      return nodo as unknown as AudioWorkletNode;
    },
    crearBuferTelemetria: () => telemetria,
    crearElementoAudio: () => elemento as unknown as HTMLAudioElement,
    esperar: (ms) => {
      esperas.push(ms);
      return Promise.resolve();
    },
  };
  return { contexto, worklets, elemento, esperas, fabrica };
}
