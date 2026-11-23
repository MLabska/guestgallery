import { canLike, countLikes, hasLiked, likeCountLabel, toggleLike, topPhoto } from '../src/lib/likes';
import type { LikeRow } from '../src/lib/likes';

const like = (photo_id: string, user_id: string): LikeRow => ({ photo_id, user_id });

describe('countLikes and hasLiked', () => {
  const rows = [like('p1', 'a'), like('p1', 'b'), like('p2', 'a')];

  it('counts per photo', () => {
    expect(countLikes(rows)).toEqual({ p1: 2, p2: 1 });
    expect(countLikes([])).toEqual({});
  });

  it('tells whether a user liked a photo', () => {
    expect(hasLiked(rows, 'p1', 'b')).toBe(true);
    expect(hasLiked(rows, 'p2', 'b')).toBe(false);
  });
});

describe('toggleLike', () => {
  it('adds my like and removes it again (once per person)', () => {
    const added = toggleLike([], 'p1', 'me');
    expect(added).toEqual([like('p1', 'me')]);
    expect(toggleLike(added, 'p1', 'me')).toEqual([]);
  });

  it('leaves the likes of other people alone and does not mutate', () => {
    const rows = [like('p1', 'other')];
    const next = toggleLike(rows, 'p1', 'me');
    expect(countLikes(next)).toEqual({ p1: 2 });
    expect(rows).toHaveLength(1);
    expect(toggleLike(next, 'p1', 'me')).toEqual(rows);
  });
});

describe('canLike', () => {
  it('allows challenge photos of other people only', () => {
    expect(canLike({ challenge_id: 'c', uploader_id: 'x' }, 'me')).toBe(true);
    expect(canLike({ challenge_id: 'c', uploader_id: 'me' }, 'me')).toBe(false);
    expect(canLike({ challenge_id: null, uploader_id: 'x' }, 'me')).toBe(false);
    expect(canLike({ challenge_id: 'c', uploader_id: 'x' }, undefined)).toBe(false);
  });
});

describe('topPhoto', () => {
  const p = (id: string, created_at: string) => ({ id, created_at });
  const photos = [p('new', '2026-01-03'), p('mid', '2026-01-02'), p('old', '2026-01-01')];

  it('is the photo with the most likes', () => {
    expect(topPhoto(photos, { new: 3, mid: 1, old: 2 })?.id).toBe('new');
  });

  it('prefers the earlier upload on a tie', () => {
    expect(topPhoto(photos, { new: 2, mid: 2, old: 2 })?.id).toBe('old');
    expect(topPhoto(photos, { new: 2, mid: 2, old: 1 })?.id).toBe('mid');
  });

  it('is null without likes or photos', () => {
    expect(topPhoto(photos, {})).toBeNull();
    expect(topPhoto([], { x: 5 })).toBeNull();
  });

  it('ignores likes of photos that are not in the list', () => {
    expect(topPhoto(photos, { gone: 9, mid: 1 })?.id).toBe('mid');
  });
});

describe('likeCountLabel', () => {
  it('uses the singular for one', () => {
    expect(likeCountLabel(1)).toBe('1 like');
    expect(likeCountLabel(0)).toBe('0 likes');
    expect(likeCountLabel(4)).toBe('4 likes');
  });
});
