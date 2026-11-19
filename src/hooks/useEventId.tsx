import { createContext, useContext } from 'react';

/**
 * The current event id, provided by app/event/[id]/_layout.tsx.
 * Tab screens read it from here because switching tabs does not
 * reliably pass the parent's [id] route param down to them.
 */
export const EventIdContext = createContext<string | null>(null);

export function useEventId(): string {
  const id = useContext(EventIdContext);
  if (!id) throw new Error('useEventId must be used inside an event route');
  return id;
}
