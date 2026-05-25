import { supabase } from '@/lib/supabase';
import { rowToPlayer } from '@/lib/mappers';
import type {
  Currency,
  Match,
  MatchType,
  PaymentMethod,
  Player,
  Position,
  SkillLevel,
  Sport,
} from '@/types/domain';
import type { DraftMatch } from '@/store/draftMatch';

// ─── Select fragments ────────────────────────────────────────────────────────

const PROFILE_FIELDS =
  'id, name, username, avatar_url, skill_level, sports, positions, bio, verified, reputation, matches_played, matches_organized, attendance_pct, badges, city, onboarded';

const MATCH_BASE_FIELDS =
  'id, sport, modality, type, skill_level, missing_positions, missing_count, location_name, location_address, lat, lng, starts_at, duration_min, price_per_hour, currency, payment_methods, requirements, organizer_id, created_at';

// ─── Mappers ─────────────────────────────────────────────────────────────────

function rowToMatch(row: Record<string, unknown>, joinedPlayers: Player[]): Match {
  return {
    id: row.id as string,
    sport: row.sport as Sport,
    modality: row.modality as Match['modality'],
    type: row.type as MatchType,
    skillLevel: row.skill_level as SkillLevel,
    missingPositions: (row.missing_positions as Position[]) ?? [],
    missingCount: row.missing_count as number,
    location: {
      name: row.location_name as string,
      address: (row.location_address as string | null) ?? undefined,
      lat: (row.lat as number | null) ?? undefined,
      lng: (row.lng as number | null) ?? undefined,
    },
    startsAt: row.starts_at as string,
    durationMin: row.duration_min as number,
    pricePerHour: row.price_per_hour as number,
    currency: row.currency as Currency,
    paymentMethods: (row.payment_methods as PaymentMethod[]) ?? [],
    requirements: (row.requirements as string[]) ?? [],
    organizer: rowToPlayer(row.organizer as Record<string, unknown>),
    joinedPlayers,
  };
}

// ─── Helper: fetch joined players for a list of match IDs ───────────────────

