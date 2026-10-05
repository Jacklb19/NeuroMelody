import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Automatic DOM cleanup after each test
afterEach(() => {
  cleanup();
});
