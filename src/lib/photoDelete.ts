/** Message of the "not allowed" case thrown by deletePhoto. */
export const DELETE_NOT_ALLOWED_MESSAGE = 'You are not allowed to delete this photo';

/** Alert text for a failed delete: the specific reason, or a connection hint for anything else. */
export function deleteErrorMessage(message: string | undefined | null): string {
  if (message === DELETE_NOT_ALLOWED_MESSAGE) return message;
  return 'Check your connection and try again.';
}

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
