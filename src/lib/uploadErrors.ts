export const UPLOADS_CLOSED_MESSAGE = 'Uploads for this event are closed';
export const CHALLENGE_GONE_MESSAGE =
  'This challenge no longer exists. Retry to upload without a challenge';

/**
 * True when a Supabase error means the server refused the upload (RLS), which is what
 * happens when the upload window has closed (SPEC 3.4, DESIGN.md §9).
 */
export function isUploadRejected(message: string | undefined | null): boolean {
  if (!message) return false;
  return /row-level security|row level security|unauthorized|not authorized|permission denied/i.test(
    message,
  );
}

/** Readable message for a failed upload. */
export function uploadErrorMessage(message: string | undefined | null): string {
  if (message === CHALLENGE_GONE_MESSAGE) return CHALLENGE_GONE_MESSAGE;
  if (message === UPLOADS_CLOSED_MESSAGE || isUploadRejected(message)) {
    return UPLOADS_CLOSED_MESSAGE;
  }
  return 'Upload failed. Check your connection and try again';
}
