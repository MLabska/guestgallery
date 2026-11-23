import type { LikeRow } from '../lib/likes';
import { supabase } from '../lib/supabase';

/** All likes of an event's photos (photo_id, user_id); counted on the client (DESIGN.md §5, 5.4). */
export async function listLikes(eventId: string): Promise<LikeRow[]> {
  const { data, error } = await supabase
    .from('photo_likes')
    .select('photo_id, user_id')
    .eq('event_id', eventId);
  if (error) throw new Error('Could not load likes');
  return (data ?? []) as LikeRow[];
}

/**
 * Like = upsert that ignores duplicates, so a double tap or a like that already exists is no error.
 * RLS rejects own photos, photos without a challenge and non-participants.
 */
export async function likePhoto(photoId: string, eventId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('photo_likes')
    .upsert(
      { photo_id: photoId, event_id: eventId, user_id: userId },
      { onConflict: 'photo_id,user_id', ignoreDuplicates: true },
    );
  if (error) throw new Error('Could not save your like');
}

/** Unlike = delete my own row. */
export async function unlikePhoto(photoId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('photo_likes')
    .delete()
    .eq('photo_id', photoId)
    .eq('user_id', userId);
  if (error) throw new Error('Could not remove your like');
}
