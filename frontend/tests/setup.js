import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
beforeEach(() => {
  localStorage.clear();
  vi.stubEnv('VITE_BACKEND_URL', 'https://unit-test.invalid');
  // Any accidental network use fails instead of reaching Railway.
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('Unstubbed fetch in unit test'))));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  localStorage.clear();
});
