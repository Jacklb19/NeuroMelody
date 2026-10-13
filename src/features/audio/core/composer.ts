import type { RandomSource } from '../../acquisition/simulator/prng';
import { ARRANGEMENTS, CHIME_LOOPS, FIGURE, type Arrangement } from './arrangement';
import { LAYER } from './layers';
import { MIDI_TONIC, SCALES, SEMITONES_PER_OCTAVE, degreeNote, type Mode } from './theory';
import { BROKEN_CHORD_TIMBRE, CHIME_TIMBRE, MELODY_TIMBRE } from './timbres';
import type { NoteSink } from './voices';

/** The sequencer counts half beats, the shortest note the melody plays. */
export const TICKS_PER_BEAT = 2;

/** The melody starts one octave above the tonic (D4) and reaches this many octaves above it. */
const MELODY_BASE_MIDI = MIDI_TONIC + SEMITONES_PER_OCTAVE;
const MELODY_RANGE_OCTAVES = 1.6;
/** A new motif begins on one of these scale degrees, in the middle of the range. */
const MELODY_START_LOW = 2;
const MELODY_START_HIGH = 5;
/** Melody notes fall at random within this distance of the centre. */
const MELODY_PAN_RANGE = 0.3;
/** A struck note sounds up to this long after its place on the grid: played by hand, not by a machine. */
const HUMAN_DELAY_S = 0.025;
/** How much the loudness of a struck note varies at random below what the phrase asks. */
const HUMAN_VELOCITY_RANGE = 0.12;

/** A motif is a short melodic idea of 3 to 6 notes, repeated 2 or 3 times before a new one is invented. */
const MOTIF_MIN_NOTES = 3;
const MOTIF_MAX_NOTES = 6;
const MOTIF_MIN_USES = 2;
const MOTIF_MAX_USES = 3;
/** Most notes move one scale degree, some two, and the rest repeat the previous one. */
const STEP_PROBABILITY = 0.7;
const SKIP_PROBABILITY = 0.25;
/** Lengths a note of a motif may have, in ticks, and how likely each is (cumulative). */
const NOTE_TICKS = [1, 2, 3, 4] as const;
const NOTE_TICKS_CUMULATIVE = [0.3, 0.8, 0.9, 1] as const;
/** The last note of a motif is always long: the phrase comes to rest on it. */
const FINAL_NOTE_TICKS = 4;
/** A repetition of the motif starts this many degrees away: the idea is heard again, higher or lower. */
const SEQUENCE_SHIFTS = [-2, -1, 1, 2] as const;
/** Silence after a phrase, in ticks, so the melody breathes. */
const PHRASE_REST_MIN_TICKS = 4;
const PHRASE_REST_MAX_TICKS = 10;
/** In the quietest stretches of a session the rests grow up to this many times longer. */
const SPARSE_REST_FACTOR = 2;
/** Degrees searched around the last note of a phrase for a note of the chord, nearest first. */
const RESOLUTION_OFFSETS = [0, -1, 1, -2, 2] as const;
/** Loudness of the notes of a phrase: it rises to the middle and falls again. */
const PHRASE_VELOCITY_EDGE = 0.72;

/** Broken chord: on every second beat that does not start a chord, one of its notes may sound an octave above. */
const BROKEN_CHORD_EVERY_BEATS = 2;
/** Chance that it does, from the quietest stretches of a session to the busiest. */
const BROKEN_CHORD_MIN_PROBABILITY = 0.45;
const BROKEN_CHORD_MAX_PROBABILITY = 0.9;
/** Chance that the note sounds an octave above the chord, from the lowest stretches to the highest. */
const BROKEN_CHORD_MIN_RAISE = 0.35;
const BROKEN_CHORD_MAX_RAISE = 0.95;
/** Chance that the next note is the one above the previous; otherwise the one below. */
const BROKEN_CHORD_RISE_PROBABILITY = 0.65;
/** Highest note it plays, in semitones above the tonic (B5); above it the note stays in its own octave. */
const BROKEN_CHORD_TOP = 33;
const BROKEN_CHORD_PAN_RANGE = 0.5;
const BROKEN_CHORD_MIN_VELOCITY = 0.7;

