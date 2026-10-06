import { test, expect } from 'vitest';
// Instrumentation probe only: zero original application tests, no source imports.
test('baseline instrumentation does not execute application code', () => {
  expect(true).toBe(true);
});
