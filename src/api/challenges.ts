import type { Challenge, ChallengeDraft, ChallengeItem } from '../lib/challenges';
import { countByChallenge, submittedChallengeIds, toChallengeItems } from '../lib/challenges';
import { supabase } from '../lib/supabase';

const COLUMNS = 'id, event_id, title, description, position';

/** The event's challenges in display order. */
export async function listChallenges(eventId: string): Promise<Challenge[]> {
  const { data, error } = await supabase
    .from('challenges')
    .select(COLUMNS)
    .eq('event_id', eventId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw new Error('Could not load challenges');
  return (data ?? []) as Challenge[];
}

/** One challenge, or null when it does not exist (e.g. deleted by the host). */
export async function getChallenge(challengeId: string): Promise<Challenge | null> {
  const { data, error } = await supabase
    .from('challenges')
    .select(COLUMNS)
    .eq('id', challengeId)
    .maybeSingle();
  if (error) throw new Error('Could not load the challenge');
  return (data as Challenge | null) ?? null;
}

/**
 * Challenge list with photo counts and my submissions (SPEC 5.3, DESIGN.md §5): the challenges,
 * plus two light queries over photos (challenge_id only) that are counted on the client.
 */
export async function listChallengeItems(
  eventId: string,
  userId: string,
): Promise<ChallengeItem[]> {
  const [challenges, all, mine] = await Promise.all([
    listChallenges(eventId),
    supabase.from('photos').select('challenge_id').eq('event_id', eventId).not('challenge_id', 'is', null),
    supabase
      .from('photos')
      .select('challenge_id')
      .eq('event_id', eventId)
      .eq('uploader_id', userId)
      .not('challenge_id', 'is', null),
  ]);
  if (all.error || mine.error) throw new Error('Could not load challenges');
  return toChallengeItems(
    challenges,
    countByChallenge((all.data ?? []) as { challenge_id: string | null }[]),
    submittedChallengeIds((mine.data ?? []) as { challenge_id: string | null }[]),
  );
}

/** Adds challenges to an event (host only, enforced by RLS); positions continue from `startAt`. */
export async function addChallenges(
  eventId: string,
  drafts: ChallengeDraft[],
  startAt = 0,
): Promise<void> {
  if (drafts.length === 0) return;
  const { error } = await supabase.from('challenges').insert(
    drafts.map((d, i) => ({
      event_id: eventId,
      title: d.title,
      description: d.description,
      position: startAt + i,
    })),
  );
  if (error) throw new Error('Could not save the challenges');
}

export async function updateChallenge(id: string, draft: ChallengeDraft): Promise<void> {
  const { error } = await supabase
    .from('challenges')
    .update({ title: draft.title, description: draft.description })
    .eq('id', id);
  if (error) throw new Error('Could not save the challenge');
}

/** Deleting a challenge keeps its photos (challenge_id is set to null by the database). */
export async function deleteChallenge(id: string): Promise<void> {
  const { error } = await supabase.from('challenges').delete().eq('id', id);
  if (error) throw new Error('Could not delete the challenge');
}
