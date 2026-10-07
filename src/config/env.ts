/**
 * Public configuration of this deployment, read once from Vite's
 * environment. Only `VITE_` variables reach the browser and none of them is
 * a secret: secrets live only in the backend (AGENTS.md, ADR-19).
 *
 * Every value is optional until the account and the API arrive (S6.2);
 * features that need one check for `null` and explain what is missing.
 */
export interface PublicEnv {
  readonly supabaseUrl: string | null;
  readonly supabaseAnonKey: string | null;
  readonly apiBaseUrl: string | null;
}

/** The deployment was configured with an invalid value; fails at startup, not mid-session. */
export class EnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvError';
  }
}

const ALLOWED_PROTOCOLS = ['https:', 'http:'];

function optionalText(source: Readonly<Record<string, unknown>>, name: string): string | null {
  const raw = source[name];
  if (raw === undefined || raw === '') return null;
  if (typeof raw !== 'string') throw new EnvError(`${name} must be a string.`);
  return raw.trim();
}

/** Absolute http(s) URL without a trailing slash, so paths can be appended safely. */
function optionalUrl(source: Readonly<Record<string, unknown>>, name: string): string | null {
  const text = optionalText(source, name);
  if (text === null) return null;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new EnvError(`${name} must be an absolute URL.`);
  }
  if (!ALLOWED_PROTOCOLS.includes(url.protocol)) throw new EnvError(`${name} must use http or https.`);
  return url.href.replace(/\/+$/, '');
}

/** Validates the public environment; exported for tests. */
export function readPublicEnv(source: Readonly<Record<string, unknown>>): PublicEnv {
  return {
    supabaseUrl: optionalUrl(source, 'VITE_SUPABASE_URL'),
    supabaseAnonKey: optionalText(source, 'VITE_SUPABASE_ANON_KEY'),
    apiBaseUrl: optionalUrl(source, 'VITE_API_BASE_URL'),
  };
}

export const env: PublicEnv = readPublicEnv(import.meta.env);

/** Production build: only then the offline worker is registered. */
export const IS_PRODUCTION_BUILD: boolean = import.meta.env.PROD;
