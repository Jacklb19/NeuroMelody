import { render, type RenderResult } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { AuthContext, type AuthContextValue } from '../features/account/authContext';
import { MemorySessionStore, type SessionStore } from '../features/records/sessionStore';
import { SessionStoreContext } from '../features/records/sessionStoreContext';

const SIGNED_OUT: AuthContextValue = {
  state: { kind: 'signed_out' },
  service: null,
  refresh: () => Promise.resolve(),
  finishRecovery: () => Promise.resolve(),
};

/** Renders one route with an in-memory session history, signed out. */
export function renderWithStore(
  path: string,
  pattern: string,
  element: React.ReactNode,
  store: SessionStore = new MemorySessionStore(),
): RenderResult & { store: SessionStore } {
  const result = render(
    <AuthContext value={SIGNED_OUT}>
      <SessionStoreContext value={store}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={pattern} element={element} />
            {/* Any other path lands here, so a wrong link cannot render the screen under test. */}
            <Route path="*" element={<p>Other page</p>} />
          </Routes>
        </MemoryRouter>
      </SessionStoreContext>
    </AuthContext>,
  );
  return { ...result, store };
}
