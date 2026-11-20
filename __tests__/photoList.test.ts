import {
  PAGE_SIZE,
  appendPage,
  applyDelete,
  applyInsert,
  formatPhotoTime,
  indexAfterRemoval,
  nextCursor,
  replaceFirstPage,
} from '../src/lib/photoList';
import type { GalleryPhoto } from '../src/lib/photoList';

function photo(id: string, createdAt: string): GalleryPhoto {
  return {
    id,
    event_id: 'e1',
    uploader_id: 'u1',
    challenge_id: null,
    path: `e1/${id}.jpg`,
    thumb_path: `e1/${id}_thumb.jpg`,
    width: 100,
    height: 100,
    created_at: createdAt,
    author_nickname: 'Anna',
  };
}
const ids = (l: GalleryPhoto[]) => l.map((p) => p.id);

const a = photo('a', '2026-01-01T10:00:03Z');
const b = photo('b', '2026-01-01T10:00:02Z');
const c = photo('c', '2026-01-01T10:00:01Z');

describe('applyInsert', () => {
  it('puts a new photo first', () => {
    expect(ids(applyInsert([b, c], a))).toEqual(['a', 'b', 'c']);
  });
  it('keeps newest-first order for a late-arriving older photo', () => {
    expect(ids(applyInsert([a, c], b))).toEqual(['a', 'b', 'c']);
  });
  it('ignores a duplicate id', () => {
    const list = [a, b];
    expect(applyInsert(list, a)).toBe(list);
  });
});

describe('applyDelete', () => {
  it('removes the photo with that id', () => {
    expect(ids(applyDelete([a, b, c], 'b'))).toEqual(['a', 'c']);
  });
  it('ignores unknown ids (deletes from other events)', () => {
    const list = [a, b];
    expect(applyDelete(list, 'zzz')).toBe(list);
  });
});

describe('appendPage', () => {
  it('appends older photos and skips ones already present', () => {
    expect(ids(appendPage([a, b], [b, c]))).toEqual(['a', 'b', 'c']);
  });
});

describe('replaceFirstPage', () => {
  it('returns an empty list when the event has no photos any more', () => {
    expect(replaceFirstPage([a, b], [])).toEqual([]);
  });
  it('drops photos deleted meanwhile when everything fits in one page', () => {
    expect(ids(replaceFirstPage([a, b, c], [a, c]))).toEqual(['a', 'c']);
  });
  const fullPage = () =>
    Array.from({ length: PAGE_SIZE }, (_, i) =>
      photo(`n${String(i).padStart(2, '0')}`, `2026-02-01T10:00:${String(59 - i).padStart(2, '0')}Z`),
    );
  it('keeps already loaded older photos when a full first page overlaps the list', () => {
    const first = fullPage();
    const older = photo('old', '2026-01-01T00:00:00Z');
    const merged = replaceFirstPage([first[PAGE_SIZE - 1], older], first);
    expect(merged).toHaveLength(PAGE_SIZE + 1);
    expect(merged[merged.length - 1].id).toBe('old');
  });
  it('replaces the list when a full first page does not overlap it (no gap)', () => {
    const first = fullPage();
    const older = photo('old', '2026-01-01T00:00:00Z');
    const merged = replaceFirstPage([older], first);
    expect(ids(merged)).toEqual(ids(first));
  });
  it('adds photos uploaded while the app was in the background', () => {
    expect(ids(replaceFirstPage([b, c], [a, b, c]))).toEqual(['a', 'b', 'c']);
  });
});

describe('nextCursor', () => {
  it('is the created_at of the last photo', () => {
    expect(nextCursor([a, b, c])).toBe(c.created_at);
    expect(nextCursor([])).toBeNull();
  });
});

describe('indexAfterRemoval', () => {
  it('clamps to the new last index', () => {
    expect(indexAfterRemoval(3, 5)).toBe(2);
    expect(indexAfterRemoval(3, 1)).toBe(1);
    expect(indexAfterRemoval(0, 0)).toBe(-1);
  });
});

describe('formatPhotoTime', () => {
  it('formats day, month, year and time', () => {
    expect(formatPhotoTime(new Date(2026, 10, 5, 9, 7).toISOString())).toBe('5 Nov 2026, 09:07');
  });
});
