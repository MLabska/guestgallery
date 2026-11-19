import { toIsoDate } from '../src/lib/dates';
import { validateEventDate } from '../src/lib/validation';

describe('toIsoDate', () => {
  it('formats local dates as YYYY-MM-DD with zero padding', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toIsoDate(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('produces a value accepted by the event date validation', () => {
    expect(validateEventDate(toIsoDate(new Date())).valid).toBe(true);
  });
});
