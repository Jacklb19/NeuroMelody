import type { Locale } from '../../i18n/locale';
import { DURATIONS_MIN, type DurationMin } from '../plan/plan';
import type { GoalId } from '../plan/goalCatalog';
import { readSessionRecord, type SessionRecord, type SessionSample } from '../records/sessionRecord';
import type { NarrativeFigures } from '../summary/narrativeFigures';
import type { CollectionRecording } from '../collection/collectionRecording';
import { progressNarrativeFromWire, type ProgressNarrative, type ProgressObservation } from '../progress/progressNarrative';
import type { Melody } from '../listen/melody';

/**
 * Client of the NeuroMelody API (ADR-19): sessions in the cloud, the
 * account and the two texts the language model writes (ADR-08). The API
 * only stores, returns and words data; nothing that sounds depends on it.
 * Every request carries the person's Supabase token.
 */

/** Why a request failed: the API's own codes plus what can go wrong on the way. */
export const CLOUD_ERROR_CODES = [
  'unauthenticated',
  'second_factor_required',
  'consent_required',
  'session_conflict',
  'not_found',
  'invalid_request',
  'storage_unavailable',
  /** The language model did not answer, or answered something the API refused. */
  'language_model_unavailable',
  /** The account used up today's calls to the language model (ADR-54). */
  'rate_limited',
  /** The account keeps as many sessions or recordings as the cloud allows (ADR-63). */
  'limit_reached',
  'network',
  'unknown',
] as const;

export type CloudErrorCode = (typeof CLOUD_ERROR_CODES)[number];

/** A failed request; the interface turns `code` into a sentence (ADR-25). */
export class CloudError extends Error {
  readonly code: CloudErrorCode;

  constructor(code: CloudErrorCode) {
    super(`Cloud request failed: ${code}`);
    this.name = 'CloudError';
    this.code = code;
  }
}

/** A session as the list returns it: enough to compare with the device, without its samples. */
export interface CloudSessionSummary {
  readonly id: string;
  readonly ratingAfter: number | null;
}

/**
 * The sessions the cloud lists, newest first. The API lists at most
 * `CLOUD_SESSION_LIST_LIMIT`; `truncated` says older ones were left out, so
 * a session missing from `sessions` is not necessarily deleted.
 */
export interface CloudSessionList {
  readonly sessions: readonly CloudSessionSummary[];
  readonly truncated: boolean;
}

/** Most sessions `GET /v1/sessions` returns; the same figure as `SESSION_LIST_LIMIT` in the API. */
export const CLOUD_SESSION_LIST_LIMIT = 500;

/**
 * A saved melody as the cloud returns it (P-17): every field but the owner,
 * which only the device keeps. Not yet validated: the caller checks it.
 */
export type CloudMelody = Readonly<Record<keyof Omit<Melody, 'ownerId'>, unknown>>;

/** A plan proposed by the language model (RF-13): one of the allowed lengths and a sentence about it. */
export interface PlanSuggestion {
  readonly durationMin: DurationMin;
  /** Text generated automatically; the interface always says so. */
  readonly note: string;
}

/** A session told in plain words by the language model (RF-15). Generated automatically. */
export interface SessionNarrative {
  readonly text: string;
}

export interface CloudApi {
  /** Stores a session; sending it again changes nothing but the rating given afterwards. */
  saveSession(record: SessionRecord): Promise<void>;
  listSessions(): Promise<CloudSessionList>;
  /** The whole session, or `null` when the cloud has none with that id. */
  getSession(id: string): Promise<SessionRecord | null>;
  /** Deleting a session the cloud no longer has is not an error: the result is the same. */
  deleteSession(id: string): Promise<void>;
  deleteAccount(): Promise<void>;
  /** Asks for a session length for the chosen goals. Only the goals, the hour and the language travel. */
  suggestPlan(goals: readonly GoalId[], localHour: number, locale: Locale): Promise<PlanSuggestion>;
  /**
   * Asks for the plain-words summary of a session, from its aggregated figures. The session
   * does not have to be in the cloud. Calling it states the person's consent to send those
   * figures to the language model.
   */
  summarizeSession(id: string, locale: Locale, figures: NarrativeFigures): Promise<SessionNarrative>;
  /** Explicit consent to send only browser-computed comparisons for reviewed wording (ADR-48). */
  summarizeProgress(locale: Locale, observations: readonly ProgressObservation[]): Promise<ProgressNarrative>;
  /**
   * Sends a guided recording to train the classifier (ADR-33). Calling it states the
   * person's consent to send that recording. Sending it again changes nothing.
   */
  sendRecording(recording: CollectionRecording): Promise<void>;
  /** Ids of the recordings the person has sent. */
  listSentRecordings(): Promise<string[]>;
  /** Withdrawing a recording the cloud no longer has is not an error: the result is the same. */
  withdrawRecording(id: string): Promise<void>;
  /**
   * The file of the latest published classifier, not yet validated, or `null` when no
   * version has been published. The model code checks every field before using it.
   */
  currentClassifier(): Promise<unknown>;
  /** The melodies the account saved (P-17). An API from before them answers `not_found`. */
  listMelodies(): Promise<CloudMelody[]>;
  /** Stores a melody under its own id; the cloud keeps its newest version. */
  saveMelody(melody: Melody): Promise<void>;
  /** Deleting a melody the cloud no longer has is not an error: the result is the same. */
  deleteMelody(id: string): Promise<void>;
}

