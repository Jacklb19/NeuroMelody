/**
 * A believable listening library for a demonstration account: six weeks of
 * sessions with their samples, ratings, music recap, context and a few notes,
 * plus two favorite plans and three saved melodies (P-17). Every value is invented; nothing comes from a
 * person. The same seed always gives the same library, so a backup can be
 * rebuilt for another account and its ids stay stable.
 *
 * Self-contained on purpose (no imports from `src`), so Node can run it
 * directly; `demoLibrary.test.ts` checks the result with the app's own validators.
 */

/** Shapes of `src/features/records/sessionRecord.ts` and `listeningBackup.ts`, written out. */
export interface DemoSample {
  readonly second: number;
  readonly meanHr: number | null;
  readonly rmssd: number | null;
  readonly sdnn: number | null;
  readonly lfHfRatio: number | null;
  readonly estimatedState: 'high' | 'uncertain' | 'low' | null;
  readonly goodQuality: boolean;
}

export interface DemoMusicStep {
  readonly atS: number;
  readonly level: 'high' | 'intermediate' | 'target' | 'sleep';
  readonly calmer: boolean;
}

export interface DemoSession {
  readonly id: string;
  readonly startedAt: string;
  readonly endedAt: string;
  readonly plannedMinutes: number;
  readonly goals: readonly string[];
  readonly listenedSeconds: number;
  readonly sourceKind: 'ble' | 'camera';
  readonly ratingBefore: number;
  readonly ratingAfter: number;
  readonly samples: readonly DemoSample[];
  readonly music: { readonly startTempoBpm: number; readonly endTempoBpm: number; readonly steps: readonly DemoMusicStep[] };
  readonly context: {
    readonly version: 1;
    readonly instrument: 'warm' | 'piano' | 'bowls';
    readonly ambience: 'none' | 'rain' | 'sea' | 'wind';
    readonly localHour: number;
    readonly localDate: string;
    readonly fixed: false;
    readonly profile: 'original' | 'minimal' | 'immersive';
  };
  readonly note?: string;
  readonly ownerId: string;
}

export interface DemoFavorite {
  readonly name: string;
  readonly duration: number;
  readonly goals: readonly string[];
  readonly instrument: DemoSession['context']['instrument'];
  readonly ambience: DemoSession['context']['ambience'];
  readonly fixed: boolean;
  readonly profile: DemoSession['context']['profile'];
}

