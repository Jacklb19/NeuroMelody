import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMediaQuery } from './useMediaQuery';

const QUERY = '(max-width: 600px)';

function Probe(): React.JSX.Element {
  return <p>{useMediaQuery(QUERY) ? 'narrow' : 'wide'}</p>;
}

/** A media query list whose answer the test changes, as resizing the window would. */
function fakeMediaQuery(initial: boolean): { readonly set: (matches: boolean) => void; readonly listeners: () => number } {
  let matches = initial;
  const listeners = new Set<() => void>();
  const list = {
    get matches() { return matches; },
    addEventListener: (_type: 'change', listener: () => void) => { listeners.add(listener); },
    removeEventListener: (_type: 'change', listener: () => void) => { listeners.delete(listener); },
  };
  vi.stubGlobal('matchMedia', vi.fn((query: string) => {
    expect(query).toBe(QUERY);
    return list;
  }));
  return {
    set: (next) => {
      matches = next;
      for (const listener of listeners) listener();
    },
    listeners: () => listeners.size,
  };
}

describe('useMediaQuery', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('follows the query while the window changes and stops listening when unmounted', () => {
    const media = fakeMediaQuery(false);
    const { unmount } = render(<Probe />);
    expect(screen.getByText('wide')).toBeInTheDocument();

    act(() => { media.set(true); });
    expect(screen.getByText('narrow')).toBeInTheDocument();

    unmount();
    expect(media.listeners()).toBe(0);
  });

  it('reports no match where the engine has no matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined);
    render(<Probe />);
    expect(screen.getByText('wide')).toBeInTheDocument();
  });
});
