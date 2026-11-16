import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom has no canvas and logs "Not implemented" every time a screen asks for one.
// Answer what jsdom answers (no context) without the noise; tests that draw pass their own context.
// Files that run in Node instead of jsdom have no canvas at all.
if (typeof HTMLCanvasElement !== 'undefined') {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    writable: true,
    value: (): null => null,
  });
}

// Automatic DOM cleanup after each test
afterEach(() => {
  cleanup();
});
