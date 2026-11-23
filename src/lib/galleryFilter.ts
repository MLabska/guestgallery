import { dayRange, formatLongDate } from './dates';
import type { GalleryPhoto } from './photoList';

/** Gallery filter (SPEC 4.4): one person and/or one local day (YYYY-MM-DD). Null = not filtered. */
export type GalleryFilter = {
  uploaderId: string | null;
  day: string | null;
};

export const NO_FILTER: GalleryFilter = { uploaderId: null, day: null };

export function isFilterActive(filter: GalleryFilter): boolean {
  return filter.uploaderId !== null || filter.day !== null;
}

export function sameFilter(a: GalleryFilter, b: GalleryFilter): boolean {
  return a.uploaderId === b.uploaderId && a.day === b.day;
}

/** Does a (realtime) photo belong in the filtered gallery? Both set filters must match. */
export function matchesFilter(
  photo: Pick<GalleryPhoto, 'uploader_id' | 'created_at'>,
  filter: GalleryFilter,
): boolean {
  if (filter.uploaderId !== null && photo.uploader_id !== filter.uploaderId) return false;
  if (filter.day !== null) {
    const range = dayRange(filter.day);
    if (!range) return false;
    const t = new Date(photo.created_at).getTime();
    if (!(t >= new Date(range.from).getTime() && t < new Date(range.to).getTime())) return false;
  }
  return true;
}

/** Text of the active-filter bar, e.g. "Anna · Saturday, 12 December 2026"; empty when not filtered. */
export function filterLabel(filter: GalleryFilter, nicknameOf: (userId: string) => string | null): string {
  const parts: string[] = [];
  if (filter.uploaderId !== null) parts.push(nicknameOf(filter.uploaderId) ?? 'Unknown guest');
  if (filter.day !== null) parts.push(formatLongDate(filter.day));
  return parts.join(' · ');
}
