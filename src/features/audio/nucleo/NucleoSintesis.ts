import { crearAleatorio, type Aleatorio } from '../../adquisicion/simulador/prng';
import {
  ESCALAS,
  MIDI_BORDON,
  MIDI_TONICA,
  MODO,
  esModo,
  frecuenciaMidi,
  notaDeGrado,
  type Modo,
} from './teoria';

/** Pulsos de un ciclo armónico: los cambios de modo esperan a que cierre. */
export const PULSOS_POR_CICLO = 16;
/** Cada cuántos pulsos cambia el acorde de la capa de armonía. */
export const PULSOS_POR_ACORDE = 4;
/** Duración de los fundidos de capas y de modo (docs/diseno-musical.md). */
export const DURACION_FUNDIDO_S = 30;
/** Voces reservadas al iniciar; nunca se crean más. */
export const MAX_VOCES = 32;

const PROBABILIDAD_NOTA_MELODIA = 0.35;
/** Amplitud por debajo de la cual una voz se libera (≈ −80 dB, inaudible). */
const UMBRAL_SILENCIO = 1e-4;

const CAPA_BORDON = 0;
const CAPA_ARMONIA = 1;
const CAPA_MELODIA = 2;
const ESTADO_LIBRE = 0;
const ESTADO_ATAQUE = 1;
const ESTADO_CAIDA = 2;

interface Envolvente {
  readonly amplitud: number;
  readonly ataqueS: number;
  readonly caidaS: number;
}

const ENVOLVENTE_ACORDE: Envolvente = { amplitud: 0.07, ataqueS: 0.8, caidaS: 2.5 };
const ENVOLVENTE_DIADA: Envolvente = { amplitud: 0.08, ataqueS: 2, caidaS: 4 };
const ENVOLVENTE_MELODIA: Envolvente = { amplitud: 0.09, ataqueS: 0.02, caidaS: 1.2 };
const AMPLITUD_BORDON = 0.11;

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
export class NucleoSintesis {
  readonly #fs: number;
  readonly #aleatorio: Aleatorio;
  readonly #pasoFundido: number;

  // Voces: un arreglo por campo, reservados una sola vez.
  readonly #fase = new Float64Array(MAX_VOCES);
  readonly #incremento = new Float64Array(MAX_VOCES);
  readonly #amplitud = new Float64Array(MAX_VOCES);
  readonly #pico = new Float64Array(MAX_VOCES);
  readonly #pasoAtaque = new Float64Array(MAX_VOCES);
  readonly #factorCaida = new Float64Array(MAX_VOCES);
  readonly #estado = new Int8Array(MAX_VOCES);
  readonly #capa = new Int8Array(MAX_VOCES);
  readonly #banco = new Int8Array(MAX_VOCES);

  readonly #gananciaCapa = new Float64Array(3);
  readonly #objetivoCapa = new Float64Array(3);
  readonly #gananciaBanco = new Float64Array(2);

  #faseBordon = 0;
  #faseQuinta = 0;
  #faseVida = 0;
  #fasePulso = 1;
  #pulso = -1;
  #modoActual: Modo = MODO.pentatonicaMayor;
  #modoPendiente: Modo = MODO.pentatonicaMayor;
  #bancoActivo = 0;
  #robos = 0;

  constructor(frecuenciaMuestreo: number, semilla: number, modoInicial: Modo = MODO.pentatonicaMayor) {
    this.#fs = frecuenciaMuestreo;
    this.#aleatorio = crearAleatorio(semilla);
    this.#pasoFundido = 1 / (DURACION_FUNDIDO_S * frecuenciaMuestreo);
    this.#modoActual = modoInicial;
    this.#modoPendiente = modoInicial;
    this.#gananciaBanco[0] = 1;
    this.#gananciaCapa[CAPA_BORDON] = 1;
    this.#objetivoCapa[CAPA_BORDON] = 1;
  }

  /** Datos de inspección para pruebas y telemetría; no forman parte del sonido. */
  get pulso(): number {
    return this.#pulso;
  }
  get modoActual(): Modo {
    return this.#modoActual;
  }
  get bancoActivo(): number {
    return this.#bancoActivo;
  }
  get robosDeVoz(): number {
    return this.#robos;
  }
  gananciaBanco(banco: number): number {
    return this.#gananciaBanco[banco] ?? 0;
  }
  gananciaCapa(capa: number): number {
    return this.#gananciaCapa[capa] ?? 0;
  }

