export type EventSummary = {
  id: string;
  code: string;
  name: string;
  event_date: string;
  host_id: string;
  uploads_close_at: string;
};

/** One row of `participants` joined with its event (DESIGN.md §5, 1.4). */
export type MyEventRow = {
  joined_at: string;
  nickname: string;
  events: EventSummary | null;
};

export type MyEventItem = {
  id: string;
  name: string;
  code: string;
  eventDate: string;
  joinedAt: string;
  role: 'Host' | 'Guest';
};

/** True when the given user created the event. */
export function isHostOf(
  event: Pick<EventSummary, 'host_id'>,
  userId: string | undefined,
): boolean {
  return !!userId && event.host_id === userId;
}

/** Labels rows Host/Guest, drops rows without a readable event and sorts newest joined first (SPEC 1.4). */
export function toMyEventItems(rows: MyEventRow[], userId: string): MyEventItem[] {
  return rows
    .filter((row): row is MyEventRow & { events: EventSummary } => row.events !== null)
    .map((row) => ({
      id: row.events.id,
      name: row.events.name,
      code: row.events.code,
      eventDate: row.events.event_date,
      joinedAt: row.joined_at,
      role: isHostOf(row.events, userId) ? ('Host' as const) : ('Guest' as const),
    }))
    .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());
}
