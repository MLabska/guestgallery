import {
  formatJoinedAt,
  guestCount,
  guestCountLabel,
  roleLabel,
  sortParticipants,
} from '../src/lib/participants';
import type { Participant } from '../src/lib/participants';

const p = (user_id: string, nickname: string, joined_at: string): Participant => ({
  user_id,
  nickname,
  joined_at,
});
const host = p('h', 'Host', '2026-01-01T12:00:00Z');
const anna = p('a', 'Anna', '2026-01-01T10:00:00Z'); // earlier than the host row on purpose
const tom = p('t', 'Tom', '2026-01-01T13:00:00Z');

describe('sortParticipants', () => {
  it('puts the host first, then guests by join time', () => {
    expect(sortParticipants([tom, anna, host], 'h').map((x) => x.nickname)).toEqual(['Host', 'Anna', 'Tom']);
  });

  it('breaks equal join times by nickname and does not mutate the input', () => {
    const input = [p('z', 'Zoe', 'x'), p('b', 'Bob', 'x')];
    expect(sortParticipants(input, 'h').map((x) => x.nickname)).toEqual(['Bob', 'Zoe']);
    expect(input[0].nickname).toBe('Zoe');
  });
});

describe('guestCount and labels', () => {
  it('counts everybody except the host', () => {
    expect(guestCount([host, anna, tom], 'h')).toBe(2);
    expect(guestCount([host], 'h')).toBe(0);
  });

  it('words the count', () => {
    expect(guestCountLabel(0)).toBe('No guests yet');
    expect(guestCountLabel(1)).toBe('1 guest');
    expect(guestCountLabel(5)).toBe('5 guests');
  });

  it('marks only the host', () => {
    expect(roleLabel(host, 'h')).toBe('Host');
    expect(roleLabel(anna, 'h')).toBeNull();
  });

  it('formats the join time', () => {
    expect(formatJoinedAt(new Date(2026, 11, 12, 9, 5).toISOString())).toBe('12 Dec 2026, 09:05');
  });
});
