/** A participants row as shown to the host (DESIGN.md §5, 1.5). */
export type Participant = {
  user_id: string;
  nickname: string;
  joined_at: string;
};

/** Host first, then everybody by join time (oldest first); equal times fall back to the nickname. */
export function sortParticipants(list: Participant[], hostId: string): Participant[] {
  const rank = (p: Participant) => (p.user_id === hostId ? 0 : 1);
  return [...list].sort((a, b) => {
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    if (a.joined_at !== b.joined_at) return a.joined_at < b.joined_at ? -1 : 1;
    return a.nickname.localeCompare(b.nickname);
  });
}

/** Guests = everybody except the host. */
export function guestCount(list: Participant[], hostId: string): number {
  return list.filter((p) => p.user_id !== hostId).length;
}

/** "No guests yet", "1 guest", "7 guests". */
export function guestCountLabel(count: number): string {
  if (count === 0) return 'No guests yet';
  return count === 1 ? '1 guest' : `${count} guests`;
}

/** Role badge next to a participant. */
export function roleLabel(p: Participant, hostId: string): 'Host' | null {
  return p.user_id === hostId ? 'Host' : null;
}

/** Join time such as "12 Dec 2026, 14:05". */
export function formatJoinedAt(iso: string): string {
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;
}
