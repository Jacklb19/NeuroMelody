import { readSessionRecord, type SessionRecord, type SessionSample } from '../records/sessionRecord';

/**
 * Client of the NeuroMelody API (ADR-19): sessions in the cloud and the
 * account. The API only stores and returns data; nothing that sounds
 * depends on it. Every request carries the person's Supabase token.
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

export interface CloudApi {
  /** Stores a session; sending it again changes nothing but the rating given afterwards. */
  saveSession(record: SessionRecord): Promise<void>;
  listSessions(): Promise<CloudSessionSummary[]>;
  /** The whole session, or `null` when the cloud has none with that id. */
  getSession(id: string): Promise<SessionRecord | null>;
  /** Deleting a session the cloud no longer has is not an error: the result is the same. */
  deleteSession(id: string): Promise<void>;
  deleteAccount(): Promise<void>;
}

/** Paths of the API, relative to its base URL. */
const SESSIONS_PATH = '/v1/sessions';
const ACCOUNT_PATH = '/v1/account';
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
  });
}

function summaryFromWire(value: unknown): CloudSessionSummary | null {
  if (!isJson(value) || typeof value.id !== 'string') return null;
  const rating = value.rating_after;
  return { id: value.id, ratingAfter: typeof rating === 'number' ? rating : null };
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
      return body.sessions.map(summaryFromWire).filter((summary) => summary !== null);
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
  };
}