/** Paths of the API, relative to its base URL. */
const SESSIONS_PATH = '/v1/sessions';
const ACCOUNT_PATH = '/v1/account';
const PLAN_SUGGESTION_PATH = '/v1/plans/suggest';
const SUMMARY_SUFFIX = '/summary';
const RECORDINGS_PATH = '/v1/recordings';
const CLASSIFIER_PATH = '/v1/models/classifier';
const PROGRESS_SUMMARY_PATH = '/v1/progress/summary';
const MELODIES_PATH = '/v1/melodies';
const NOT_FOUND = 404;

type Json = Readonly<Record<string, unknown>>;

const isJson = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value);

function isCloudErrorCode(value: unknown): value is CloudErrorCode {
  return CLOUD_ERROR_CODES.some((code) => code === value);
}

/** The session in the API's field names. */
function toWire(record: SessionRecord): Json {
  return {
    id: record.id,
    started_at: record.startedAt,
    ended_at: record.endedAt,
    planned_minutes: record.plannedMinutes,
    goals: record.goals,
    listened_seconds: record.listenedSeconds,
    source_kind: record.sourceKind,
    rating_before: record.ratingBefore,
    rating_after: record.ratingAfter,
    // Sent only when it says something: an API from before ADR-51 still accepts every other session.
    ...(record.signalMode === 'hr_only' ? { signal_mode: record.signalMode } : {}),
    samples: record.samples.map((sample) => ({
      second: sample.second,
      mean_hr: sample.meanHr,
      rmssd: sample.rmssd,
      sdnn: sample.sdnn,
      lf_hf_ratio: sample.lfHfRatio,
      estimated_state: sample.estimatedState,
      good_quality: sample.goodQuality,
    })),
  };
}

/** An instant as the device stores it; the API may answer with another offset notation. */
function toInstant(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const time = Date.parse(value);
  return Number.isNaN(time) ? value : new Date(time).toISOString();
}

/**
 * Reads a session the API returned. Nothing from the network is trusted:
 * the result goes through the same validation as a record read from storage.
 */
export function fromWire(value: unknown): SessionRecord | null {
  if (!isJson(value) || !Array.isArray(value.samples)) return null;
  const samples = value.samples.map((sample: unknown): Partial<Record<keyof SessionSample, unknown>> | null =>
    isJson(sample) ? {
      second: sample.second,
      meanHr: sample.mean_hr,
      rmssd: sample.rmssd,
      sdnn: sample.sdnn,
      lfHfRatio: sample.lf_hf_ratio,
      estimatedState: sample.estimated_state,
      goodQuality: sample.good_quality,
    } : null);
  return readSessionRecord({
    id: value.id,
    startedAt: toInstant(value.started_at),
    endedAt: toInstant(value.ended_at),
    plannedMinutes: value.planned_minutes,
    goals: value.goals,
    listenedSeconds: value.listened_seconds,
    sourceKind: value.source_kind,
    ratingBefore: value.rating_before,
    ratingAfter: value.rating_after,
    samples,
    // Intervals are the default and stay implicit, like in the sessions stored on the device.
    ...(value.signal_mode === 'hr_only' ? { signalMode: 'hr_only' } : {}),
  });
}

