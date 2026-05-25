import { supabase } from '@/lib/supabase';

export async function submitRating(
  matchId: string,
  raterId: string,
  rateeId: string,
  stars: number,
  tags: string[],
  comment: string,
): Promise<void> {
  const { error } = await supabase.from('ratings').insert({
    match_id: matchId,
    rater_id: raterId,
    ratee_id: rateeId,
    stars,
    tags,
    comment: comment.trim() || null,
  });
  // 23505 = unique violation (already rated this person in this match) — treat as success
  if (error && error.code !== '23505') throw new Error(error.message);
}
