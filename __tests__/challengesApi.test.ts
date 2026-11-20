import { addChallenges, deleteChallenge, listChallengeItems } from '../src/api/challenges';
import { supabase } from '../src/lib/supabase';

jest.mock('../src/lib/supabase', () => ({ supabase: { from: jest.fn() } }));

const client = supabase as unknown as { from: jest.Mock };

function queryMock(result: { data: unknown; error: unknown }) {
  const q: Record<string, jest.Mock> = {};
  for (const m of ['select', 'eq', 'order', 'not', 'insert', 'update', 'delete']) {
    q[m] = jest.fn(() => q);
  }
  (q as unknown as PromiseLike<unknown>).then = ((ok: (v: unknown) => unknown) =>
    Promise.resolve(result).then(ok)) as never;
  return q;
}

beforeEach(() => client.from.mockReset());

describe('listChallengeItems', () => {
  it('combines challenges, counts and my submissions', async () => {
    const challenges = queryMock({
      data: [
        { id: 'a', event_id: 'e', title: 'A', description: null, position: 0 },
        { id: 'b', event_id: 'e', title: 'B', description: null, position: 1 },
      ],
      error: null,
    });
    const all = queryMock({
      data: [{ challenge_id: 'a' }, { challenge_id: 'a' }, { challenge_id: 'b' }],
      error: null,
    });
    const mine = queryMock({ data: [{ challenge_id: 'b' }], error: null });
    client.from.mockReturnValueOnce(challenges).mockReturnValueOnce(all).mockReturnValueOnce(mine);

    const items = await listChallengeItems('e', 'me');
    expect(items.map((i) => [i.id, i.photoCount, i.submitted])).toEqual([
      ['a', 2, false],
      ['b', 1, true],
    ]);
    expect(mine.eq).toHaveBeenCalledWith('uploader_id', 'me');
  });

  it('throws a readable error when a query fails', async () => {
    client.from
      .mockReturnValueOnce(queryMock({ data: [], error: null }))
      .mockReturnValueOnce(queryMock({ data: null, error: { message: 'boom' } }))
      .mockReturnValueOnce(queryMock({ data: [], error: null }));
    await expect(listChallengeItems('e', 'me')).rejects.toThrow('Could not load challenges');
  });
});

describe('addChallenges', () => {
  it('inserts all drafts with consecutive positions', async () => {
    const q = queryMock({ data: null, error: null });
    client.from.mockReturnValue(q);
    await addChallenges(
      'e',
      [
        { title: 'A', description: null },
        { title: 'B', description: 'd' },
      ],
      3,
    );
    expect(q.insert).toHaveBeenCalledWith([
      { event_id: 'e', title: 'A', description: null, position: 3 },
      { event_id: 'e', title: 'B', description: 'd', position: 4 },
    ]);
  });

  it('does nothing for an empty list', async () => {
    await addChallenges('e', []);
    expect(client.from).not.toHaveBeenCalled();
  });

  it('throws when the insert is rejected', async () => {
    client.from.mockReturnValue(queryMock({ data: null, error: { message: 'rls' } }));
    await expect(addChallenges('e', [{ title: 'A', description: null }])).rejects.toThrow(
      'Could not save the challenges',
    );
  });
});

describe('deleteChallenge', () => {
  it('deletes by id', async () => {
    const q = queryMock({ data: null, error: null });
    client.from.mockReturnValue(q);
    await deleteChallenge('a');
    expect(q.delete).toHaveBeenCalled();
    expect(q.eq).toHaveBeenCalledWith('id', 'a');
  });
});
