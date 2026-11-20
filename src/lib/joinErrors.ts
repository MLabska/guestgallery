export const EVENT_NOT_FOUND_MESSAGE = 'Event not found';
export const NOT_A_GUESTGALLERY_CODE_MESSAGE = 'This is not a GuestGallery code';

/** Maps an error raised by the join_event RPC to a user-facing message (SPEC 2.2, 2.3). */
export function joinEventErrorMessage(message: string | undefined | null): string {
  const text = message ?? '';
  if (text.includes('EVENT_NOT_FOUND')) return EVENT_NOT_FOUND_MESSAGE;
  if (text.includes('NICKNAME_TAKEN')) return 'This nickname is already taken in this event';
  if (text.includes('INVALID_NICKNAME')) return 'Nickname must be 1 to 30 characters';
  if (text.includes('NOT_AUTHENTICATED')) return 'You are not signed in yet. Please try again';
  return 'Could not join the event. Check your connection and try again';
}

/** True when the message means the code itself is wrong (not the nickname). */
export function isEventNotFound(message: string): boolean {
  return message === EVENT_NOT_FOUND_MESSAGE;
}
