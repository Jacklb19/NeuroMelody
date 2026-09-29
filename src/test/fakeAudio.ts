import type { AudioFactory } from '../features/audio/engine/AudioEngine';

export interface ParamEvent {
  readonly kind: 'set' | 'lineal' | 'exponencial' | 'objetivo' | 'cancelar';
  readonly value: number;
  readonly time: number;
}

/**
 * AudioParam falso: registra lo programado y mantiene `value` como el último
 * valor fijado (suficiente para verificar qué se programa; la interpolación
 * real ocurre en el navegador).
 */
export class FakeParam {
  value: number;
  readonly events: ParamEvent[] = [];

  constructor(value = 0) {
    this.value = value;
  }

  setValueAtTime(value: number, time: number): this {
    this.events.push({ kind: 'set', value, time });
    return this;
  }
  linearRampToValueAtTime(value: number, time: number): this {
    this.events.push({ kind: 'lineal', value, time });
    return this;
  }
  exponentialRampToValueAtTime(value: number, time: number): this {
    this.events.push({ kind: 'exponencial', value, time });
    return this;
  }
  setTargetAtTime(value: number, time: number): this {
    this.events.push({ kind: 'objetivo', value, time });
    this.value = value;
    return this;
  }
  cancelScheduledValues(time: number): this {
    this.events.push({ kind: 'cancelar', value: Number.NaN, time });
    return this;
  }
  /** Último evento de un tipo. */
  last(kind: ParamEvent['kind']): ParamEvent | undefined {
    return this.events.filter((e) => e.kind === kind).at(-1);
  }
}

export class FakeNode {
  readonly connections: FakeNode[] = [];
  constructor(readonly kind: string) {}
  connect(target: FakeNode): FakeNode {
    this.connections.push(target);
    return target;
  }
}

class FakeGain extends FakeNode {
  readonly gain = new FakeParam(1);
  constructor() {
    super('ganancia');
  }
}

class FakeFilter extends FakeNode {
  type = 'lowpass';
  readonly frequency = new FakeParam(350);
  readonly Q = new FakeParam(1);
  constructor() {
    super('filtro');
  }
}

class FakeConvolver extends FakeNode {
  buffer: unknown = null;
  constructor() {
    super('convolucion');
  }
}

class FakeCompressor extends FakeNode {
  readonly threshold = new FakeParam(-24);
  readonly ratio = new FakeParam(12);
  readonly knee = new FakeParam(30);
  readonly attack = new FakeParam(0.003);
  readonly release = new FakeParam(0.25);
  constructor() {
    super('limitador');
  }
}

export class FakeWorkletNode extends FakeNode {
  readonly parameters = new Map<string, FakeParam>();
  constructor(
    readonly name: string,
    readonly options: AudioWorkletNodeOptions,
  ) {
    super(`worklet:${name}`);
    for (const paramName of ['tempo', 'modo', 'capas']) {
      this.parameters.set(paramName, new FakeParam());
    }
  }
}

export class FakeAudioContext {
  currentTime = 0;
  state: 'suspended' | 'running' | 'closed' = 'suspended';
  readonly sampleRate = 48_000;
  readonly destination = new FakeNode('destino');
  readonly loadedModules: string[] = [];
  readonly nodes: FakeNode[] = [];
  playbackStats: unknown = undefined;
  readonly audioWorklet = {
    addModule: (url: string) => {
      this.loadedModules.push(url);
      return Promise.resolve();
    },
  };

  #register<T extends FakeNode>(node: T): T {
    this.nodes.push(node);
    return node;
  }
  createGain(): FakeGain {
    return this.#register(new FakeGain());
  }
  createBiquadFilter(): FakeFilter {
    return this.#register(new FakeFilter());
  }
  createConvolver(): FakeConvolver {
    return this.#register(new FakeConvolver());
  }
  createDynamicsCompressor(): FakeCompressor {
    return this.#register(new FakeCompressor());
  }
  createMediaStreamDestination(): FakeNode & { stream: object } {
    return Object.assign(this.#register(new FakeNode('flujo')), { stream: { id: 'flujo' } });
  }
  createBuffer(channels: number, length: number, frequency: number) {
    return { channels, length, frequency, copied: [] as number[], copyToChannel(_d: Float32Array, c: number) { this.copied.push(c); } };
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

export class FakeAudioElement {
  srcObject: unknown = null;
  playing = false;
  play(): Promise<void> {
    this.playing = true;
    return Promise.resolve();
  }
  pause(): void {
    this.playing = false;
  }
}

export interface FakeAudioEnvironment {
  readonly context: FakeAudioContext;
  readonly worklets: FakeWorkletNode[];
  readonly element: FakeAudioElement;
  readonly waits: number[];
  readonly factory: AudioFactory;
}

/** Fábrica de audio en memoria: las clases falsas se entregan con el tipo real a propósito. */
export function createFakeAudioEnvironment(telemetry: SharedArrayBuffer | null = null): FakeAudioEnvironment {
  const context = new FakeAudioContext();
  const worklets: FakeWorkletNode[] = [];
  const element = new FakeAudioElement();
  const waits: number[] = [];
  const factory: AudioFactory = {
    createAudioContext: () => context as unknown as AudioContext,
    modules: ['sintetizador.js', 'recortador.js'],
    createWorkletNode: (_context, name, options) => {
      const node = new FakeWorkletNode(name, options);
      worklets.push(node);
      context.nodes.push(node);
      return node as unknown as AudioWorkletNode;
    },
    createTelemetryBuffer: () => telemetry,
    createAudioElement: () => element as unknown as HTMLAudioElement,
    wait: (ms) => {
      waits.push(ms);
      return Promise.resolve();
    },
  };
  return { context, worklets, element, waits, factory };
}
