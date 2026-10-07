import { describe, expect, it } from 'vitest';
import { EnvError, readPublicEnv } from './env';

describe('readPublicEnv', () => {
  it('leaves missing values as null until the features that need them arrive', () => {
    expect(readPublicEnv({})).toEqual({ supabaseUrl: null, supabaseAnonKey: null, apiBaseUrl: null });
  });

  it('normalizes URLs without a trailing slash', () => {
    const env = readPublicEnv({
      VITE_SUPABASE_URL: 'https://project.supabase.co/',
      VITE_SUPABASE_ANON_KEY: ' public-key ',
      VITE_API_BASE_URL: 'https://api.example.com/v1/',
    });
    expect(env).toEqual({
      supabaseUrl: 'https://project.supabase.co',
      supabaseAnonKey: 'public-key',
      apiBaseUrl: 'https://api.example.com/v1',
    });
  });

  it('rejects malformed or non-http URLs at startup', () => {
    expect(() => readPublicEnv({ VITE_API_BASE_URL: 'api.example.com' })).toThrow(EnvError);
    expect(() => readPublicEnv({ VITE_API_BASE_URL: 'ftp://api.example.com' })).toThrow(EnvError);
  });
});