function summaryFromWire(value: unknown): CloudSessionSummary | null {
  if (!isJson(value) || typeof value.id !== 'string') return null;
  const rating = value.rating_after;
  return { id: value.id, ratingAfter: typeof rating === 'number' ? rating : null };
}

/** A guided recording in the API's field names, with the consent that sending it states. */
function recordingToWire(recording: CollectionRecording): Json {
  return {
    id: recording.id,
    participant: recording.participant,
    recorded_at: recording.recordedAt,
    source_kind: recording.sourceKind,
    segments: recording.segments.map((segment) => ({
      label: segment.label,
      planned_seconds: segment.plannedSeconds,
      beat_times_ms: segment.beatTimesMs,
      rr_ms: segment.rrMs,
    })),
    consent: true,
  };
}

/** A melody in the API's field names; the owner never travels. */
function melodyToWire(melody: Melody): Json {
  return {
    name: melody.name,
    seed: melody.seed,
    instrument: melody.instrument,
    ambience: melody.ambience,
    profile: melody.profile,
    level: melody.level,
    position_seconds: melody.positionS,
    duration_minutes: melody.durationMin,
    music_mix: melody.musicMix,
    ambience_mix: melody.ambienceMix,
    synthesis_version: melody.synthesisVersion,
    created_at: melody.createdAt,
    updated_at: melody.updatedAt,
  };
}

/** A melody the API listed, in the device's field names, still to be validated. */
export function melodyFromWire(value: unknown): CloudMelody | null {
  if (!isJson(value)) return null;
  return {
    id: value.id,
    name: value.name,
    seed: value.seed,
    instrument: value.instrument,
    ambience: value.ambience,
    profile: value.profile,
    level: value.level,
    positionS: value.position_seconds,
    durationMin: value.duration_minutes,
    musicMix: value.music_mix,
    ambienceMix: value.ambience_mix,
    synthesisVersion: value.synthesis_version,
    createdAt: toInstant(value.created_at),
    updatedAt: toInstant(value.updated_at),
  };
}

/** The figures of a summary in the API's field names. */
function figuresToWire(figures: NarrativeFigures): Json {
  return {
    planned_minutes: figures.plannedMinutes,
    listened_minutes: figures.listenedMinutes,
    goals: figures.goals,
    pulse_start: figures.pulse?.start ?? null,
    pulse_end: figures.pulse?.end ?? null,
    variation_start: figures.variation?.start ?? null,
    variation_end: figures.variation?.end ?? null,
    minutes_by_state: figures.minutesByState,
    rating_before: figures.ratingBefore,
    rating_after: figures.ratingAfter,
  };
}

/** Text the API marked as generated automatically; anything else is not shown. */
function generatedText(body: Json, field: string): string | null {
  const text = body[field];
  return body.generated === true && typeof text === 'string' && text.trim() !== '' ? text.trim() : null;
}

/** Reads a proposed plan. The length is checked against the app's own options, whatever the API says. */
export function planFromWire(value: unknown): PlanSuggestion | null {
  if (!isJson(value)) return null;
  const durationMin = DURATIONS_MIN.find((minutes) => minutes === value.duration_minutes);
  const note = generatedText(value, 'note');
  return durationMin === undefined || note === null ? null : { durationMin, note };
}

export function narrativeFromWire(value: unknown): SessionNarrative | null {
  if (!isJson(value)) return null;
  const text = generatedText(value, 'text');
  return text === null ? null : { text };
}

interface CloudApiOptions {
  /** Base URL of the API, without a trailing slash (`env.apiBaseUrl`). */
  readonly baseUrl: string;
  /** The person's current token; `null` when nobody is signed in. */
  readonly accessToken: () => Promise<string | null>;
  /** Injectable to test without a network. */
  readonly fetch?: typeof fetch;
}

