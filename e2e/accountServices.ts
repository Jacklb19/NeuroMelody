/**
 * Account services of the E2E build. Nothing listens there: `fixtures.ts` answers every request,
 * so the tests never reach a real project. The app needs an account (ADR-57).
 */
export const E2E_SUPABASE_URL = 'http://localhost:4399';
export const E2E_API_URL = 'http://localhost:4398';
export const E2E_ANON_KEY = 'e2e-anon-key';
