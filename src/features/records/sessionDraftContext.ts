import { createContext, useContext } from 'react';
import { createBrowserDraftStore, type SessionDraftStore } from './sessionDraftStore';

/** The drafts of open sessions (ADR-62); the default is the browser's store, tests provide a memory one. */
export const SessionDraftContext = createContext<SessionDraftStore>(createBrowserDraftStore());

export function useSessionDrafts(): SessionDraftStore {
  return useContext(SessionDraftContext);
}