export function createCloudApi({ baseUrl, accessToken, fetch: send = fetch }: CloudApiOptions): CloudApi {
  async function request(method: string, path: string, body?: Json): Promise<Response> {
    const token = await accessToken();
    if (token === null) throw new CloudError('unauthenticated');
    let response: Response;
    try {
      response = await send(`${baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      throw new CloudError('network');
    }
    return response;
  }

  /** The error an unsuccessful answer stands for; the API always says `{ code }`. */
  async function failure(response: Response): Promise<CloudError> {
    const body: unknown = await response.json().catch(() => null);
    const code = isJson(body) ? body.code : null;
    return new CloudError(isCloudErrorCode(code) ? code : 'unknown');
  }

  async function json(response: Response): Promise<unknown> {
    if (!response.ok) throw await failure(response);
    return response.json().catch(() => { throw new CloudError('unknown'); });
  }

  return {
    async saveSession(record) {
      const response = await request('POST', SESSIONS_PATH, toWire(record));
      if (!response.ok) throw await failure(response);
    },
    async listSessions() {
      const body = await json(await request('GET', SESSIONS_PATH));
      if (!isJson(body) || !Array.isArray(body.sessions)) throw new CloudError('unknown');
      if (body.truncated !== undefined && typeof body.truncated !== 'boolean') throw new CloudError('unknown');
      const sessions = body.sessions.map(summaryFromWire).filter((summary) => summary !== null);
      // An API published before the flag existed does not send it: a full list may then be cut short.
      const truncated = body.truncated ?? sessions.length >= CLOUD_SESSION_LIST_LIMIT;
      return { sessions, truncated };
    },
    async getSession(id) {
      const response = await request('GET', `${SESSIONS_PATH}/${encodeURIComponent(id)}`);
      if (response.status === NOT_FOUND) return null;
      const record = fromWire(await json(response));
      if (record === null) throw new CloudError('unknown');
      return record;
    },
    async deleteSession(id) {
      const response = await request('DELETE', `${SESSIONS_PATH}/${encodeURIComponent(id)}`);
      if (!response.ok && response.status !== NOT_FOUND) throw await failure(response);
    },
    async deleteAccount() {
      const response = await request('DELETE', ACCOUNT_PATH);
      if (!response.ok) throw await failure(response);
    },
    async suggestPlan(goals, localHour, locale) {
      const body = await json(await request('POST', PLAN_SUGGESTION_PATH, { goals, local_hour: localHour, locale }));
      const plan = planFromWire(body);
      if (plan === null) throw new CloudError('unknown');
      return plan;
    },
    async sendRecording(recording) {
      const response = await request('POST', RECORDINGS_PATH, recordingToWire(recording));
      if (!response.ok) throw await failure(response);
    },
    async listSentRecordings() {
      const body = await json(await request('GET', RECORDINGS_PATH));
      if (!isJson(body) || !Array.isArray(body.recordings)) throw new CloudError('unknown');
      return body.recordings.flatMap((item: unknown) => (isJson(item) && typeof item.id === 'string' ? [item.id] : []));
    },
    async withdrawRecording(id) {
      const response = await request('DELETE', `${RECORDINGS_PATH}/${encodeURIComponent(id)}`);
      if (!response.ok && response.status !== NOT_FOUND) throw await failure(response);
    },
    async currentClassifier() {
      const response = await request('GET', CLASSIFIER_PATH);
      if (response.status === NOT_FOUND) return null;
      const body = await json(response);
      if (!isJson(body) || !isJson(body.model)) throw new CloudError('unknown');
      return body.model;
    },
    async summarizeSession(id, locale, figures) {
      const path = `${SESSIONS_PATH}/${encodeURIComponent(id)}${SUMMARY_SUFFIX}`;
      const body = { consent: true, locale, figures: figuresToWire(figures) };
      const narrative = narrativeFromWire(await json(await request('POST', path, body)));
      if (narrative === null) throw new CloudError('unknown');
      return narrative;
    },
    async listMelodies() {
      const body = await json(await request('GET', MELODIES_PATH));
      if (!isJson(body) || !Array.isArray(body.melodies)) throw new CloudError('unknown');
      return body.melodies.map(melodyFromWire).filter((melody) => melody !== null);
    },
    async saveMelody(melody) {
      const response = await request('PUT', `${MELODIES_PATH}/${encodeURIComponent(melody.id)}`, melodyToWire(melody));
      if (!response.ok) throw await failure(response);
    },
    async deleteMelody(id) {
      const response = await request('DELETE', `${MELODIES_PATH}/${encodeURIComponent(id)}`);
      if (!response.ok && response.status !== NOT_FOUND) throw await failure(response);
    },
    async summarizeProgress(locale, observations) {
      const body = await json(await request('POST', PROGRESS_SUMMARY_PATH, { consent: true, locale, observations }));
      const narrative = progressNarrativeFromWire(body, observations);
      if (narrative === null) throw new CloudError('language_model_unavailable');
      return narrative;
    },
  };
}
