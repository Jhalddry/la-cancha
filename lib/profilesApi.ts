import { supabase } from '@/lib/supabase';
import { rowToPlayer } from '@/lib/mappers';
import type { Player } from '@/types/domain';

const PROFILE_FIELDS =
  'id, name, username, avatar_url, skill_level, sports, positions, bio, verified, reputation, matches_played, matches_organized, attendance_pct, badges, city, onboarded';

export async function setPlayerVerified(id: string, verified: boolean): Promise<void> {
  const { error } = await supabase.from('profiles').update({ verified }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function requestVerification(id: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ verification_requested: true })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function fetchVerificationRequests(): Promise<Player[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_FIELDS)
    .eq('verification_requested', true)
    .eq('verified', false)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  const players = (data ?? []).map((row) => rowToPlayer(row as Record<string, unknown>));
  if (players.length === 0) return [];

  // Compute live stats for each player (same as fetchProfile)
  const enriched = await Promise.all(
    players.map(async (player) => {
      const [participantRes, organizedRes, repRes] = await Promise.all([
        supabase
          .from('match_participants')
          .select('*', { count: 'exact', head: true })
          .eq('profile_id', player.id)
          .eq('status', 'joined'),
        supabase
          .from('matches')
          .select('*', { count: 'exact', head: true })
          .eq('organizer_id', player.id),
        supabase.from('ratings').select('stars, tags').eq('ratee_id', player.id),
      ]);
      const ratingRows = (repRes.data ?? []) as { stars: number; tags: string[] | null }[];
      const reputation =
        ratingRows.length > 0
          ? Math.round(
              (ratingRows.reduce((s, r) => s + r.stars, 0) / ratingRows.length) * 10,
            ) / 10
          : player.reputation;
      // Compute attendance from tags
      let asistio = 0;
      let noAsistio = 0;
      for (const row of ratingRows) {
        for (const tag of row.tags ?? []) {
          if (tag === 'Asistió') asistio++;
          else if (tag === 'No asistió') noAsistio++;
        }
      }
      const attendancePct =
        asistio + noAsistio > 0
          ? Math.round((asistio / (asistio + noAsistio)) * 100)
          : player.attendancePct;
      return {
        ...player,
        matchesPlayed: participantRes.count ?? player.matchesPlayed ?? 0,
        matchesOrganized: organizedRes.count ?? player.matchesOrganized ?? 0,
        reputation,
        attendancePct: attendancePct ?? undefined,
      };
    }),
  );
  return enriched;
}

export async function approveVerification(id: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ verified: true, verification_requested: false })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function rejectVerification(id: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ verification_requested: false })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function fetchProfile(id: string): Promise<Player | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_FIELDS)
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;

  const player = rowToPlayer(data as Record<string, unknown>);

  // Fetch live counts + reputation in parallel
  const [participantRes, organizedRes, repRes] = await Promise.all([
    supabase
      .from('match_participants')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', id)
      .eq('status', 'joined'),
    supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('organizer_id', id),
    supabase
      .from('ratings')
      .select('stars')
      .eq('ratee_id', id),
  ]);

  // Compute reputation from actual ratings (profile column may be stale / not updated due to RLS)
  const ratingRows = repRes.data ?? [];
  const computedReputation =
    ratingRows.length > 0
      ? Math.round(
          (ratingRows.reduce((s, r) => s + (r as { stars: number }).stars, 0) /
            ratingRows.length) *
            10,
        ) / 10
      : player.reputation;

  return {
    ...player,
    matchesPlayed: participantRes.count ?? player.matchesPlayed ?? 0,
    matchesOrganized: organizedRes.count ?? player.matchesOrganized ?? 0,
    reputation: computedReputation,
  };
}