/** Shape of `src/features/listen/melody.ts`, written out. */
export interface DemoMelody {
  readonly id: string;
  readonly ownerId: string;
  readonly name: string;
  readonly seed: number;
  readonly instrument: DemoSession['context']['instrument'];
  readonly ambience: DemoSession['context']['ambience'];
  readonly profile: DemoSession['context']['profile'];
  readonly level: DemoMusicStep['level'];
  readonly positionS: number;
  readonly durationMin: 15 | 30 | 45 | 60;
  readonly musicMix: number;
  readonly ambienceMix: number;
  readonly synthesisVersion: 1;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DemoBackup {
  readonly format: 'neuromelody-listening';
  readonly version: 2;
  readonly owner: string;
  readonly sessions: readonly DemoSession[];
  readonly favorites: readonly DemoFavorite[];
  readonly melodies: readonly DemoMelody[];
}

export interface DemoOptions {
  /** Account id (UUID) the sessions belong to. */
  readonly owner: string;
  /** The library ends the day before this instant. */
  readonly now: Date;
  /** Hours the account's local clock is behind UTC; Colombia is 5. */
  readonly utcOffsetHours?: number;
  readonly seed?: number;
}

const DAYS = 42;
const SAMPLE_PERIOD_S = 5;
const CALIBRATION_S = 180;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

type Goal = 'relax' | 'rest_before_sleep' | 'calm_after_activity' | 'slow_breathing' | 'pause';
type Sound = Pick<DemoSession['context'], 'instrument' | 'ambience' | 'profile'>;

/** The sound worlds of the plan (ADR-64), so most sessions show one. */
const WORLDS: readonly Sound[] = [
  { instrument: 'bowls', ambience: 'wind', profile: 'immersive' },
  { instrument: 'warm', ambience: 'sea', profile: 'original' },
  { instrument: 'piano', ambience: 'rain', profile: 'original' },
  { instrument: 'warm', ambience: 'wind', profile: 'minimal' },
  { instrument: 'warm', ambience: 'none', profile: 'immersive' },
  { instrument: 'piano', ambience: 'none', profile: 'minimal' },
];

/** What a session for each goal usually looks like: when, how long, and where its music goes. */
const HABITS: Readonly<Record<Goal, { readonly hours: readonly number[]; readonly minutes: readonly number[]; readonly calmest: DemoMusicStep['level']; readonly start: DemoMusicStep['level'] }>> = {
  relax: { hours: [18, 19, 20, 21], minutes: [15, 20, 30], calmest: 'target', start: 'intermediate' },
  rest_before_sleep: { hours: [22, 23], minutes: [20, 30, 45], calmest: 'sleep', start: 'intermediate' },
  calm_after_activity: { hours: [17, 18, 19], minutes: [10, 15, 20], calmest: 'target', start: 'high' },
  slow_breathing: { hours: [7, 8, 20], minutes: [10, 15], calmest: 'target', start: 'target' },
  pause: { hours: [12, 13, 15, 16], minutes: [10, 15], calmest: 'intermediate', start: 'intermediate' },
};

/** Days of the six weeks with a session, and its goal; some days have none, a few have two. */
const PLAN: readonly (readonly [number, Goal])[] = [
  [0, 'relax'], [1, 'rest_before_sleep'], [3, 'pause'], [4, 'relax'], [5, 'rest_before_sleep'], [7, 'calm_after_activity'],
  [8, 'relax'], [9, 'slow_breathing'], [10, 'rest_before_sleep'], [12, 'relax'], [13, 'pause'], [14, 'rest_before_sleep'],
  [15, 'calm_after_activity'], [16, 'relax'], [17, 'slow_breathing'], [19, 'rest_before_sleep'], [20, 'relax'], [21, 'pause'],
  [22, 'calm_after_activity'], [23, 'rest_before_sleep'], [24, 'relax'], [26, 'slow_breathing'], [27, 'rest_before_sleep'],
  [28, 'relax'], [29, 'calm_after_activity'], [30, 'relax'], [31, 'rest_before_sleep'], [33, 'pause'], [34, 'relax'],
  [35, 'slow_breathing'], [36, 'rest_before_sleep'], [37, 'calm_after_activity'], [38, 'relax'], [39, 'rest_before_sleep'],
  [40, 'relax'], [41, 'rest_before_sleep'],
];

const NOTES: readonly string[] = [
  'Me ayudó a desconectar después del trabajo.',
  'Al principio me costó concentrarme, luego fue más fácil.',
  'Con el mar de fondo me sentí muy tranquilo.',
  'Me quedé dormido antes de que terminara.',
  'Hoy la respiración guiada me sirvió mucho.',
  'Buena pausa a mitad de la tarde.',
];

const TEMPOS: Readonly<Record<DemoMusicStep['level'], number>> = { high: 76, intermediate: 66, target: 59, sleep: 50 };
const LADDER: readonly DemoMusicStep['level'][] = ['high', 'intermediate', 'target', 'sleep'];

/** Small, seeded random generator (mulberry32): the same seed gives the same library. */
function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const round = (value: number, digits: number): number => Number(value.toFixed(digits));

/** A UUID version 7 for `timeMs`, as the app gives its sessions (ADR-18). */
function uuidv7(timeMs: number, next: () => number): string {
  const bytes = Array.from({ length: 16 }, () => Math.floor(next() * 256));
  let timestamp = timeMs;
  for (let index = 5; index >= 0; index--) {
    bytes[index] = timestamp % 256;
    timestamp = Math.floor(timestamp / 256);
  }
  bytes[6] = 0x70 | ((bytes[6] ?? 0) & 0x0f);
  bytes[8] = 0x80 | ((bytes[8] ?? 0) & 0x3f);
  const hex = bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function pick<T>(options: readonly T[], next: () => number): T {
  const option = options[Math.floor(next() * options.length)];
  if (option === undefined) throw new RangeError('Nothing to pick from.');
  return option;
}

/** The steps the music took: down one level at a time, at least three minutes apart, until its calmest. */
function musicSteps(start: DemoMusicStep['level'], calmest: DemoMusicStep['level'], listenedS: number, next: () => number): DemoMusicStep[] {
  const steps: DemoMusicStep[] = [];
  let level = LADDER.indexOf(start);
  let atS = CALIBRATION_S + 60 + Math.floor(next() * 120);
  while (level < LADDER.indexOf(calmest) && atS < listenedS - 60) {
    level++;
    const reached = LADDER[level];
    if (reached === undefined) break;
    steps.push({ atS, level: reached, calmer: true });
    atS += 200 + Math.floor(next() * 240);
  }
  return steps;
}

/**
 * One sample every five seconds: the pulse settles from where the person
 * arrived, the variability between beats rises, and the estimate stays empty
 * while the baseline is taken.
 */
function samplesOf(listenedS: number, goal: Goal, sourceKind: DemoSession['sourceKind'], next: () => number): DemoSample[] {
  const arrivalHr = (goal === 'calm_after_activity' ? 84 : 74) + next() * 8;
  const settledHr = arrivalHr - (goal === 'pause' ? 4 : 9) - next() * 4;
  const arrivalRmssd = 24 + next() * 10;
  const settledRmssd = arrivalRmssd + 8 + next() * 10;
  const noiseShare = sourceKind === 'camera' ? 0.06 : 0.02;
  const samples: DemoSample[] = [];
  for (let second = SAMPLE_PERIOD_S; second <= listenedS; second += SAMPLE_PERIOD_S) {
    const progress = 1 - Math.exp(-second / Math.max(300, listenedS / 3));
    if (next() < noiseShare) {
      samples.push({ second, meanHr: null, rmssd: null, sdnn: null, lfHfRatio: null, estimatedState: null, goodQuality: false });
      continue;
    }
    const meanHr = arrivalHr + (settledHr - arrivalHr) * progress + (next() - 0.5) * 2.4;
    const rmssd = arrivalRmssd + (settledRmssd - arrivalRmssd) * progress + (next() - 0.5) * 4;
    const sdnn = rmssd * (1.45 + next() * 0.2);
    const lfHf = 2.3 - 1.1 * progress + (next() - 0.5) * 0.3;
    let estimatedState: DemoSample['estimatedState'] = null;
    if (second > CALIBRATION_S) {
      const lowChance = Math.min(0.85, progress * 1.1);
      const highChance = goal === 'calm_after_activity' && second < 600 ? 0.35 : 0.04;
      const draw = next();
      estimatedState = draw < highChance ? 'high' : draw < highChance + lowChance ? 'low' : 'uncertain';
    }
    samples.push({
      second,
      meanHr: round(meanHr, 1),
      rmssd: round(Math.max(5, rmssd), 1),
      sdnn: round(Math.max(8, sdnn), 1),
      lfHfRatio: round(Math.max(0.3, lfHf), 2),
      estimatedState,
      goodQuality: true,
    });
  }
  return samples;
}

function localDateOf(localMs: number): string {
  return new Date(localMs).toISOString().slice(0, 10);
}

/** The demonstration library of `owner`, ending the day before `now`. */
export function buildDemoBackup({ owner, now, utcOffsetHours = 5, seed = 2026 }: DemoOptions): DemoBackup {
  const next = random(seed);
  const offsetMs = utcOffsetHours * MS_PER_HOUR;
  // Midnight, local time, of the first day of the six weeks; dates below are local, instants UTC.
  const todayLocal = Math.floor((now.getTime() - offsetMs) / MS_PER_DAY) * MS_PER_DAY;
  const firstDayLocal = todayLocal - DAYS * MS_PER_DAY;
  let noteIndex = 0;

  const sessions = PLAN.map(([day, goal], index): DemoSession => {
    const habit = HABITS[goal];
    const hour = pick(habit.hours, next);
    const localStartMs = firstDayLocal + day * MS_PER_DAY + hour * MS_PER_HOUR + Math.floor(next() * 50) * 60_000;
    const startMs = localStartMs + offsetMs;
    const plannedMinutes = pick(habit.minutes, next);
    // Sleep sessions sometimes fade out before their plan (ADR-60); the rest listen most of it.
    const share = goal === 'rest_before_sleep' && next() < 0.4 ? 0.7 + next() * 0.15 : 0.9 + next() * 0.1;
    const listenedSeconds = Math.round(plannedMinutes * 60 * share);
    const sourceKind = next() < 0.8 ? 'ble' : 'camera';
    const sound = goal === 'rest_before_sleep' ? pick([WORLDS[1], WORLDS[0], WORLDS[4]], next) : pick(WORLDS, next);
    if (sound === undefined) throw new RangeError('Unknown world.');
    const steps = musicSteps(habit.start, habit.calmest, listenedSeconds, next);
    const lastLevel = steps.at(-1)?.level ?? habit.start;
    // Ratings improve a little over the weeks, as a person gets used to the sessions.
    const trend = Math.round((index / PLAN.length) * 1.5);
    const ratingBefore = Math.min(7, 3 + Math.floor(next() * 3) + (trend > 0 ? 1 : 0));
    const ratingAfter = Math.min(10, ratingBefore + 1 + Math.floor(next() * 3) + (trend > 1 ? 1 : 0));
    const withNote = index % 6 === 2;
    return {
      id: uuidv7(startMs, next),
      startedAt: new Date(startMs).toISOString(),
      endedAt: new Date(startMs + listenedSeconds * 1000 + 4000).toISOString(),
      plannedMinutes,
      goals: [goal],
      listenedSeconds,
      sourceKind,
      ratingBefore,
      ratingAfter,
      samples: samplesOf(listenedSeconds, goal, sourceKind, next),
      music: { startTempoBpm: TEMPOS[habit.start] + Math.round((next() - 0.5) * 6), endTempoBpm: TEMPOS[lastLevel], steps },
      context: { version: 1, ...sound, localHour: hour, localDate: localDateOf(localStartMs), fixed: false, profile: sound.profile },
      ...(withNote ? { note: NOTES[noteIndex++ % NOTES.length] } : {}),
      ownerId: owner,
    };
  });

  // Three pieces kept from Listen in the last week of the library, newest first, as the app lists them.
  const melodyOf = (daysAgo: number, melody: Omit<DemoMelody, 'id' | 'ownerId' | 'seed' | 'synthesisVersion' | 'createdAt' | 'updatedAt'>): DemoMelody => {
    // 21:00 local time, `daysAgo` days before today, as an instant in UTC.
    const atMs = todayLocal - daysAgo * MS_PER_DAY + 21 * MS_PER_HOUR + offsetMs;
    const at = new Date(atMs).toISOString();
    return { id: uuidv7(atMs, next), ownerId: owner, seed: Math.floor(next() * 2 ** 31), synthesisVersion: 1, createdAt: at, updatedAt: at, ...melody };
  };
  const melodies: DemoMelody[] = [
    melodyOf(1, { name: 'Costa nocturna antes de dormir', instrument: 'warm', ambience: 'sea', profile: 'original', level: 'sleep', positionS: 840, durationMin: 45, musicMix: 1, ambienceMix: 0.7 }),
    melodyOf(3, { name: 'Lluvia para leer', instrument: 'piano', ambience: 'rain', profile: 'original', level: 'target', positionS: 0, durationMin: 30, musicMix: 0.9, ambienceMix: 1 }),
    melodyOf(6, { name: 'Bosque de la tarde', instrument: 'bowls', ambience: 'wind', profile: 'immersive', level: 'intermediate', positionS: 300, durationMin: 15, musicMix: 1, ambienceMix: 0.5 }),
  ];

  return {
    format: 'neuromelody-listening',
    version: 2,
    owner,
    // The app lists sessions newest first.
    sessions: [...sessions].reverse(),
    favorites: [
      { name: 'Noche tranquila', duration: 30, goals: ['rest_before_sleep'], instrument: 'warm', ambience: 'sea', fixed: false, profile: 'original' },
      { name: 'Pausa del almuerzo', duration: 10, goals: ['pause'], instrument: 'piano', ambience: 'rain', fixed: false, profile: 'original' },
    ],
    melodies,
  };
}