const CHIME_PAN_RANGE = 0.6;
const CHIME_MIN_VELOCITY = 0.65;
/** Chance that a chime sounds when its loop comes round, in the quietest stretches of a session. */
const CHIME_MIN_PROBABILITY = 0.55;
/** A chime may sound this long after its place on the grid. */
const CHIME_DELAY_S = 0.08;
/** The lift of the session moves the start of a new motif by up to this many degrees, down or up. */
const LIFT_DEGREES = 1;

/**
 * Decides what one voice bank plays: the chords of its mode in order, the
 * figure above them and the phrases of the melody. It only decides notes and
 * sends them to a `NoteSink`; it makes no sound itself, so it can be tested
 * without rendering audio.
 *
 * Real-time rules: its buffers are allocated in the constructor and `onTick`
 * creates no objects.
 *
 * Musical decisions come from `random`; where a note sits and how hard it is
 * struck come from `colour`, so tuning the sound never changes the notes.
 */
export class BankComposer {
  readonly #bank: number;
  readonly #random: RandomSource;
  readonly #colour: RandomSource;
  readonly #sink: NoteSink;

  #mode: Mode;
  #arrangement: Arrangement;
  #progression: readonly number[] = [];
  #step = -1;
  #chord: readonly number[] = [];
  #holding = false;

  #brokenIndex = 0;
  /** Ticks left before each chime sounds again. */
  readonly #chimeTicks = new Int32Array(CHIME_LOOPS.length);

  /** The motif: how many degrees each note moves from the previous one, and how long it lasts. */
  readonly #motifSteps = new Int8Array(MOTIF_MAX_NOTES);
  readonly #motifTicks = new Int8Array(MOTIF_MAX_NOTES);
  #motifLength = 0;
  #motifUses = 0;
  /** Index of the next note of the phrase; −1 between phrases. */
  #position = -1;
  #wait = 0;
  #rest = 0;
  #degree = 0;
  #phraseStart = 0;
  /** Slow moods of the session, from 0 to 1 (see `onTick`). */
  #density = 1;
  #lift = 0.5;

  constructor(bank: number, mode: Mode, random: RandomSource, colour: RandomSource, sink: NoteSink) {
    this.#bank = bank;
    this.#random = random;
    this.#colour = colour;
    this.#sink = sink;
    this.#mode = mode;
    this.#arrangement = ARRANGEMENTS[mode];
    this.start(mode);
  }

  get mode(): Mode {
    return this.#mode;
  }

  /** Begins a mode from its first chord. Called when a harmonic cycle closes. */
  start(mode: Mode): void {
    this.#mode = mode;
    this.#arrangement = ARRANGEMENTS[mode];
    this.#drawProgression();
    this.#step = -1;
    this.#chord = this.#arrangement.chords[this.#progression[0] ?? 0] ?? [];
    this.#brokenIndex = 0;
    for (let c = 0; c < CHIME_LOOPS.length; c++) {
      // Each chime enters at a different point of its loop, so they do not start together.
      const period = (CHIME_LOOPS[c]?.periodBeats ?? 1) * TICKS_PER_BEAT;
      this.#chimeTicks[c] = 1 + Math.floor(this.#random() * period);
    }
    this.#position = -1;
    this.#rest = PHRASE_REST_MIN_TICKS;
    this.#motifUses = 0;
  }

  /** Stops deciding notes for a bank that is no longer heard and lets its chord go. */
  stop(): void {
    this.#letChordGo();
    this.#position = -1;
  }

  /**
   * Advances half a beat.
   *
   * @param tick Half beats since the session started.
   * @param harmony Whether the harmony layer is heard.
   * @param melody Whether the melody layer is heard.
   * @param density How busy this stretch of the session is, from 0 (sparse) to 1.
   * @param lift How high this stretch of the session sits, from 0 (low) to 1.
   */
  onTick(tick: number, harmony: boolean, melody: boolean, density: number, lift: number): void {
    this.#density = density;
    this.#lift = lift;
    const onBeat = tick % TICKS_PER_BEAT === 0;
    const beat = tick / TICKS_PER_BEAT;
    const startsChord = onBeat && beat % this.#arrangement.beatsPerChord === 0;
    if (startsChord) {
      this.#nextChord();
    }
    if (!harmony) {
      this.#letChordGo();
    } else {
      if (startsChord) {
        this.#sink.holdChord(this.#chord, MIDI_TONIC, this.#arrangement.pad, LAYER.harmony, this.#bank);
        this.#holding = true;
      }
      if (this.#arrangement.figure === FIGURE.brokenChord) {
        if (onBeat && !startsChord && beat % BROKEN_CHORD_EVERY_BEATS === 0) {
          this.#brokenChord();
        }
      } else if (this.#arrangement.figure === FIGURE.chimes) {
        this.#chimes();
      }
    }
    if (melody) {
      this.#phrase(onBeat);
    } else {
      this.#position = -1;
    }
  }

