import { LectorTelemetria } from '../telemetria/anilloTelemetria';
import {
  NOMBRE_RECORTADOR,
  NOMBRE_SINTETIZADOR,
  type NombreParametro,
  type OpcionesRecortador,
  type OpcionesSintetizador,
} from '../worklet/contratoWorklet';
import { leerEstadisticasReproduccion, type EstadisticasReproduccion } from './estadisticasReproduccion';
import { NIVELES, type IdNivel } from './niveles';
import { DURACION_RAMPA_TIMBRE_S, dbAGanancia, duracionRampaTempoS, gananciaADb } from './rampas';
import { generarRespuestaImpulso } from './respuestaImpulso';

/** Volumen por omisión y rango del control (RF-18). */
export const VOLUMEN_POR_OMISION_DB = -12;
export const VOLUMEN_MINIMO_DB = -40;
export const VOLUMEN_MAXIMO_DB = 0;

/** Limitador al final de la cadena (antes del recorte de −1 dBFS). */
export const LIMITADOR = { umbralDb: -6, relacion: 20, rodillaDb: 0, ataqueS: 0.003, liberacionS: 0.25 } as const;

export const FUNDIDO_ENTRADA_S = 1.5;
/** Detener: rampa a cero en 50 ms y pausa del contexto (HU-06: silencio en menos de 200 ms). */
export const RAMPA_DETENCION_S = 0.05;
export const FUNDIDO_FINAL_S = 20;
const RETORNO_TRAS_CANCELAR_S = 2;

/** Todo lo que el motor necesita del entorno; inyectable para probarlo sin navegador. */
export interface FabricaAudio {
  crearContexto(): AudioContext;
  /** URLs de los módulos del AudioWorklet (sintetizador y recortador). */
  readonly modulos: readonly string[];
  crearNodoWorklet(contexto: AudioContext, nombre: string, opciones: AudioWorkletNodeOptions): AudioWorkletNode;
  /** `null` sin aislamiento de origen cruzado: no hay telemetría. */
  crearBuferTelemetria(): SharedArrayBuffer | null;
  crearElementoAudio(): HTMLAudioElement;
  esperar(ms: number): Promise<void>;
}

export interface OpcionesMotor {
  readonly semilla: number;
  readonly nivelInicial: IdNivel;
  /**
   * Respaldo para Media Session: la salida pasa por un elemento `<audio>`.
   * Con él, `playbackStats` deja de medir lo que realmente suena.
   */
  readonly salidaPorElementoAudio: boolean;
}

export type EstadoMotor = 'listo' | 'sonando' | 'detenido' | 'cerrado';

export interface LecturaPico {
  readonly bloques: number;
  /** Pico de la salida desde la lectura anterior, en dBFS; `null` sin datos. */
  readonly picoDbfs: number | null;
}

export interface Estadisticas extends EstadisticasReproduccion {
  /** `false` si la salida va por un `<audio>` y la métrica no refleja lo que suena. */
  readonly midiendoSalidaReal: boolean;
}

interface Nodos {
  readonly sintetizador: AudioWorkletNode;
  readonly filtro: BiquadFilterNode;
  readonly humedo: GainNode;
  readonly volumen: GainNode;
  readonly envolvente: GainNode;
}

function parametro(nodo: AudioWorkletNode, nombre: NombreParametro): AudioParam {
  const param = nodo.parameters.get(nombre);
  if (param === undefined) {
    throw new Error(`El sintetizador no expone el parámetro ${nombre}.`);
  }
  return param;
}

/** Deja un parámetro en su valor actual y descarta lo programado desde `t`. */
function retener(param: AudioParam, t: number): number {
  const actual = param.value;
  param.cancelScheduledValues(t);
  param.setValueAtTime(actual, t);
  return actual;
}

/**
 * Grafo de audio de la sesión, en el hilo principal. Solo programa: los
 * valores se interpolan en el hilo de audio con la automatización de
 * AudioParam (ADR-07), así que nada sonoro depende de temporizadores.
 *
 * sintetizador → pasa bajos (brillo) → seco + reverberación → volumen →
 * envolvente de sesión → limitador → recorte (−1 dBFS) → salida
 */
export class MotorAudio {
  readonly #contexto: AudioContext;
  readonly #nodos: Nodos;
  readonly #fabrica: FabricaAudio;
  readonly #telemetria: LectorTelemetria | null;
  readonly #elementoAudio: HTMLAudioElement | null;
  #estado: EstadoMotor = 'listo';
  #nivel: IdNivel;

