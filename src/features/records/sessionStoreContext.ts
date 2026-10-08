import { createContext, useContext } from 'react';
import { createBrowserSessionStore, type SessionStore } from './sessionStore';

/**
 * The session history available to every screen. The default is the
 * browser's store; tests provide a memory store through this context.
 */
export const SessionStoreContext = createContext<SessionStore>(createBrowserSessionStore());

export function useSessionStore(): SessionStore {
  return useContext(SessionStoreContext);
}
