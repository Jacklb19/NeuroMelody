import { render, type RenderResult } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { MemorySessionStore, type SessionStore } from '../features/records/sessionStore';
import { SessionStoreContext } from '../features/records/sessionStoreContext';

/** Renders one route with an in-memory session history. */
export function renderWithStore(
  path: string,
  pattern: string,
  element: React.ReactNode,
  store: SessionStore = new MemorySessionStore(),
): RenderResult & { store: SessionStore } {
  const result = render(
    <SessionStoreContext value={store}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={pattern} element={element} />
          <Route path="*" element={<p>Otra página</p>} />
        </Routes>
      </MemoryRouter>
    </SessionStoreContext>,
  );
  return { ...result, store };
}
