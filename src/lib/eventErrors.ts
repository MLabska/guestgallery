/** Maps an error raised by the create_event RPC to a user-facing message. */
export function createEventErrorMessage(message: string | undefined | null): string {
  const text = message ?? '';
  if (text.includes('INVALID_NAME')) return 'Event name must be 1 to 60 characters';
  if (text.includes('INVALID_EVENT_DATE')) return 'Please choose a valid event date';
  if (text.includes('INVALID_NICKNAME')) return 'Nickname must be at most 30 characters';
  if (text.includes('NOT_AUTHENTICATED')) return 'You are not signed in yet. Please try again';
  if (text.includes('CODE_GENERATION_FAILED')) {
    return 'Could not generate an event code. Please try again';
  }
  return 'Could not create the event. Check your connection and try again';
}