  private constructor(
    contexto: AudioContext,
    nodos: Nodos,
    fabrica: FabricaAudio,
    telemetria: SharedArrayBuffer | null,
    elementoAudio: HTMLAudioElement | null,
    nivel: IdNivel,
  ) {
    this.#contexto = contexto;
    this.#nodos = nodos;
    this.#fabrica = fabrica;
    this.#telemetria = telemetria === null ? null : new LectorTelemetria(telemetria);
    this.#elementoAudio = elementoAudio;
    this.#nivel = nivel;
  }

  /** Crea el contexto, carga los módulos del worklet y arma el grafo (en silencio). */
  static async crear(fabrica: FabricaAudio, opciones: OpcionesMotor): Promise<MotorAudio> {
    const contexto = fabrica.crearContexto();
    for (const modulo of fabrica.modulos) {
      await contexto.audioWorklet.addModule(modulo);
    }
    const nivel = NIVELES[opciones.nivelInicial];

    const opcionesSintetizador: OpcionesSintetizador = {
      semilla: opciones.semilla,
      modoInicial: nivel.modo,
      capasIniciales: nivel.capas,
    };
    const sintetizador = fabrica.crearNodoWorklet(contexto, NOMBRE_SINTETIZADOR, {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2],
      processorOptions: opcionesSintetizador,
    });
    parametro(sintetizador, 'tempo').value = nivel.tempo;
    parametro(sintetizador, 'modo').value = nivel.modo;
    parametro(sintetizador, 'capas').value = nivel.capas;

    const filtro = contexto.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.Q.value = 0.5;
    filtro.frequency.value = nivel.brilloHz;

    const reverberacion = contexto.createConvolver();
    const [izquierdo, derecho] = generarRespuestaImpulso(contexto.sampleRate);
    const respuesta = contexto.createBuffer(2, izquierdo.length, contexto.sampleRate);
    respuesta.copyToChannel(izquierdo, 0);
    respuesta.copyToChannel(derecho, 1);
    reverberacion.buffer = respuesta;

    const humedo = contexto.createGain();
    humedo.gain.value = nivel.reverberacion;
    const volumen = contexto.createGain();
    volumen.gain.value = dbAGanancia(VOLUMEN_POR_OMISION_DB);
    const envolvente = contexto.createGain();
    envolvente.gain.value = 0;

    const limitador = contexto.createDynamicsCompressor();
    limitador.threshold.value = LIMITADOR.umbralDb;
    limitador.ratio.value = LIMITADOR.relacion;
    limitador.knee.value = LIMITADOR.rodillaDb;
    limitador.attack.value = LIMITADOR.ataqueS;
    limitador.release.value = LIMITADOR.liberacionS;

