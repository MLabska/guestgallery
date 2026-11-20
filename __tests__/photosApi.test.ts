import { uploadPhoto } from '../src/api/photos';
import { supabase } from '../src/lib/supabase';

jest.mock('../src/lib/supabase', () => ({
  supabase: { storage: { from: jest.fn() }, from: jest.fn() },
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'AAAA-1111' }));
jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  // Emulates the real manipulator: a single given edge keeps the 4000x3000 aspect ratio.
  manipulateAsync: jest.fn(async (_uri: string, actions: { resize?: { width: number } }[]) => {
    const width = actions[0]?.resize?.width ?? 4000;
    return { uri: `file://out-${width}.jpg`, width, height: Math.round((width * 3) / 4) };
  }),
}));
jest.mock('react-native', () => ({
  Image: { getSize: (_u: string, ok: (w: number, h: number) => void) => ok(4000, 3000) },
}));

const client = supabase as unknown as { storage: { from: jest.Mock }; from: jest.Mock };

function setup(insertError: { message: string } | null, uploadErrorAt?: number) {
  let n = 0;
  const upload = jest.fn(async () => {
    n += 1;
    return { error: n === uploadErrorAt ? { message: 'Network request failed' } : null };
  });
  const remove = jest.fn(async () => ({ error: null }));
  const insert = jest.fn(async () => ({ error: insertError }));
  client.storage.from.mockReturnValue({ upload, remove });
  client.from.mockReturnValue({ insert });
  return { upload, remove, insert };
}

beforeEach(() => {
  client.storage.from.mockReset();
  client.from.mockReset();
  global.fetch = jest.fn(async () => ({ arrayBuffer: async () => new ArrayBuffer(8) })) as never;
});

describe('uploadPhoto', () => {
  it('uploads full and thumbnail, then inserts the row', async () => {
    const { upload, insert } = setup(null);
    const id = await uploadPhoto({ eventId: 'e1', userId: 'u1', uri: 'file://x.jpg', challengeId: null });
    expect(id).toBe('aaaa-1111');
    expect(upload.mock.calls.map((c) => (c as unknown[])[0])).toEqual([
      'e1/aaaa-1111.jpg',
      'e1/aaaa-1111_thumb.jpg',
    ]);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'aaaa-1111',
        event_id: 'e1',
        uploader_id: 'u1',
        challenge_id: null,
        width: 1600,
        height: 1200,
      }),
    );
  });

  it('removes the uploaded files when the insert fails', async () => {
    const { remove } = setup({ message: 'new row violates row-level security policy' });
    await expect(
      uploadPhoto({ eventId: 'e1', userId: 'u1', uri: 'file://x.jpg' }),
    ).rejects.toThrow('Uploads for this event are closed');
    expect(remove).toHaveBeenCalledWith(['e1/aaaa-1111.jpg', 'e1/aaaa-1111_thumb.jpg']);
  });

  it('cleans up the full image when the thumbnail upload fails', async () => {
    const { remove, insert } = setup(null, 2);
    await expect(
      uploadPhoto({ eventId: 'e1', userId: 'u1', uri: 'file://x.jpg' }),
    ).rejects.toThrow();
    expect(insert).not.toHaveBeenCalled();
    expect(remove).toHaveBeenCalledWith(['e1/aaaa-1111.jpg']);
  });

  describe('tagged with a challenge that was deleted', () => {
    function setupGone(challengeRow: { id: string } | null) {
      const { remove } = setup(null);
      const insert = jest.fn(async () => ({
        error: { message: 'new row violates row-level security policy' },
      }));
      const maybeSingle = jest.fn(async () => ({ data: challengeRow, error: null }));
      const eq = jest.fn(() => ({ maybeSingle }));
      const select = jest.fn(() => ({ eq }));
      client.from.mockImplementation((table: string) =>
        table === 'photos' ? { insert } : { select },
      );
      return { remove, eq };
    }

    it('reports that the challenge no longer exists', async () => {
      const { remove, eq } = setupGone(null);
      await expect(
        uploadPhoto({ eventId: 'e1', userId: 'u1', uri: 'file://x.jpg', challengeId: 'c1' }),
      ).rejects.toThrow('This challenge no longer exists');
      expect(eq).toHaveBeenCalledWith('id', 'c1');
      expect(remove).toHaveBeenCalled();
    });

    it('keeps the closed-uploads message when the challenge still exists', async () => {
      setupGone({ id: 'c1' });
      await expect(
        uploadPhoto({ eventId: 'e1', userId: 'u1', uri: 'file://x.jpg', challengeId: 'c1' }),
      ).rejects.toThrow('Uploads for this event are closed');
    });
  });
});
