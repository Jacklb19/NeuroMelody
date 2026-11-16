import { createContext, useContext } from 'react';
import { createBrowserMelodyStore, type MelodyStore } from './melodyStore';

/**
 * The saved melodies of this device (P-17). The default is the browser's
 * store; tests provide a memory store through this context.
 */
export const MelodyStoreContext = createContext<MelodyStore>(createBrowserMelodyStore());

export function useMelodyStore(): MelodyStore {
  return useContext(MelodyStoreContext);
}