async function fetchJoinedPlayersByMatchIds(
  matchIds: string[],
): Promise<Record<string, Player[]>> {
  if (matchIds.length === 0) return {};

  const { data } = await supabase
    .from('match_participants')
    .select(`match_id, player:profiles!profile_id(${PROFILE_FIELDS})`)
    .eq('status', 'joined')
    .in('match_id', matchIds);

  const map: Record<string, Player[]> = {};
  for (const row of data ?? []) {
    const r = row as unknown as { match_id: string; player: Record<string, unknown> | null };
    if (!r.player) continue;
    if (!map[r.match_id]) map[r.match_id] = [];
    map[r.match_id].push(rowToPlayer(r.player));
  }
  return map;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface MatchFilters {
  sport?: Sport | 'all';
  types?: MatchType[];
  skillLevel?: SkillLevel;
  upcomingOnly?: boolean;
  limit?: number;
}

export async function fetchMatches(filters: MatchFilters = {}): Promise<Match[]> {
  let query = supabase
    .from('matches')
    .select(`${MATCH_BASE_FIELDS}, organizer:profiles!organizer_id(${PROFILE_FIELDS})`)
    .order('starts_at', { ascending: true });

  if (filters.upcomingOnly !== false) {
    query = query.gt('starts_at', new Date().toISOString());
  }
  if (filters.sport && filters.sport !== 'all') {
    query = query.eq('sport', filters.sport);
  }
  if (filters.types?.length) {
    query = query.in('type', filters.types);
  }
  if (filters.skillLevel) {
    query = query.eq('skill_level', filters.skillLevel);
  }
  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  const matchIds = data.map((r) => r.id as string);
  const playersByMatch = await fetchJoinedPlayersByMatchIds(matchIds);

  return data.map((row) =>
    rowToMatch(row as Record<string, unknown>, playersByMatch[row.id as string] ?? []),
  );
}

export async function fetchMatch(id: string): Promise<Match | null> {
  const { data, error } = await supabase
    .from('matches')
    .select(`${MATCH_BASE_FIELDS}, organizer:profiles!organizer_id(${PROFILE_FIELDS})`)
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;

  const playersByMatch = await fetchJoinedPlayersByMatchIds([id]);

  return rowToMatch(data as Record<string, unknown>, playersByMatch[id] ?? []);
}

export async function fetchMyMatches(userId: string): Promise<{
  upcoming: Match[];
  past: Match[];
  created: Match[];
}> {
  const now = new Date().toISOString();

  // Joined matches (upcoming + past) via match_participants
  const { data: joinedRows } = await supabase
    .from('match_participants')
    .select('match_id')
    .eq('profile_id', userId)
    .eq('status', 'joined');

  const joinedIds = (joinedRows ?? []).map((r: { match_id: string }) => r.match_id);

  // Created matches
  const { data: createdRows, error: createdError } = await supabase
    .from('matches')
    .select(`${MATCH_BASE_FIELDS}, organizer:profiles!organizer_id(${PROFILE_FIELDS})`)
    .eq('organizer_id', userId)
    .order('starts_at', { ascending: true });

  // Joined match details
  let joinedMatchRows: Record<string, unknown>[] = [];
  if (joinedIds.length > 0) {
    const { data } = await supabase
      .from('matches')
      .select(`${MATCH_BASE_FIELDS}, organizer:profiles!organizer_id(${PROFILE_FIELDS})`)
      .in('id', joinedIds)
      .order('starts_at', { ascending: true });
    joinedMatchRows = (data ?? []) as Record<string, unknown>[];
  }

  const allMatchIds = [
    ...joinedIds,
    ...((createdRows ?? []).map((r) => r.id as string)),
  ];
  const playersByMatch = await fetchJoinedPlayersByMatchIds(
    [...new Set(allMatchIds)],
  );

  const toMatch = (row: Record<string, unknown>) =>
    rowToMatch(row, playersByMatch[row.id as string] ?? []);

  const joinedMatches = joinedMatchRows.map(toMatch);
  const createdMatches = createdError ? [] : (createdRows ?? []).map((r) => toMatch(r as Record<string, unknown>));

  return {
    upcoming: joinedMatches.filter((m) => m.startsAt > now),
    past: joinedMatches.filter((m) => m.startsAt <= now),
    created: createdMatches,
  };
}

export async function createMatch(
  draft: DraftMatch,
  organizerId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from('matches')
    .insert({
      sport: draft.sport,
      modality: draft.modality,
      type: draft.type,
      skill_level: draft.skillLevel,
      missing_positions: draft.positions,
      missing_count: draft.missingCount,
      location_name: draft.locationName.trim(),
      location_address: draft.locationAddress.trim() || null,
      lat: draft.locationLat,
      lng: draft.locationLng,
      starts_at: draft.date.toISOString(),
      duration_min: draft.durationMin,
      price_per_hour: Number(draft.pricePerHour),
      currency: draft.currency,
      payment_methods: draft.paymentMethods,
      requirements: draft.requirements,
      organizer_id: organizerId,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return (data as { id: string }).id;
}

export async function joinMatch(matchId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('match_participants')
    .insert({ match_id: matchId, profile_id: userId, status: 'joined' });
  // 23505 = already joined (unique constraint), ignore
  if (error && error.code !== '23505') throw new Error(error.message);
  // missing_count updated automatically by sync_missing_count trigger
}

export async function leaveMatch(matchId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('match_participants')
    .update({ status: 'left' })
    .eq('match_id', matchId)
    .eq('profile_id', userId);
  if (error) throw new Error(error.message);
  // missing_count updated automatically by sync_missing_count trigger
}

export async function updateMatch(
  id: string,
  patch: {
    starts_at?: string;
    duration_min?: number;
    location_name?: string;
    location_address?: string | null;
    lat?: number | null;
    lng?: number | null;
  },
): Promise<void> {
  const { error } = await supabase.from('matches').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteMatch(id: string): Promise<void> {
  const { error } = await supabase.from('matches').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
