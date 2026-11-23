import type { GalleryPhoto } from './photoList';

/** A photo_likes row as the app reads it (DESIGN.md §5, 5.4). */
export type LikeRow = { photo_id: string; user_id: string };

/** Number of likes per photo id. */
export function countLikes(rows: LikeRow[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.photo_id] = (counts[row.photo_id] ?? 0) + 1;
  return counts;
}

export function hasLiked(rows: LikeRow[], photoId: string, userId: string): boolean {
  return rows.some((r) => r.photo_id === photoId && r.user_id === userId);
}

/**
 * Optimistic toggle: removes my like of the photo when there is one, else adds it. Never creates
 * a second row for the same (photo, user).
 */
export function toggleLike(rows: LikeRow[], photoId: string, userId: string): LikeRow[] {
  if (hasLiked(rows, photoId, userId)) {
    return rows.filter((r) => !(r.photo_id === photoId && r.user_id === userId));
  }
  return [...rows, { photo_id: photoId, user_id: userId }];
}

/** Only challenge photos of other people can be liked (mirrors the RLS helper photo_likeable). */
export function canLike(
  photo: Pick<GalleryPhoto, 'challenge_id' | 'uploader_id'>,
  userId: string | undefined,
): boolean {
  return !!userId && photo.challenge_id !== null && photo.uploader_id !== userId;
}

/**
 * The Top photo of a challenge: most likes among the given photos; on a tie the earlier upload
 * wins (then the smaller id, so the result is stable). Null when nobody has any likes.
 */
export function topPhoto<T extends Pick<GalleryPhoto, 'id' | 'created_at'>>(
  photos: T[],
  counts: Record<string, number>,
): T | null {
  let best: T | null = null;
  for (const p of photos) {
    const c = counts[p.id] ?? 0;
    if (c === 0) continue;
    if (best === null) {
      best = p;
      continue;
    }
    const bc = counts[best.id] ?? 0;
    if (
      c > bc ||
      (c === bc && (p.created_at < best.created_at || (p.created_at === best.created_at && p.id < best.id)))
    ) {
      best = p;
    }
  }
  return best;
}

/** "1 like", "3 likes", "0 likes". */
export function likeCountLabel(count: number): string {
  return count === 1 ? '1 like' : `${count} likes`;
}
