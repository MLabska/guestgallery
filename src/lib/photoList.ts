/** A row of the photos_with_author view (DESIGN.md §2). */
export type GalleryPhoto = {
  id: string;
  event_id: string;
  uploader_id: string;
  challenge_id: string | null;
  path: string;
  thumb_path: string;
  width: number | null;
  height: number | null;
  created_at: string;
  author_nickname: string | null;
};

export const PAGE_SIZE = 30;

function byNewest(a: GalleryPhoto, b: GalleryPhoto): number {
  if (a.created_at === b.created_at) return a.id < b.id ? 1 : -1;
  return a.created_at < b.created_at ? 1 : -1;
}

/** Realtime INSERT: put the photo first (newest first); an id already in the list is ignored. */
export function applyInsert(list: GalleryPhoto[], photo: GalleryPhoto): GalleryPhoto[] {
  if (list.some((p) => p.id === photo.id)) return list;
  return [photo, ...list].sort(byNewest);
}

/** Realtime DELETE: drop the photo with this id; unknown ids (other events) change nothing. */
export function applyDelete(list: GalleryPhoto[], id: string): GalleryPhoto[] {
  return list.some((p) => p.id === id) ? list.filter((p) => p.id !== id) : list;
}

/** Appends the next page, skipping photos already in the list (e.g. added by realtime). */
export function appendPage(list: GalleryPhoto[], page: GalleryPhoto[]): GalleryPhoto[] {
  const known = new Set(list.map((p) => p.id));
  return [...list, ...page.filter((p) => !known.has(p.id))].sort(byNewest);
}

/**
 * Replaces the loaded head with a freshly fetched first page (pull-to-refresh, return from
 * background). Older photos beyond the first page that are already loaded are kept.
 */
export function replaceFirstPage(list: GalleryPhoto[], firstPage: GalleryPhoto[]): GalleryPhoto[] {
  if (firstPage.length === 0) return [];
  const oldest = firstPage[firstPage.length - 1];
  const fresh = new Set(firstPage.map((p) => p.id));
  // Keep the loaded tail only when the fresh page overlaps the current list; otherwise photos
  // between the two would be skipped (nextCursor points below the old tail).
  const overlaps = list.some((p) => fresh.has(p.id));
  const tail =
    firstPage.length < PAGE_SIZE || !overlaps
      ? []
      : list.filter((p) => !fresh.has(p.id) && byNewest(oldest, p) < 0);
  return [...firstPage, ...tail].sort(byNewest);
}

/** Cursor for the next page: created_at of the last loaded photo, or null when empty. */
export function nextCursor(list: GalleryPhoto[]): string | null {
  return list.length === 0 ? null : list[list.length - 1].created_at;
}

/** Viewer swipe target after a photo vanished: the same index, clamped; -1 when empty. */
export function indexAfterRemoval(length: number, index: number): number {
  if (length === 0) return -1;
  return Math.min(index, length - 1);
}

/** Time shown in the viewer, e.g. "20 Nov 2026, 14:05". */
export function formatPhotoTime(iso: string): string {
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;
}
