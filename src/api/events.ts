import { createEventErrorMessage } from '../lib/eventErrors';
import { joinEventErrorMessage } from '../lib/joinErrors';
import { toMyEventItems } from '../lib/myEvents';
import type { EventSummary, MyEventItem, MyEventRow } from '../lib/myEvents';
import { supabase } from '../lib/supabase';

const EVENT_COLUMNS = 'id, code, name, event_date, host_id, uploads_close_at';

/** RPC create_event: the server generates the code and the host's participant row (DESIGN.md §5). */
export async function createEvent(
  name: string,
  eventDate: string,
  hostNickname: string,
): Promise<{ id: string; code: string }> {
  const { data, error } = await supabase.rpc('create_event', {
    name,
    event_date: eventDate,
    host_nickname: hostNickname,
  });
  if (error || !data) throw new Error(createEventErrorMessage(error?.message));
  const result = data as { id: string; code: string };
  return { id: result.id, code: result.code };
}

/** Events I created or joined, newest joined first (SPEC 1.4). */
export async function listMyEvents(userId: string): Promise<MyEventItem[]> {
  const { data, error } = await supabase
    .from('participants')
    .select(`joined_at, nickname, events(${EVENT_COLUMNS})`)
    .eq('user_id', userId)
    .order('joined_at', { ascending: false });
  if (error) throw new Error('Could not load your events');
  return toMyEventItems((data ?? []) as unknown as MyEventRow[], userId);
}

/** One event I am a participant of; null when it does not exist or I may not see it. */
export async function getEvent(id: string): Promise<EventSummary | null> {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error('Could not load the event');
  return (data as EventSummary | null) ?? null;
}

/** RPC join_event: normalises the code, upserts my participant row, returns the event (DESIGN.md §5). */
export async function joinEvent(code: string, nickname: string): Promise<{ id: string }> {
  const { data, error } = await supabase.rpc('join_event', { code, nickname });
  if (error || !data) throw new Error(joinEventErrorMessage(error?.message));
  return { id: (data as { id: string }).id };
}
