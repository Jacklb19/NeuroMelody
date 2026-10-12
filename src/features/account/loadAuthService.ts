import { createClient } from '@supabase/supabase-js';
import { env } from '../../config/env';
import type { AuthService } from './authService';
import { createSupabaseAuthService } from './supabaseAuthService';

/**
 * Where the browser keeps the session. It is the name Supabase uses by
 * default, written out so the service can also forget the session by itself
 * when the server cannot confirm a sign-out.
 */
export function sessionStorageKey(supabaseUrl: string): string {
  return `sb-${new URL(supabaseUrl).hostname.split('.')[0] ?? ''}-auth-token`;
}

/**
 * The account service of this deployment, or `null` when it was built
 * without the public Supabase settings. Loaded on demand so the listening
 * screens never download the Supabase client. Only the public anon key
 * reaches the browser; every table is protected by RLS (ADR-10, ADR-19).
 */
export function loadAuthService(): AuthService | null {
  if (env.supabaseUrl === null || env.supabaseAnonKey === null) return null;
  const storageKey = sessionStorageKey(env.supabaseUrl);
  const client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      storageKey,
      // PKCE keeps the tokens out of the URL fragment of confirmation and recovery links.
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  return createSupabaseAuthService(client, { url: env.supabaseUrl, anonKey: env.supabaseAnonKey, storageKey });
}
