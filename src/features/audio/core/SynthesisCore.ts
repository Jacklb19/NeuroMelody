import { createRandom, type RandomSource } from '../../acquisition/simulator/prng';
import {
  SCALES,
  MIDI_DRONE,
  MIDI_TONIC,
  MODE,
  isMode,
  midiFrequency,
  degreeNote,
  type Mode,
} from './theory';

/** Pulsos de un ciclo armónico: los cambios de modo esperan a que cierre. */
export const BEATS_PER_CYCLE = 16;
/** Cada cuántos pulsos cambia el acorde de la capa de armonía. */
export const BEATS_PER_CHORD = 4;
/** Duración de los fundidos de capas y de modo (docs/diseno-musical.md). */
export const FADE_DURATION_S = 30;
/** Voces reservadas al iniciar; nunca se crean más. */
export const MAX_VOICES = 32;

const MELODY_NOTE_PROBABILITY = 0.35;
/** Amplitud por debajo de la cual una voz se libera (≈ −80 dB, inaudible). */
const SILENCE_THRESHOLD = 1e-4;

const LAYER_DRONE = 0;
const LAYER_HARMONY = 1;
const LAYER_MELODY = 2;
const STATE_FREE = 0;
const STATE_ATTACK = 1;
const STATE_DECAY = 2;

interface Envelope {
  readonly amplitude: number;
  readonly attackS: number;
  readonly decayS: number;
}

const CHORD_ENVELOPE: Envelope = { amplitude: 0.07, attackS: 0.8, decayS: 2.5 };
const DYAD_ENVELOPE: Envelope = { amplitude: 0.08, attackS: 2, decayS: 4 };
const MELODY_ENVELOPE: Envelope = { amplitude: 0.09, attackS: 0.02, decayS: 1.2 };
const DRONE_AMPLITUDE = 0.11;

/**
 * Síntesis generativa por capas (RF-08), sin dependencias del navegador para
 * poder probarla de forma determinista. El procesador del AudioWorklet solo
 * la invoca bloque a bloque.
 *
 * Reglas de tiempo real: todo el estado se reserva en el constructor y
 * `procesar` no crea objetos ni arreglos. El secuenciador avanza con el reloj
 * de muestras, así que no depende de temporizadores.
 *
 * Capas: 0 bordón (re2 y la2 continuos), 1 armonía (acordes cada 4 pulsos),
 * 2 melodía (notas sueltas). El parámetro `capas` (1 a 3) enciende las capas
 * en ese orden, con un fundido de 30 s. Un cambio de `modo` se aplica al cerrar
 * el ciclo armónico, con un fundido cruzado de 30 s entre dos bancos de voces.
 */
export class SynthesisCore {
  readonly #fs: number;
  readonly #random: RandomSource;
  readonly #fadeStep: number;

  // Voces: un arreglo por campo, reservados una sola vez.
  readonly #phase = new Float64Array(MAX_VOICES);
  readonly #increment = new Float64Array(MAX_VOICES);
  readonly #amplitude = new Float64Array(MAX_VOICES);
  readonly #peak = new Float64Array(MAX_VOICES);
  readonly #attackStep = new Float64Array(MAX_VOICES);
  readonly #decayFactor = new Float64Array(MAX_VOICES);
  readonly #state = new Int8Array(MAX_VOICES);
  readonly #layer = new Int8Array(MAX_VOICES);
  readonly #bank = new Int8Array(MAX_VOICES);

  readonly #layerGain = new Float64Array(3);
  readonly #layerTarget = new Float64Array(3);
  readonly #bankGain = new Float64Array(2);

  #dronePhase = 0;
  #fifthPhase = 0;
  #lifePhase = 0;
  #beatPhase = 1;
  #beat = -1;
  #currentMode: Mode = MODE.majorPentatonic;
  #pendingMode: Mode = MODE.majorPentatonic;
  #activeBank = 0;
  #steals = 0;

  constructor(sampleRate: number, seed: number, initialMode: Mode = MODE.majorPentatonic) {
    this.#fs = sampleRate;
    this.#random = createRandom(seed);
    this.#fadeStep = 1 / (FADE_DURATION_S * sampleRate);
    this.#currentMode = initialMode;
    this.#pendingMode = initialMode;
    this.#bankGain[0] = 1;
    this.#layerGain[LAYER_DRONE] = 1;
    this.#layerTarget[LAYER_DRONE] = 1;
  }