    const telemetria = fabrica.crearBuferTelemetria();
    const opcionesRecortador: OpcionesRecortador = { telemetria };
    const recortador = fabrica.crearNodoWorklet(contexto, NOMBRE_RECORTADOR, {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2],
      processorOptions: opcionesRecortador,
    });

    sintetizador.connect(filtro);
    filtro.connect(volumen);
    filtro.connect(reverberacion);
    reverberacion.connect(humedo);
    humedo.connect(volumen);
    volumen.connect(envolvente);
    envolvente.connect(limitador);
    limitador.connect(recortador);

    let elementoAudio: HTMLAudioElement | null = null;
    if (opciones.salidaPorElementoAudio) {
      const destinoFlujo = contexto.createMediaStreamDestination();
      recortador.connect(destinoFlujo);
      elementoAudio = fabrica.crearElementoAudio();
      elementoAudio.srcObject = destinoFlujo.stream;
    } else {
      recortador.connect(contexto.destination);
    }

    return new MotorAudio(
      contexto,
      { sintetizador, filtro, humedo, volumen, envolvente },
      fabrica,
      telemetria,
      elementoAudio,
      opciones.nivelInicial,
    );
  }

  get estado(): EstadoMotor {
    return this.#estado;
  }

  get nivel(): IdNivel {
    return this.#nivel;
  }

  /** Tiempo del reloj de audio, en segundos: la referencia de toda la temporización. */
  get tiempoAudio(): number {
    return this.#contexto.currentTime;
  }

  get volumenDb(): number {
    return gananciaADb(this.#nodos.volumen.gain.value);
  }

  get salidaPorElementoAudio(): boolean {
    return this.#elementoAudio !== null;
  }

  /** Reanuda el contexto y sube la envolvente de sesión en 1,5 s. */
  async iniciar(): Promise<void> {
    await this.#contexto.resume();
    if (this.#elementoAudio !== null) {
      await this.#elementoAudio.play();
    }
    const t = this.#contexto.currentTime;
    const envolvente = this.#nodos.envolvente.gain;
    retener(envolvente, t);
    envolvente.linearRampToValueAtTime(1, t + FUNDIDO_ENTRADA_S);
    this.#estado = 'sonando';
  }

  /**
   * Programa la transición gradual hacia un nivel (RF-10): tempo en
   * máx(20 s, |ΔBPM| × 2 s), brillo y reverberación en 45 s. El modo y las
   * capas los aplica el sintetizador con sus fundidos de 30 s.
   *
   * @returns la duración de la rampa de tempo, en segundos.
   */
  aplicarNivel(id: IdNivel): number {
    const nivel = NIVELES[id];
    const t = this.#contexto.currentTime;
    const { sintetizador, filtro, humedo } = this.#nodos;

    const tempo = parametro(sintetizador, 'tempo');
    const desde = retener(tempo, t);
    const duracion = duracionRampaTempoS(desde, nivel.tempo);
    tempo.linearRampToValueAtTime(nivel.tempo, t + duracion);

    retener(parametro(sintetizador, 'modo'), t);
    parametro(sintetizador, 'modo').setValueAtTime(nivel.modo, t);
    retener(parametro(sintetizador, 'capas'), t);
    parametro(sintetizador, 'capas').setValueAtTime(nivel.capas, t);

    retener(filtro.frequency, t);
    filtro.frequency.exponentialRampToValueAtTime(nivel.brilloHz, t + DURACION_RAMPA_TIMBRE_S);
    retener(humedo.gain, t);
    humedo.gain.linearRampToValueAtTime(nivel.reverberacion, t + DURACION_RAMPA_TIMBRE_S);

    this.#nivel = id;
    return duracion;
  }

  /** Fija el volumen dentro de −40 a 0 dB y devuelve el valor aplicado. */
  fijarVolumenDb(db: number): number {
    const acotado = Math.min(VOLUMEN_MAXIMO_DB, Math.max(VOLUMEN_MINIMO_DB, db));
    // Constante de tiempo corta: responde de inmediato sin chasquidos.
    this.#nodos.volumen.gain.setTargetAtTime(dbAGanancia(acotado), this.#contexto.currentTime, 0.05);
    return acotado;
  }

  /** Detención inmediata: rampa a cero en 50 ms y pausa del contexto. */
  async detener(): Promise<void> {
    if (this.#estado !== 'sonando') {
      return;
    }
    const t = this.#contexto.currentTime;
    const envolvente = this.#nodos.envolvente.gain;
    retener(envolvente, t);
    envolvente.linearRampToValueAtTime(0, t + RAMPA_DETENCION_S);
    this.#estado = 'detenido';
    // La rampa ya silencia en el hilo de audio; la espera solo evita cortarla.
    await this.#fabrica.esperar(RAMPA_DETENCION_S * 1000 + 10);
    this.#elementoAudio?.pause();
    await this.#contexto.suspend();
  }

  /**
   * Programa en el reloj de audio un fundido de 20 s que empieza dentro de
   * `enSegundos` (fin de sesión sin respuesta). Ocurre aunque la pestaña esté
   * en segundo plano.
   *
   * @returns el instante (reloj de audio) en que termina el fundido.
   */
  programarFundidoFinal(enSegundos: number): number {
    // Solo agenda a futuro: no cancela el fundido de entrada si aún está en curso.
    const inicio = this.#contexto.currentTime + Math.max(0, enSegundos);
    const envolvente = this.#nodos.envolvente.gain;
    envolvente.setValueAtTime(1, inicio);
    envolvente.linearRampToValueAtTime(0, inicio + FUNDIDO_FINAL_S);
    return inicio + FUNDIDO_FINAL_S;
  }

  /** Cancela un fundido final programado y vuelve al volumen pleno en 2 s. */
  cancelarFundidoFinal(): void {
    const t = this.#contexto.currentTime;
    const envolvente = this.#nodos.envolvente.gain;
    retener(envolvente, t);
    envolvente.linearRampToValueAtTime(1, t + RETORNO_TRAS_CANCELAR_S);
  }

  estadisticas(): Estadisticas | null {
    const leidas = leerEstadisticasReproduccion(this.#contexto);
    return leidas === null ? null : { ...leidas, midiendoSalidaReal: this.#elementoAudio === null };
  }

  /** Pico de la salida (tras el recorte) desde la lectura anterior. */
  leerPico(): LecturaPico | null {
    if (this.#telemetria === null) {
      return null;
    }
    const { bloques, maximo } = this.#telemetria.leer();
    return { bloques, picoDbfs: maximo === null || maximo === 0 ? null : gananciaADb(maximo) };
  }

  async cerrar(): Promise<void> {
    this.#elementoAudio?.pause();
    this.#estado = 'cerrado';
    await this.#contexto.close();
  }
}
