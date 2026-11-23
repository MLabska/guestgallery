import { act, renderHook, waitFor } from '@testing-library/react-native';

import { likePhoto, listLikes, unlikePhoto } from '../src/api/likes';
import { useLikes } from '../src/hooks/useLikes';
import type { GalleryPhoto } from '../src/lib/photoList';

jest.mock('../src/lib/supabase', () => ({ supabase: {} }));
jest.mock('../src/api/likes', () => ({
  listLikes: jest.fn(),
  likePhoto: jest.fn(),
  unlikePhoto: jest.fn(),
}));

const mockList = listLikes as jest.Mock;
const mockLike = likePhoto as jest.Mock;
const mockUnlike = unlikePhoto as jest.Mock;

const photo = (id: string, uploader_id: string, challenge_id: string | null = 'c1'): GalleryPhoto => ({
  id,
  event_id: 'e1',
  uploader_id,
  challenge_id,
  path: `e1/${id}.jpg`,
  thumb_path: `e1/${id}_thumb.jpg`,
  width: 1,
  height: 1,
  created_at: '2026-01-01T00:00:00Z',
  author_nickname: 'x',
});

beforeEach(() => {
  mockList.mockReset().mockResolvedValue([{ photo_id: 'p1', user_id: 'other' }]);
  mockLike.mockReset().mockResolvedValue(undefined);
  mockUnlike.mockReset().mockResolvedValue(undefined);
});

async function setup() {
  const hook = await renderHook(() => useLikes('e1', 'me', true));
  await waitFor(() => expect(hook.result.current.counts).toEqual({ p1: 1 }));
  return hook;
}

describe('useLikes', () => {
  it('loads the counts of the event', async () => {
    const { result } = await setup();
    expect(result.current.isLiked('p1')).toBe(false);
  });

  it('shows a like immediately and sends it to the server', async () => {
    const { result } = await setup();
    await act(async () => {
      await result.current.toggle(photo('p1', 'someone'));
    });
    expect(mockLike).toHaveBeenCalledWith('p1', 'e1', 'me');
    expect(result.current.counts).toEqual({ p1: 2 });
    expect(result.current.isLiked('p1')).toBe(true);
  });

  it('removes my like on the second tap', async () => {
    const { result } = await setup();
    await act(async () => {
      await result.current.toggle(photo('p1', 'someone'));
    });
    await act(async () => {
      await result.current.toggle(photo('p1', 'someone'));
    });
    expect(mockUnlike).toHaveBeenCalledWith('p1', 'me');
    expect(result.current.counts).toEqual({ p1: 1 });
    expect(result.current.isLiked('p1')).toBe(false);
  });

  it('rolls the like back and reports an error when the server rejects it', async () => {
    mockLike.mockRejectedValue(new Error('Could not save your like'));
    const { result } = await setup();
    await act(async () => {
      await result.current.toggle(photo('p1', 'someone'));
    });
    expect(result.current.counts).toEqual({ p1: 1 });
    expect(result.current.isLiked('p1')).toBe(false);
    expect(result.current.error).toBe('Could not save your like');
  });

  it('ignores own photos and photos without a challenge', async () => {
    const { result } = await setup();
    await act(async () => {
      await result.current.toggle(photo('p1', 'me'));
      await result.current.toggle(photo('p2', 'someone', null));
    });
    expect(mockLike).not.toHaveBeenCalled();
    expect(result.current.counts).toEqual({ p1: 1 });
  });
});
