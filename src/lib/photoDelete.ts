/**
 * Delete-visibility rule (SPEC 3.3, 6.1): the uploader sees delete on their own photos, the host
 * on every photo of the event. The server (RLS) enforces the same rule.
 */
export function canDeletePhoto(
  photo: { uploader_id: string },
  userId: string | undefined,
  isHost: boolean,
): boolean {
  if (!userId) return false;
  return isHost || photo.uploader_id === userId;
}