  #letChordGo(): void {
    if (this.#holding) {
      this.#sink.releaseChord(this.#bank);
      this.#holding = false;
    }
  }

  #drawProgression(): void {
    const { progressions } = this.#arrangement;
    this.#progression = progressions[Math.floor(this.#random() * progressions.length)] ?? [];
  }

  #nextChord(): void {
    this.#step++;
    if (this.#step >= this.#progression.length) {
      this.#drawProgression();
      this.#step = 0;
    }
    this.#chord = this.#arrangement.chords[this.#progression[this.#step] ?? 0] ?? [];
  }

  #brokenChord(): void {
    const chance =
      BROKEN_CHORD_MIN_PROBABILITY + (BROKEN_CHORD_MAX_PROBABILITY - BROKEN_CHORD_MIN_PROBABILITY) * this.#density;
    if (this.#random() >= chance) {
      return;
    }
    const notes = this.#chord.length;
    const move = this.#random() < BROKEN_CHORD_RISE_PROBABILITY ? 1 : notes - 1;
    this.#brokenIndex = (this.#brokenIndex + move) % notes;
    const own = this.#chord[this.#brokenIndex] ?? 0;
    const raise = BROKEN_CHORD_MIN_RAISE + (BROKEN_CHORD_MAX_RAISE - BROKEN_CHORD_MIN_RAISE) * this.#lift;
    const raised = this.#random() < raise ? own + SEMITONES_PER_OCTAVE : own;
    const note = raised > BROKEN_CHORD_TOP ? own : raised;
    this.#sink.strike(
      MIDI_TONIC + note,
      BROKEN_CHORD_TIMBRE,
      (this.#colour() * 2 - 1) * BROKEN_CHORD_PAN_RANGE,
      BROKEN_CHORD_MIN_VELOCITY + this.#colour() * (1 - BROKEN_CHORD_MIN_VELOCITY),
      this.#colour() * HUMAN_DELAY_S,
      LAYER.harmony,
      this.#bank,
    );
  }

  #chimes(): void {
    for (let c = 0; c < CHIME_LOOPS.length; c++) {
      const left = (this.#chimeTicks[c] ?? 0) - 1;
      if (left > 0) {
        this.#chimeTicks[c] = left;
        continue;
      }
      const loop = CHIME_LOOPS[c];
      this.#chimeTicks[c] = (loop?.periodBeats ?? 1) * TICKS_PER_BEAT;
      // In a sparse stretch some turns of the loop pass in silence.
      if (this.#random() >= CHIME_MIN_PROBABILITY + (1 - CHIME_MIN_PROBABILITY) * this.#density) {
        continue;
      }
      this.#sink.strike(
        MIDI_TONIC + (loop?.semitones ?? 0),
        CHIME_TIMBRE,
        (this.#colour() * 2 - 1) * CHIME_PAN_RANGE,
        CHIME_MIN_VELOCITY + this.#colour() * (1 - CHIME_MIN_VELOCITY),
        this.#colour() * CHIME_DELAY_S,
        LAYER.harmony,
        this.#bank,
      );
    }
  }

  /** Plays the melody: a phrase states the motif, rests, and the next one repeats it higher or lower. */
  #phrase(onBeat: boolean): void {
    if (this.#position < 0) {
      if (this.#rest > 0) {
        this.#rest--;
        return;
      }
      // Phrases begin on the beat.
      if (!onBeat) {
        return;
      }
      this.#beginPhrase();
    } else if (this.#wait > 0) {
      this.#wait--;
      return;
    }

    const scale = SCALES[this.#mode];
    const top = Math.round(scale.length * MELODY_RANGE_OCTAVES);
    const index = this.#position;
    const last = index === this.#motifLength - 1;
    let degree = this.#degree + (this.#motifSteps[index] ?? 0);
    // A step that would leave the range turns back instead.
    if (degree < 0 || degree > top) {
      degree = this.#degree - (this.#motifSteps[index] ?? 0);
    }
    degree = Math.min(top, Math.max(0, degree));
    if (last) {
      degree = this.#resolve(degree, top);
    }
    this.#degree = degree;

    // Loudness rises to the middle of the phrase and falls again.
    const arch = Math.sin((Math.PI * (index + 0.5)) / this.#motifLength);
    this.#sink.strike(
      degreeNote(scale, degree, MELODY_BASE_MIDI),
      MELODY_TIMBRE,
      (this.#colour() * 2 - 1) * MELODY_PAN_RANGE,
      (PHRASE_VELOCITY_EDGE + (1 - PHRASE_VELOCITY_EDGE) * arch) * (1 - this.#colour() * HUMAN_VELOCITY_RANGE),
      this.#colour() * HUMAN_DELAY_S,
      LAYER.melody,
      this.#bank,
    );

    const ticks = this.#motifTicks[index] ?? 1;
    if (last) {
      this.#position = -1;
      const rest =
        PHRASE_REST_MIN_TICKS + Math.floor(this.#random() * (PHRASE_REST_MAX_TICKS - PHRASE_REST_MIN_TICKS + 1));
      this.#rest = ticks + Math.round(rest * (1 + (SPARSE_REST_FACTOR - 1) * (1 - this.#density)));
    } else {
      this.#position = index + 1;
      this.#wait = ticks - 1;
    }
  }

  #beginPhrase(): void {
    if (this.#motifUses <= 0) {
      this.#inventMotif();
      this.#phraseStart =
        MELODY_START_LOW +
        Math.floor(this.#random() * (MELODY_START_HIGH - MELODY_START_LOW + 1)) +
        Math.round((this.#lift * 2 - 1) * LIFT_DEGREES);
    } else {
      const shift = SEQUENCE_SHIFTS[Math.floor(this.#random() * SEQUENCE_SHIFTS.length)] ?? 0;
      const top = Math.round(SCALES[this.#mode].length * MELODY_RANGE_OCTAVES);
      this.#phraseStart = Math.min(top, Math.max(0, this.#phraseStart + shift));
    }
    this.#motifUses--;
    this.#degree = this.#phraseStart;
    this.#position = 0;
    this.#wait = 0;
  }

  /** A new motif: it moves by step towards a turning point and comes back, and its last note is long. */
  #inventMotif(): void {
    const length = MOTIF_MIN_NOTES + Math.floor(this.#random() * (MOTIF_MAX_NOTES - MOTIF_MIN_NOTES + 1));
    const direction = this.#random() < 0.5 ? 1 : -1;
    const turn = 1 + Math.floor(this.#random() * (length - 1));
    this.#motifSteps[0] = 0;
    for (let i = 0; i < length; i++) {
      if (i > 0) {
        const size = this.#random();
        const magnitude = size < STEP_PROBABILITY ? 1 : size < STEP_PROBABILITY + SKIP_PROBABILITY ? 2 : 0;
        this.#motifSteps[i] = (i <= turn ? direction : -direction) * magnitude;
      }
      const draw = this.#random();
      let choice = 0;
      while (choice < NOTE_TICKS.length - 1 && draw >= (NOTE_TICKS_CUMULATIVE[choice] ?? 1)) {
        choice++;
      }
      this.#motifTicks[i] = NOTE_TICKS[choice] ?? 1;
    }
    this.#motifTicks[length - 1] = FINAL_NOTE_TICKS;
    this.#motifLength = length;
    this.#motifUses = MOTIF_MIN_USES + Math.floor(this.#random() * (MOTIF_MAX_USES - MOTIF_MIN_USES + 1));
  }

  /** The nearest degree that is a note of the chord sounding now, so the phrase ends at rest. */
  #resolve(degree: number, top: number): number {
    const scale = SCALES[this.#mode];
    for (let o = 0; o < RESOLUTION_OFFSETS.length; o++) {
      const candidate = degree + (RESOLUTION_OFFSETS[o] ?? 0);
      if (candidate < 0 || candidate > top) {
        continue;
      }
      const pitch = degreeNote(scale, candidate, 0);
      for (let i = 0; i < this.#chord.length; i++) {
        if ((pitch - (this.#chord[i] ?? 0)) % SEMITONES_PER_OCTAVE === 0) {
          return candidate;
        }
      }
    }
    return degree;
  }
}
