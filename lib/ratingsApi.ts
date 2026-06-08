import { supabase } from '@/lib/supabase';
import { sendPushToUser } from '@/lib/pushNotifications';

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
  if (error && error.code !== '23505') {
    console.error('[ratingsApi] submitRating insert error:', error.code, error.message);
    throw new Error(error.message);
  }
  if (error?.code === '23505') {
    console.log('[ratingsApi] submitRating: already rated (23505), skipping');
    return;
  }
  console.log('[ratingsApi] submitRating: insert OK for ratee_id=', rateeId);

  // Notify ratee
  try {
    const { data: raterRow } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', raterId)
      .maybeSingle();
    const raterName = (raterRow as { name: string } | null)?.name ?? 'Alguien';
    await supabase.from('notifications').insert({
      profile_id: rateeId,
      kind: 'rating_received',
      payload: { matchId, raterId, raterName, stars },
    });
    void sendPushToUser(rateeId, '¡Nueva calificación! ⭐', `${raterName} te calificó con ${stars} estrella${stars === 1 ? '' : 's'}`, '/reputacion');
  } catch {
    // non-critical
  }

  // Recalculate and persist reputation average + attendance
  try {
    const { data: allRatings } = await supabase
      .from('ratings')
      .select('stars, tags')
      .eq('ratee_id', rateeId);
    if (allRatings && allRatings.length > 0) {
      const total = allRatings.reduce(
        (sum, r) => sum + (r as { stars: number; tags: string[] }).stars,
        0,
      );
      const avg = Math.round((total / allRatings.length) * 10) / 10;

      const attended = allRatings.filter((r) =>
        (r as { tags: string[] }).tags.includes('Asistió'),
      ).length;
      const absent = allRatings.filter((r) =>
        (r as { tags: string[] }).tags.includes('No asistió'),
      ).length;
      const attendTotal = attended + absent;
      const attendancePct = attendTotal > 0 ? Math.round((attended / attendTotal) * 100) : null;

      await supabase
        .from('profiles')
        .update({
          reputation: avg,
          ...(attendancePct != null ? { attendance_pct: attendancePct } : {}),
        })
        .eq('id', rateeId);
    }
  } catch {
    // non-critical
  }
}

/** Recomputes attendance_pct from 'Asistió'/'No asistió' rating tags. */
export async function updateAttendancePct(userId: string): Promise<void> {
  const { data } = await supabase
    .from('ratings')
    .select('tags')
    .eq('ratee_id', userId);
  const rows = (data ?? []) as { tags: string[] }[];
  const attended = rows.filter((r) => r.tags.includes('Asistió')).length;
  const absent = rows.filter((r) => r.tags.includes('No asistió')).length;
  const total = attended + absent;
  if (total === 0) return;
  const pct = Math.round((attended / total) * 100);
  await supabase.from('profiles').update({ attendance_pct: pct }).eq('id', userId);
}

export interface RatingRow {
  id: string;
  matchId: string;
  raterId: string;
  raterName: string;
  raterAvatarUrl?: string;
  stars: number;
  tags: string[];
  comment?: string;
  createdAt: string;
}

export interface GivenRating {
  matchId: string;
  rateeId: string;
  stars: number;
}

/** All ratings THIS user gave (rater) — used to filter out already-rated players + show in historial */
export async function fetchMyGivenRatings(raterId: string): Promise<GivenRating[]> {
  const { data } = await supabase
    .from('ratings')
    .select('match_id, ratee_id, stars')
    .eq('rater_id', raterId);
  return (data ?? []).map((r) => ({
    matchId: r.match_id as string,
    rateeId: r.ratee_id as string,
    stars: r.stars as number,
  }));
}

/** Ratings received by any player — used both for own reputación and other players' profiles */
export async function fetchMyRatings(userId: string): Promise<RatingRow[]> {
  // Fetch ratings without relying on named FK join — avoids Supabase FK naming issues
  const { data, error } = await supabase
    .from('ratings')
    .select('id, match_id, rater_id, stars, tags, comment, created_at')
    .eq('ratee_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[ratingsApi] fetchMyRatings error:', error.code, error.message);
    return [];
  }
  if (!data || data.length === 0) {
    console.log('[ratingsApi] fetchMyRatings: 0 rows for ratee_id=', userId);
    return [];
  }
  console.log('[ratingsApi] fetchMyRatings:', data.length, 'rows for ratee_id=', userId);

  // Batch-fetch rater profiles separately
  const raterIds = [...new Set(data.map((r) => r.rater_id as string))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, avatar_url')
    .in('id', raterIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [
      p.id as string,
      p as { id: string; name: string; avatar_url: string | null },
    ]),
  );

  return data.map((row) => {
    const rater = profileMap.get(row.rater_id as string);
    return {
      id: row.id as string,
      matchId: row.match_id as string,
      raterId: row.rater_id as string,
      raterName: rater?.name ?? 'Jugador',
      raterAvatarUrl: rater?.avatar_url ?? undefined,
      stars: row.stars as number,
      tags: (row.tags as string[]) ?? [],
      comment: (row.comment as string | null) ?? undefined,
      createdAt: row.created_at as string,
    };
  });
}
