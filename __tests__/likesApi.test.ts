import { likePhoto, listLikes, unlikePhoto } from '../src/api/likes';
import { supabase } from '../src/lib/supabase';

jest.mock('../src/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

const client = supabase as unknown as { from: jest.Mock };

beforeEach(() => client.from.mockReset());

describe('listLikes', () => {
  it('reads photo_id and user_id of the event', async () => {
    const eq = jest.fn().mockResolvedValue({ data: [{ photo_id: 'p1', user_id: 'u1' }], error: null });
    const select = jest.fn(() => ({ eq }));
    client.from.mockReturnValue({ select });
    await expect(listLikes('e1')).resolves.toEqual([{ photo_id: 'p1', user_id: 'u1' }]);
    expect(client.from).toHaveBeenCalledWith('photo_likes');
    expect(select).toHaveBeenCalledWith('photo_id, user_id');
    expect(eq).toHaveBeenCalledWith('event_id', 'e1');
  });

  it('throws a readable error on failure', async () => {
    const eq = jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } });
    client.from.mockReturnValue({ select: () => ({ eq }) });
    await expect(listLikes('e1')).rejects.toThrow('Could not load likes');
  });
});

describe('likePhoto', () => {
  it('upserts with ignoreDuplicates so a repeated like is no error', async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });
    client.from.mockReturnValue({ upsert });
    await likePhoto('p1', 'e1', 'u1');
    expect(upsert).toHaveBeenCalledWith(
      { photo_id: 'p1', event_id: 'e1', user_id: 'u1' },
      { onConflict: 'photo_id,user_id', ignoreDuplicates: true },
    );
  });

  it('throws when the server rejects the like', async () => {
    client.from.mockReturnValue({ upsert: jest.fn().mockResolvedValue({ error: { message: 'rls' } }) });
    await expect(likePhoto('p1', 'e1', 'u1')).rejects.toThrow('Could not save your like');
  });
});

describe('unlikePhoto', () => {
  it('deletes my own row of the photo', async () => {
    const eqUser = jest.fn().mockResolvedValue({ error: null });
    const eqPhoto = jest.fn(() => ({ eq: eqUser }));
    const del = jest.fn(() => ({ eq: eqPhoto }));
    client.from.mockReturnValue({ delete: del });
    await unlikePhoto('p1', 'u1');
    expect(eqPhoto).toHaveBeenCalledWith('photo_id', 'p1');
    expect(eqUser).toHaveBeenCalledWith('user_id', 'u1');
  });

  it('throws on failure', async () => {
    const eqUser = jest.fn().mockResolvedValue({ error: { message: 'x' } });
    client.from.mockReturnValue({ delete: () => ({ eq: () => ({ eq: eqUser }) }) });
    await expect(unlikePhoto('p1', 'u1')).rejects.toThrow('Could not remove your like');
  });
});
