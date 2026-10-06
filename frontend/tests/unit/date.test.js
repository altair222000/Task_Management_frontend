import { afterEach, expect, test, vi } from 'vitest';
import { generateDate, getMonthDate } from '../../src/utils/generateDate';
afterEach(() => vi.useRealTimers());
test('FE-DATE-01 formats a task due date using its month and day', () => {
  expect(getMonthDate('2026-10-10T12:00:00Z')).toBe('Oct 10');
});
test('FE-DATE-02 generates the dashboard date from a controlled clock', () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-06T12:00:00Z'));
  expect(generateDate()).toBe('06th Oct, 2026');
});
