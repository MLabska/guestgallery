import { dayRange, formatLongDate, parseIsoDate, toIsoDate } from '../src/lib/dates';
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

describe('parseIsoDate', () => {
  it('parses a real date as local midnight', () => {
    const d = parseIsoDate('2026-12-12');
    expect(d && [d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 11, 12, 0]);
  });

  it('rejects malformed and impossible dates', () => {
    expect(parseIsoDate('')).toBeNull();
    expect(parseIsoDate('2026-1-5')).toBeNull();
    expect(parseIsoDate('2026-02-30')).toBeNull();
    expect(parseIsoDate('2026-13-01')).toBeNull();
  });

  it('round-trips with toIsoDate', () => {
    expect(toIsoDate(parseIsoDate('2026-03-08') as Date)).toBe('2026-03-08');
  });
});

describe('formatLongDate', () => {
  it('writes weekday, day, month name and year', () => {
    expect(formatLongDate('2026-12-12')).toBe('Saturday, 12 December 2026');
    expect(formatLongDate('2026-01-01')).toBe('Thursday, 1 January 2026');
  });

  it('returns an invalid value unchanged', () => {
    expect(formatLongDate('nope')).toBe('nope');
  });
});

describe('dayRange', () => {
  const parts = (iso: string) => {
    const d = new Date(iso);
    return [d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()];
  };

  it('runs from the local midnight of the day to the next local midnight', () => {
    const range = dayRange('2026-12-12');
    expect(range).not.toBeNull();
    expect(parts((range as { from: string }).from)).toEqual([2026, 11, 12, 0, 0]);
    expect(parts((range as { to: string }).to)).toEqual([2026, 11, 13, 0, 0]);
  });

  it('rolls over month and year ends', () => {
    expect(parts((dayRange('2026-12-31') as { to: string }).to)).toEqual([2027, 0, 1, 0, 0]);
  });

  it('is null for an invalid date', () => {
    expect(dayRange('2026-02-31')).toBeNull();
  });
});