  /**
   * Fija la ganancia de cada capa sin fundido. Solo para el primer bloque de
   * una sesión: el sonido empieza ya con las capas del nivel inicial.
   */
  fijarCapasIniciales(capas: number): void {
    this.#actualizarObjetivoCapas(capas);
    this.#gananciaCapa.set(this.#objetivoCapa);
  }

  /**
   * Sintetiza `salida.length` muestras con los parámetros del bloque.
   *
   * @param tempo Pulsos por minuto.
   * @param modo 0 pentatónica mayor, 1 lidio, 2 bordón con pentatónica.
   * @param capas Número de capas activas (1 a 3).
   */
  procesar(salida: Float32Array, tempo: number, modo: number, capas: number): void {
    const modoRedondeado = Math.round(modo);
    if (esModo(modoRedondeado)) {
      this.#modoPendiente = modoRedondeado;
    }
    this.#actualizarObjetivoCapas(capas);

    const avancePulso = tempo / (60 * this.#fs);
    const incrementoBordon = (2 * Math.PI * frecuenciaMidi(MIDI_BORDON)) / this.#fs;
    const incrementoQuinta = (2 * Math.PI * frecuenciaMidi(MIDI_BORDON + 7)) / this.#fs;
    const incrementoVida = (2 * Math.PI * 0.07) / this.#fs;

    for (let n = 0; n < salida.length; n++) {
      this.#fasePulso += avancePulso;
      if (this.#fasePulso >= 1) {
        this.#fasePulso -= 1;
        this.#alPulso();
      }
      this.#suavizarGanancias();

      // Bordón continuo con una respiración lenta de amplitud.
      this.#faseBordon += incrementoBordon;
      this.#faseQuinta += incrementoQuinta;
      this.#faseVida += incrementoVida;
      const respiracion = 0.85 + 0.15 * Math.sin(this.#faseVida);
      let muestra =
        (this.#gananciaCapa[CAPA_BORDON] ?? 0) *
        AMPLITUD_BORDON *
        respiracion *
        (Math.sin(this.#faseBordon) + 0.6 * Math.sin(this.#faseQuinta));

      for (let v = 0; v < MAX_VOCES; v++) {
        if (this.#estado[v] !== ESTADO_LIBRE) {
          muestra += this.#muestraVoz(v);
        }
      }
      salida[n] = muestra;
    }

    // Evita que las fases crezcan sin límite y pierdan precisión.
    this.#faseBordon %= 2 * Math.PI;
    this.#faseQuinta %= 2 * Math.PI;
    this.#faseVida %= 2 * Math.PI;
  }

  #actualizarObjetivoCapas(capas: number): void {
    const activas = Math.min(3, Math.max(1, Math.round(capas)));
    this.#objetivoCapa[CAPA_BORDON] = 1;
    this.#objetivoCapa[CAPA_ARMONIA] = activas >= 2 ? 1 : 0;
    this.#objetivoCapa[CAPA_MELODIA] = activas >= 3 ? 1 : 0;
  }

  #suavizarGanancias(): void {
    for (let c = 0; c < 3; c++) {
      this.#gananciaCapa[c] = acercar(this.#gananciaCapa[c] ?? 0, this.#objetivoCapa[c] ?? 0, this.#pasoFundido);
    }
    for (let b = 0; b < 2; b++) {
      const objetivo = b === this.#bancoActivo ? 1 : 0;
      this.#gananciaBanco[b] = acercar(this.#gananciaBanco[b] ?? 0, objetivo, this.#pasoFundido);
    }
  }

  #alPulso(): void {
    this.#pulso++;
    const posicion = this.#pulso % PULSOS_POR_CICLO;

    if (posicion === 0 && this.#modoPendiente !== this.#modoActual) {
      // Cierre del ciclo armónico: empieza el fundido cruzado hacia el nuevo modo.
      this.#modoActual = this.#modoPendiente;
      this.#bancoActivo = 1 - this.#bancoActivo;
    }

    if (posicion % PULSOS_POR_ACORDE === 0 && (this.#objetivoCapa[CAPA_ARMONIA] ?? 0) > 0) {
      this.#dispararAcorde();
    }
    if (
      (this.#objetivoCapa[CAPA_MELODIA] ?? 0) > 0 &&
      this.#aleatorio() < PROBABILIDAD_NOTA_MELODIA
    ) {
      const escala = ESCALAS[this.#modoActual];
      const grado = Math.floor(this.#aleatorio() * escala.length * 2);
      this.#dispararVoz(notaDeGrado(escala, grado, MIDI_TONICA + 12), CAPA_MELODIA, ENVOLVENTE_MELODIA);
    }
  }

  #dispararAcorde(): void {
    const escala = ESCALAS[this.#modoActual];
    const raiz = Math.floor(this.#aleatorio() * escala.length);
    if (this.#modoActual === MODO.bordonPentatonica) {
      // Díada abierta sobre el bordón: más quieta que un acorde completo.
      this.#dispararVoz(notaDeGrado(escala, raiz, MIDI_TONICA), CAPA_ARMONIA, ENVOLVENTE_DIADA);
      this.#dispararVoz(notaDeGrado(escala, raiz + 3, MIDI_TONICA), CAPA_ARMONIA, ENVOLVENTE_DIADA);
      return;
    }
    // Tres llamadas explícitas en lugar de recorrer un arreglo literal: no se reserva memoria.
    this.#dispararVoz(notaDeGrado(escala, raiz, MIDI_TONICA), CAPA_ARMONIA, ENVOLVENTE_ACORDE);
    this.#dispararVoz(notaDeGrado(escala, raiz + 2, MIDI_TONICA), CAPA_ARMONIA, ENVOLVENTE_ACORDE);
    this.#dispararVoz(notaDeGrado(escala, raiz + 4, MIDI_TONICA), CAPA_ARMONIA, ENVOLVENTE_ACORDE);
  }

  #dispararVoz(midi: number, capa: number, envolvente: Envolvente): void {
    let elegida = -1;
    let menor = Number.POSITIVE_INFINITY;
    for (let v = 0; v < MAX_VOCES; v++) {
      if (this.#estado[v] === ESTADO_LIBRE) {
        elegida = v;
        break;
      }
      const amplitud = this.#amplitud[v] ?? 0;
      if (amplitud < menor) {
        menor = amplitud;
        elegida = v;
      }
    }
    if (this.#estado[elegida] !== ESTADO_LIBRE) {
      this.#robos++;
    }
    this.#fase[elegida] = 0;
    this.#incremento[elegida] = (2 * Math.PI * frecuenciaMidi(midi)) / this.#fs;
    this.#amplitud[elegida] = 0;
    this.#pico[elegida] = envolvente.amplitud;
    this.#pasoAtaque[elegida] = envolvente.amplitud / (envolvente.ataqueS * this.#fs);
    this.#factorCaida[elegida] = Math.exp(-1 / (envolvente.caidaS * this.#fs));
    this.#estado[elegida] = ESTADO_ATAQUE;
    this.#capa[elegida] = capa;
    this.#banco[elegida] = this.#bancoActivo;
  }

  #muestraVoz(v: number): number {
    let amplitud = this.#amplitud[v] ?? 0;
    if (this.#estado[v] === ESTADO_ATAQUE) {
      amplitud += this.#pasoAtaque[v] ?? 0;
      if (amplitud >= (this.#pico[v] ?? 0)) {
        amplitud = this.#pico[v] ?? 0;
        this.#estado[v] = ESTADO_CAIDA;
      }
    } else {
      amplitud *= this.#factorCaida[v] ?? 0;
      if (amplitud < UMBRAL_SILENCIO) {
        this.#estado[v] = ESTADO_LIBRE;
        this.#amplitud[v] = 0;
        return 0;
      }
    }
    this.#amplitud[v] = amplitud;

    const fase = (this.#fase[v] ?? 0) + (this.#incremento[v] ?? 0);
    this.#fase[v] = fase > 2 * Math.PI ? fase - 2 * Math.PI : fase;
    const ganancia =
      (this.#gananciaCapa[this.#capa[v] ?? 0] ?? 0) * (this.#gananciaBanco[this.#banco[v] ?? 0] ?? 0);
    // Seno con un poco de segundo armónico: timbre suave y cálido.
    return ganancia * amplitud * (Math.sin(fase) + 0.15 * Math.sin(2 * fase));
  }
}

function acercar(actual: number, objetivo: number, paso: number): number {
  if (actual < objetivo) {
    return Math.min(objetivo, actual + paso);
  }
  return Math.max(objetivo, actual - paso);
}
