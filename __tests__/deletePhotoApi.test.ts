import { deletePhoto } from '../src/api/photos';
import { supabase } from '../src/lib/supabase';

jest.mock('../src/lib/supabase', () => ({
  supabase: { storage: { from: jest.fn() }, from: jest.fn() },
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'x' }));
jest.mock('expo-image-manipulator', () => ({ SaveFormat: { JPEG: 'jpeg' }, manipulateAsync: jest.fn() }));

const client = supabase as unknown as { storage: { from: jest.Mock }; from: jest.Mock };
const photo = { id: 'p1', path: 'e1/p1.jpg', thumb_path: 'e1/p1_thumb.jpg' };

function setup(result: { data: unknown; error: unknown }, removeFails = false) {
  const select = jest.fn(async () => result);
  const eq = jest.fn(() => ({ select }));
  const del = jest.fn(() => ({ eq }));
  const remove = jest.fn(async () => {
    if (removeFails) throw new Error('offline');
    return { error: null };
  });
  client.from.mockReturnValue({ delete: del });
  client.storage.from.mockReturnValue({ remove });
  return { eq, remove };
}

beforeEach(() => {
  client.from.mockReset();
  client.storage.from.mockReset();
});

describe('deletePhoto', () => {
  it('deletes the row, then both files', async () => {
    const { eq, remove } = setup({ data: [{ id: 'p1' }], error: null });
    await deletePhoto(photo);
    expect(client.from).toHaveBeenCalledWith('photos');
    expect(eq).toHaveBeenCalledWith('id', 'p1');
    expect(remove).toHaveBeenCalledWith(['e1/p1.jpg', 'e1/p1_thumb.jpg']);
  });

  it('fails and keeps the files when RLS denies the delete (0 rows)', async () => {
    const { remove } = setup({ data: [], error: null });
    await expect(deletePhoto(photo)).rejects.toThrow('not allowed');
    expect(remove).not.toHaveBeenCalled();
  });

  it('fails on a database error', async () => {
    const { remove } = setup({ data: null, error: { message: 'boom' } });
    await expect(deletePhoto(photo)).rejects.toThrow('Could not delete the photo');
    expect(remove).not.toHaveBeenCalled();
  });

  it('still succeeds when removing the files fails', async () => {
    setup({ data: [{ id: 'p1' }], error: null }, true);
    await expect(deletePhoto(photo)).resolves.toBeUndefined();
  });
});
