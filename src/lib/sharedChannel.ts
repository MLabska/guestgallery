import { supabase } from './supabase';

export type PhotoChangeHandlers = {
  onInsert: (row: { id?: string }) => void;
  onDelete: (row: { id?: string }) => void;
  onUpdate: (row: { id?: string; challenge_id?: string | null }) => void;
  /** Called on every SUBSCRIBED status (first join and each reconnect). */
  onSubscribed: () => void;
};

type Entry = {
  channel: ReturnType<typeof supabase.channel>;
  handlers: Set<PhotoChangeHandlers>;
};

const entries = new Map<string, Entry>();

/**
 * One realtime channel per topic, shared by every screen that needs it. supabase.channel() returns
 * the existing channel for a topic, and adding postgres_changes callbacks to a joined channel
 * throws, so a second screen (e.g. the photo viewer over a challenge gallery) must not build its
 * own. The channel is removed when the last user releases it. Returns the release function.
 */
export function acquirePhotoChannel(
  topic: string,
  insertFilter: string,
  handlers: PhotoChangeHandlers,
): () => void {
  let entry = entries.get(topic);
  if (!entry) {
    const set = new Set<PhotoChangeHandlers>();
    const channel = supabase
      .channel(topic)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'photos', filter: insertFilter },
        (payload) => set.forEach((h) => h.onInsert(payload.new as { id?: string })),
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'photos' }, (payload) =>
        set.forEach((h) => h.onDelete(payload.old as { id?: string })),
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'photos' }, (payload) =>
        set.forEach((h) =>
          h.onUpdate(payload.new as { id?: string; challenge_id?: string | null }),
        ),
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') set.forEach((h) => h.onSubscribed());
      });
    entry = { channel, handlers: set };
    entries.set(topic, entry);
  }
  const current = entry;
  current.handlers.add(handlers);
  return () => {
    current.handlers.delete(handlers);
    if (current.handlers.size === 0 && entries.get(topic) === current) {
      entries.delete(topic);
      void supabase.removeChannel(current.channel);
    }
  };
}
