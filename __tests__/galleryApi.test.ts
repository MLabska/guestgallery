import { fetchPhotoPage, signedUrls } from '../src/api/photos';
import { supabase } from '../src/lib/supabase';

jest.mock('../src/lib/supabase', () => ({
  supabase: { storage: { from: jest.fn() }, from: jest.fn() },
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'x' }));
jest.mock('expo-image-manipulator', () => ({ SaveFormat: { JPEG: 'jpeg' }, manipulateAsync: jest.fn() }));

const client = supabase as unknown as { storage: { from: jest.Mock }; from: jest.Mock };

function queryMock(result: { data: unknown; error: unknown }) {
  const q: Record<string, jest.Mock> = {};
  for (const m of ['select', 'eq', 'order', 'limit', 'lt']) q[m] = jest.fn(() => q);
  (q as unknown as PromiseLike<unknown>).then = ((ok: (v: unknown) => unknown) =>
    Promise.resolve(result).then(ok)) as never;
  return q;
}

beforeEach(() => {
  client.from.mockReset();
  client.storage.from.mockReset();
});

describe('fetchPhotoPage', () => {
  it('queries the view newest first, limited to a page, with the cursor', async () => {
    const q = queryMock({ data: [{ id: 'p1' }], error: null });
    client.from.mockReturnValue(q);
    const rows = await fetchPhotoPage('e1', '2026-01-01T00:00:00Z');
    expect(client.from).toHaveBeenCalledWith('photos_with_author');
    expect(q.eq).toHaveBeenCalledWith('event_id', 'e1');
    expect(q.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(q.limit).toHaveBeenCalledWith(30);
    expect(q.lt).toHaveBeenCalledWith('created_at', '2026-01-01T00:00:00Z');
    expect(rows).toEqual([{ id: 'p1' }]);
  });

  it('does not filter by cursor for the first page', async () => {
    const q = queryMock({ data: [], error: null });
    client.from.mockReturnValue(q);
    await fetchPhotoPage('e1', null);
    expect(q.lt).not.toHaveBeenCalled();
  });

  it('throws a readable error on failure', async () => {
    client.from.mockReturnValue(queryMock({ data: null, error: { message: 'boom' } }));
    await expect(fetchPhotoPage('e1', null)).rejects.toThrow('Could not load photos');
  });
});

describe('signedUrls', () => {
  it('signs all paths in one request and maps them by path', async () => {
    const createSignedUrls = jest.fn(async () => ({
      data: [
        { path: 'a', signedUrl: 'https://s/a', error: null },
        { path: 'b', signedUrl: null, error: 'Object not found' },
      ],
      error: null,
    }));
    client.storage.from.mockReturnValue({ createSignedUrls });
    expect(await signedUrls(['a', 'b'])).toEqual({ a: 'https://s/a' });
    expect(createSignedUrls).toHaveBeenCalledWith(['a', 'b'], 3600);
  });

  it('makes no request for an empty list', async () => {
    expect(await signedUrls([])).toEqual({});
    expect(client.storage.from).not.toHaveBeenCalled();
  });
});
