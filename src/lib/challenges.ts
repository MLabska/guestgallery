/** A row of `challenges` (DESIGN.md §2). */
export type Challenge = {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  position: number;
};

/** A challenge as shown in the list (SPEC 5.3). */
export type ChallengeItem = Challenge & {
  photoCount: number;
  /** True when I already submitted a photo to this challenge. */
  submitted: boolean;
};

/** A challenge the host is still composing (before it is saved). */
export type ChallengeDraft = { title: string; description: string | null };

/** Display order: by position, then by title so equal positions stay stable. */
export function sortChallenges<T extends Pick<Challenge, 'position' | 'title'>>(list: T[]): T[] {
  return [...list].sort((a, b) =>
    a.position !== b.position ? a.position - b.position : a.title.localeCompare(b.title),
  );
}

/** Number of photos per challenge id; photos without a challenge are ignored. */
export function countByChallenge(photos: { challenge_id: string | null }[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const p of photos) {
    if (p.challenge_id) counts[p.challenge_id] = (counts[p.challenge_id] ?? 0) + 1;
  }
  return counts;
}

/** Set of challenge ids that appear in my photos (the ✓ marking, SPEC 5.3). */
export function submittedChallengeIds(photos: { challenge_id: string | null }[]): Set<string> {
  const ids = new Set<string>();
  for (const p of photos) if (p.challenge_id) ids.add(p.challenge_id);
  return ids;
}

/** Combines challenges, photo counts and my submissions into list rows. */
export function toChallengeItems(
  challenges: Challenge[],
  counts: Record<string, number>,
  submitted: Set<string>,
): ChallengeItem[] {
  return sortChallenges(challenges).map((c) => ({
    ...c,
    photoCount: counts[c.id] ?? 0,
    submitted: submitted.has(c.id),
  }));
}

/** "1 photo" / "3 photos". */
export function photoCountLabel(count: number): string {
  return count === 1 ? '1 photo' : `${count} photos`;
}

/** True when a title is already used (case-insensitive, trimmed). */
export function hasTitle(titles: string[], title: string): boolean {
  const wanted = title.trim().toLowerCase();
  return titles.some((t) => t.trim().toLowerCase() === wanted);
}

/** Suggestions that are not yet in the list of chosen titles. */
export function remainingSuggestions(suggestions: readonly string[], chosen: string[]): string[] {
  return suggestions.filter((s) => !hasTitle(chosen, s));
}

/** Position for a new challenge: after the last existing one. */
export function nextPosition(challenges: Pick<Challenge, 'position'>[]): number {
  return challenges.reduce((max, c) => Math.max(max, c.position), -1) + 1;
}
