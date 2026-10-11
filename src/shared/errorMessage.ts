/**
 * Text for an error that carries no code of its own: the error's message
 * when there is one, the dictionary's generic text otherwise. Technical
 * wording, so it is only for /diagnostics; the rest of the interface keeps
 * to the dictionary (P-02).
 */
export function errorMessage(error: unknown, unknownError: string): string {
  return error instanceof Error ? error.message : unknownError;
}