  /** Datos de inspección para pruebas y telemetría; no forman parte del sonido. */
  get beat(): number {
    return this.#beat;
  }
  get currentMode(): Mode {
    return this.#currentMode;
  }
  get activeBank(): number {
    return this.#activeBank;
  }
  get voiceSteals(): number {
    return this.#steals;
  }
  bankGain(bank: number): number {
    return this.#bankGain[bank] ?? 0;
  }
  layerGain(layer: number): number {
    return this.#layerGain[layer] ?? 0;
  }

  /**
   * Fija la ganancia de cada capa sin fundido. Solo para el primer bloque de
   * una sesión: el sonido empieza ya con las capas del nivel inicial.
   */
  setInitialLayers(layers: number): void {
    this.#updateLayerTargets(layers);
    this.#layerGain.set(this.#layerTarget);
  }

  /**
   * Sintetiza `salida.length` muestras con los parámetros del bloque.
   *
   * @param tempo Pulsos por minuto.
   * @param mode 0 pentatónica mayor, 1 lidio, 2 bordón con pentatónica.
   * @param layers Número de capas activas (1 a 3).
   */
  process(output: Float32Array, tempo: number, mode: number, layers: number): void {
    const roundedMode = Math.round(mode);
    if (isMode(roundedMode)) {
      this.#pendingMode = roundedMode;
    }
    this.#updateLayerTargets(layers);

    const beatAdvance = tempo / (60 * this.#fs);
    const droneIncrement = (2 * Math.PI * midiFrequency(MIDI_DRONE)) / this.#fs;
    const fifthIncrement = (2 * Math.PI * midiFrequency(MIDI_DRONE + 7)) / this.#fs;
    const lifeIncrement = (2 * Math.PI * 0.07) / this.#fs;

    for (let n = 0; n < output.length; n++) {
      this.#beatPhase += beatAdvance;
      if (this.#beatPhase >= 1) {
        this.#beatPhase -= 1;
        this.#onBeat();
      }
      this.#smoothGains();

      // Bordón continuo con una respiración lenta de amplitud.
      this.#dronePhase += droneIncrement;
      this.#fifthPhase += fifthIncrement;
      this.#lifePhase += lifeIncrement;
      const breathing = 0.85 + 0.15 * Math.sin(this.#lifePhase);
      let sample =
        (this.#layerGain[LAYER_DRONE] ?? 0) *
        DRONE_AMPLITUDE *
        breathing *
        (Math.sin(this.#dronePhase) + 0.6 * Math.sin(this.#fifthPhase));

      for (let v = 0; v < MAX_VOICES; v++) {
        if (this.#state[v] !== STATE_FREE) {
          sample += this.#voiceSample(v);
        }
      }
      output[n] = sample;
    }

    // Evita que las fases crezcan sin límite y pierdan precisión.
    this.#dronePhase %= 2 * Math.PI;
    this.#fifthPhase %= 2 * Math.PI;
    this.#lifePhase %= 2 * Math.PI;
  }

  #updateLayerTargets(layers: number): void {
    const activeLayers = Math.min(3, Math.max(1, Math.round(layers)));
    this.#layerTarget[LAYER_DRONE] = 1;
    this.#layerTarget[LAYER_HARMONY] = activeLayers >= 2 ? 1 : 0;
    this.#layerTarget[LAYER_MELODY] = activeLayers >= 3 ? 1 : 0;
  }

  #smoothGains(): void {
    for (let c = 0; c < 3; c++) {
      this.#layerGain[c] = moveTowards(this.#layerGain[c] ?? 0, this.#layerTarget[c] ?? 0, this.#fadeStep);
    }
    for (let b = 0; b < 2; b++) {
      const target = b === this.#activeBank ? 1 : 0;
      this.#bankGain[b] = moveTowards(this.#bankGain[b] ?? 0, target, this.#fadeStep);
    }
  }

  #onBeat(): void {
    this.#beat++;
    const position = this.#beat % BEATS_PER_CYCLE;

    if (position === 0 && this.#pendingMode !== this.#currentMode) {
      // Cierre del ciclo armónico: empieza el fundido cruzado hacia el nuevo modo.
      this.#currentMode = this.#pendingMode;
      this.#activeBank = 1 - this.#activeBank;
    }

    if (position % BEATS_PER_CHORD === 0 && (this.#layerTarget[LAYER_HARMONY] ?? 0) > 0) {
      this.#triggerChord();
    }
    if (
      (this.#layerTarget[LAYER_MELODY] ?? 0) > 0 &&
      this.#random() < MELODY_NOTE_PROBABILITY
    ) {
      const scale = SCALES[this.#currentMode];
      const degree = Math.floor(this.#random() * scale.length * 2);
      this.#triggerVoice(degreeNote(scale, degree, MIDI_TONIC + 12), LAYER_MELODY, MELODY_ENVELOPE);
    }
  }

  #triggerChord(): void {
    const scale = SCALES[this.#currentMode];
    const root = Math.floor(this.#random() * scale.length);
    if (this.#currentMode === MODE.dronePentatonic) {
      // Díada abierta sobre el bordón: más quieta que un acorde completo.
      this.#triggerVoice(degreeNote(scale, root, MIDI_TONIC), LAYER_HARMONY, DYAD_ENVELOPE);
      this.#triggerVoice(degreeNote(scale, root + 3, MIDI_TONIC), LAYER_HARMONY, DYAD_ENVELOPE);
      return;
    }
    // Tres llamadas explícitas en lugar de recorrer un arreglo literal: no se reserva memoria.
    this.#triggerVoice(degreeNote(scale, root, MIDI_TONIC), LAYER_HARMONY, CHORD_ENVELOPE);
    this.#triggerVoice(degreeNote(scale, root + 2, MIDI_TONIC), LAYER_HARMONY, CHORD_ENVELOPE);
    this.#triggerVoice(degreeNote(scale, root + 4, MIDI_TONIC), LAYER_HARMONY, CHORD_ENVELOPE);
  }

  #triggerVoice(midi: number, layer: number, envelope: Envelope): void {
    let chosen = -1;
    let lowest = Number.POSITIVE_INFINITY;
    for (let v = 0; v < MAX_VOICES; v++) {
      if (this.#state[v] === STATE_FREE) {
        chosen = v;
        break;
      }
      const amplitude = this.#amplitude[v] ?? 0;
      if (amplitude < lowest) {
        lowest = amplitude;
        chosen = v;
      }
    }
    if (this.#state[chosen] !== STATE_FREE) {
      this.#steals++;
    }
    this.#phase[chosen] = 0;
    this.#increment[chosen] = (2 * Math.PI * midiFrequency(midi)) / this.#fs;
    this.#amplitude[chosen] = 0;
    this.#peak[chosen] = envelope.amplitude;
    this.#attackStep[chosen] = envelope.amplitude / (envelope.attackS * this.#fs);
    this.#decayFactor[chosen] = Math.exp(-1 / (envelope.decayS * this.#fs));
    this.#state[chosen] = STATE_ATTACK;
    this.#layer[chosen] = layer;
    this.#bank[chosen] = this.#activeBank;
  }

  #voiceSample(v: number): number {
    let amplitude = this.#amplitude[v] ?? 0;
    if (this.#state[v] === STATE_ATTACK) {
      amplitude += this.#attackStep[v] ?? 0;
      if (amplitude >= (this.#peak[v] ?? 0)) {
        amplitude = this.#peak[v] ?? 0;
        this.#state[v] = STATE_DECAY;
      }
    } else {
      amplitude *= this.#decayFactor[v] ?? 0;
      if (amplitude < SILENCE_THRESHOLD) {
        this.#state[v] = STATE_FREE;
        this.#amplitude[v] = 0;
        return 0;
      }
    }
    this.#amplitude[v] = amplitude;

    const phase = (this.#phase[v] ?? 0) + (this.#increment[v] ?? 0);
    this.#phase[v] = phase > 2 * Math.PI ? phase - 2 * Math.PI : phase;
    const gain =
      (this.#layerGain[this.#layer[v] ?? 0] ?? 0) * (this.#bankGain[this.#bank[v] ?? 0] ?? 0);
    // Seno con un poco de segundo armónico: timbre suave y cálido.
    return gain * amplitude * (Math.sin(phase) + 0.15 * Math.sin(2 * phase));
  }
}

function moveTowards(current: number, target: number, step: number): number {
  if (current < target) {
    return Math.min(target, current + step);
  }
  return Math.max(target, current - step);
}
