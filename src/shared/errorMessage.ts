/**
 * Text for an error that carries no code of its own: the error's message
 * when there is one, the dictionary's generic text otherwise. Errors with a
 * code are translated by their feature before reaching this fallback.
 */
export function errorMessage(error: unknown, unknownError: string): string {
  return error instanceof Error ? error.message : unknownError;
}
