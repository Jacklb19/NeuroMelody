import { ROUTES } from '../../config/routes';

/**
 * Navigation state that `RequireWarnings` leaves when it sends the person to
 * the warnings, so that accepting them returns to the page they asked for.
 */
export interface WarningsReturnState {
  readonly from: string;
}

/** Where accepting leads when no page was requested: the session (RF-17). */
export const DEFAULT_RETURN_PATH: string = ROUTES.session;

export function warningsReturnState(path: string): WarningsReturnState {
  return { from: path };
}

/** Validates the untyped navigation state before navigating to it. */
export function returnPathFrom(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'from' in state && typeof state.from === 'string') {
    return state.from;
  }
  return DEFAULT_RETURN_PATH;
}
