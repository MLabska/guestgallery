import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { likePhoto, listLikes, unlikePhoto } from '../api/likes';
import { canLike, countLikes, hasLiked, toggleLike } from '../lib/likes';
import type { LikeRow } from '../lib/likes';
import type { GalleryPhoto } from '../lib/photoList';

export const LIKES_REFRESH_MS = 15000;

export type EventLikes = {
  /** Likes per photo id. */
  counts: Record<string, number>;
  /** True when I liked the photo. */
  isLiked: (photoId: string) => boolean;
  /** Like / unlike right away; rolled back when the server rejects it. */
  toggle: (photo: GalleryPhoto) => Promise<void>;
  /** Reloads the likes (open, pull-to-refresh). */
  reload: () => Promise<void>;
  /** Set when a like could not be saved or the likes could not be loaded. */
  error: string | null;
};

/**
 * Likes of an event's photos (DESIGN.md §5, 5.4). No realtime: loaded on mount, on `reload()` and
 * every 15 seconds while `active` is true (the challenge screen is focused).
 */
export function useLikes(eventId: string, userId: string | undefined, active = true): EventLikes {
  const [rows, setRows] = useState<LikeRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const rowsRef = useRef<LikeRow[]>([]);
  /** Photo ids with a toggle in flight: a reload must not overwrite their optimistic state. */
  const pendingRef = useRef(new Set<string>());

  const apply = useCallback((next: LikeRow[]) => {
    rowsRef.current = next;
    setRows(next);
  }, []);

  const reload = useCallback(async () => {
    try {
      const fresh = await listLikes(eventId);
      if (pendingRef.current.size > 0) {
        // Keep my optimistic rows for photos that are being toggled right now.
        const kept = rowsRef.current.filter(
          (r) => pendingRef.current.has(r.photo_id) && r.user_id === userId,
        );
        const merged = fresh.filter(
          (r) => !(pendingRef.current.has(r.photo_id) && r.user_id === userId),
        );
        apply([...merged, ...kept]);
      } else {
        apply(fresh);
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load likes');
    }
  }, [eventId, userId, apply]);

  useEffect(() => {
    if (!active) return;
    void reload();
    const timer = setInterval(() => void reload(), LIKES_REFRESH_MS);
    return () => clearInterval(timer);
  }, [active, reload]);

  const toggle = useCallback(
    async (photo: GalleryPhoto) => {
      if (!userId || !canLike(photo, userId) || pendingRef.current.has(photo.id)) return;
      const before = rowsRef.current;
      const wasLiked = hasLiked(before, photo.id, userId);
      pendingRef.current.add(photo.id);
      apply(toggleLike(before, photo.id, userId));
      setError(null);
      try {
        if (wasLiked) await unlikePhoto(photo.id, userId);
        else await likePhoto(photo.id, eventId, userId);
      } catch (e) {
        // Roll back only this photo's own row; other changes that arrived meanwhile stay.
        const current = rowsRef.current;
        const rolled = hasLiked(current, photo.id, userId) !== wasLiked ? toggleLike(current, photo.id, userId) : current;
        apply(rolled);
        setError(e instanceof Error ? e.message : 'Could not save your like');
      } finally {
        pendingRef.current.delete(photo.id);
      }
    },
    [eventId, userId, apply],
  );

  const counts = useMemo(() => countLikes(rows), [rows]);
  const isLiked = useCallback(
    (photoId: string) => !!userId && hasLiked(rows, photoId, userId),
    [rows, userId],
  );

  return { counts, isLiked, toggle, reload, error };
}
