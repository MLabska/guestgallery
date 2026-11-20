import { supabase } from './supabase';

export type PhotoChangeHandlers = {
  onInsert: (row: { id?: string }) => void;
  onDelete: (row: { id?: string }) => void;
  onUpdate: (row: { id?: string; challenge_id?: string | null }) => void;
  /** Called on every SUBSCRIBED status (first join and each reconnect). */
  onSubscribed: () => void;
};

type Entry = {
  /** Null while the channel of a previous owner of the topic is still leaving. */
  channel: ReturnType<typeof supabase.channel> | null;
  handlers: Set<PhotoChangeHandlers>;
};

const entries = new Map<string, Entry>();
/** Topics whose channel is being removed: a new channel for the same topic must wait for it. */
const leaving = new Map<string, Promise<unknown>>();

function open(topic: string, insertFilter: string, entry: Entry) {
  const set = entry.handlers;
  entry.channel = supabase
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
      set.forEach((h) => h.onUpdate(payload.new as { id?: string; challenge_id?: string | null })),
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') set.forEach((h) => h.onSubscribed());
    });
}

/**
 * One realtime channel per topic, shared by every screen that needs it. supabase.channel() returns
 * the existing channel for a topic, and adding postgres_changes callbacks to a joined channel
 * throws, so a second screen (e.g. the photo viewer over a challenge gallery) must not build its
 * own. The channel is removed when the last user releases it. If the topic is acquired again while
 * the old channel is still leaving (slow network), the new channel is created once the removal has
 * finished, because channel() would hand back the dying one. Returns the release function.
 */
export function acquirePhotoChannel(
  topic: string,
  insertFilter: string,
  handlers: PhotoChangeHandlers,
): () => void {
  let entry = entries.get(topic);
  if (!entry) {
    const created: Entry = { channel: null, handlers: new Set() };
    entry = created;
    entries.set(topic, created);
    const pending = leaving.get(topic);
    if (pending) {
      void pending.then(() => {
        // Skip when everyone released the topic again while waiting.
        if (entries.get(topic) === created) open(topic, insertFilter, created);
      });
    } else {
      open(topic, insertFilter, created);
    }
  }
  const current = entry;
  current.handlers.add(handlers);
  return () => {
    current.handlers.delete(handlers);
    if (current.handlers.size === 0 && entries.get(topic) === current) {
      entries.delete(topic);
      const channel = current.channel;
      if (!channel) return; // never opened: nothing to remove
      const removal: Promise<unknown> = Promise.resolve(supabase.removeChannel(channel))
        .catch(() => undefined)
        .then(() => {
          if (leaving.get(topic) === removal) leaving.delete(topic);
        });
      leaving.set(topic, removal);
    }
  };
}
