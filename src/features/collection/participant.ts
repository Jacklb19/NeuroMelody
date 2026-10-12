/** Where this device keeps its participant code. */
export const PARTICIPANT_STORAGE_KEY = 'neuromelody.collection-participant';

/** A code is whatever `crypto.randomUUID` gives: checked on reading, because storage can be edited. */
const CODE_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * The random code that groups the guided recordings of this device, made the
 * first time it is needed. It is not derived from the account or from
 * anything about the person. Without storage every recording gets a new one.
 */
export function participantCode(
  storage: Pick<Storage, 'getItem' | 'setItem'> | null,
  create: () => string = () => crypto.randomUUID(),
): string {
  try {
    const stored = storage?.getItem(PARTICIPANT_STORAGE_KEY) ?? null;
    if (stored !== null && CODE_PATTERN.test(stored)) return stored;
    const code = create();
    storage?.setItem(PARTICIPANT_STORAGE_KEY, code);
    return code;
  } catch {
    return create();
  }
}

/** The browser's storage, or `null` where it is blocked. */
export function participantStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
