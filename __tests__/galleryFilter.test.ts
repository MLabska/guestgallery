import { NO_FILTER, filterLabel, isFilterActive, matchesFilter, sameFilter } from '../src/lib/galleryFilter';

const at = (y: number, m: number, d: number, h: number, min = 0) =>
  new Date(y, m - 1, d, h, min).toISOString();
const photo = (uploader_id: string, created_at: string) => ({ uploader_id, created_at });

describe('isFilterActive and sameFilter', () => {
  it('is inactive without person and day', () => {
    expect(isFilterActive(NO_FILTER)).toBe(false);
    expect(isFilterActive({ uploaderId: 'a', day: null })).toBe(true);
    expect(isFilterActive({ uploaderId: null, day: '2026-12-12' })).toBe(true);
  });

  it('compares both fields', () => {
    expect(sameFilter(NO_FILTER, { uploaderId: null, day: null })).toBe(true);
    expect(sameFilter(NO_FILTER, { uploaderId: 'a', day: null })).toBe(false);
  });
});

describe('matchesFilter', () => {
  it('matches everything without a filter', () => {
    expect(matchesFilter(photo('a', at(2026, 12, 12, 10)), NO_FILTER)).toBe(true);
  });

  it('filters by person', () => {
    const f = { uploaderId: 'a', day: null };
    expect(matchesFilter(photo('a', at(2026, 12, 12, 10)), f)).toBe(true);
    expect(matchesFilter(photo('b', at(2026, 12, 12, 10)), f)).toBe(false);
  });

  it('filters by local day, including its start and excluding the next midnight', () => {
    const f = { uploaderId: null, day: '2026-12-12' };
    expect(matchesFilter(photo('a', at(2026, 12, 12, 0, 0)), f)).toBe(true);
    expect(matchesFilter(photo('a', at(2026, 12, 12, 23, 59)), f)).toBe(true);
    expect(matchesFilter(photo('a', at(2026, 12, 13, 0, 0)), f)).toBe(false);
    expect(matchesFilter(photo('a', at(2026, 12, 11, 23, 59)), f)).toBe(false);
  });

  it('requires both when combined', () => {
    const f = { uploaderId: 'a', day: '2026-12-12' };
    expect(matchesFilter(photo('a', at(2026, 12, 12, 10)), f)).toBe(true);
    expect(matchesFilter(photo('b', at(2026, 12, 12, 10)), f)).toBe(false);
    expect(matchesFilter(photo('a', at(2026, 12, 13, 10)), f)).toBe(false);
  });

  it('matches nothing for an invalid day', () => {
    expect(matchesFilter(photo('a', at(2026, 12, 12, 10)), { uploaderId: null, day: 'x' })).toBe(false);
  });
});

describe('filterLabel', () => {
  const nick = (id: string) => (id === 'a' ? 'Anna' : null);

  it('is empty without a filter', () => {
    expect(filterLabel(NO_FILTER, nick)).toBe('');
  });

  it('shows person, day or both', () => {
    expect(filterLabel({ uploaderId: 'a', day: null }, nick)).toBe('Anna');
    expect(filterLabel({ uploaderId: null, day: '2026-12-12' }, nick)).toBe('Saturday, 12 December 2026');
    expect(filterLabel({ uploaderId: 'a', day: '2026-12-12' }, nick)).toBe('Anna · Saturday, 12 December 2026');
  });

  it('falls back for an unknown person', () => {
    expect(filterLabel({ uploaderId: 'zzz', day: null }, nick)).toBe('Unknown guest');
  });
});
