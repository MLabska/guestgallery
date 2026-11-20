/** Storage paths of a photo (DESIGN.md §3). The id must be a lowercase UUID. */
export function photoPaths(
  eventId: string,
  photoId: string,
): { path: string; thumbPath: string } {
  const event = eventId.toLowerCase();
  const photo = photoId.toLowerCase();
  return { path: `${event}/${photo}.jpg`, thumbPath: `${event}/${photo}_thumb.jpg` };
}
