import { isHostOf, toMyEventItems, type MyEventRow } from '../src/lib/myEvents';

function row(id: string, hostId: string, joinedAt: string): MyEventRow {
  return {
    joined_at: joinedAt,
    nickname: 'nick',
    events: {
      id,
      code: 'ABCDEF',
      name: `Event ${id}`,
      event_date: '2026-12-31',
      host_id: hostId,
      uploads_close_at: '2027-01-08T00:00:00Z',
    },
  };
}

describe('toMyEventItems', () => {
  it('sorts newest joined first', () => {
    const items = toMyEventItems(
      [
        row('old', 'me', '2026-01-01T10:00:00Z'),
        row('new', 'me', '2026-03-01T10:00:00Z'),
        row('mid', 'me', '2026-02-01T10:00:00Z'),
      ],
      'me',
    );
    expect(items.map((i) => i.id)).toEqual(['new', 'mid', 'old']);
  });

  it('labels Host and Guest', () => {
    const items = toMyEventItems(
      [row('a', 'me', '2026-01-02T00:00:00Z'), row('b', 'someone', '2026-01-01T00:00:00Z')],
      'me',
    );
    expect(items.map((i) => i.role)).toEqual(['Host', 'Guest']);
  });

  it('drops rows whose event is not readable', () => {
    const items = toMyEventItems(
      [{ joined_at: '2026-01-01T00:00:00Z', nickname: 'n', events: null }],
      'me',
    );
    expect(items).toEqual([]);
  });
});

describe('isHostOf', () => {
  it('is true only for the creator', () => {
    expect(isHostOf({ host_id: 'me' }, 'me')).toBe(true);
    expect(isHostOf({ host_id: 'me' }, 'other')).toBe(false);
    expect(isHostOf({ host_id: 'me' }, undefined)).toBe(false);
  });
});
