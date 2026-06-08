import { supabase } from '@/lib/supabase';
import { rowToPlayer } from '@/lib/mappers';
import { sendPushToUser } from '@/lib/pushNotifications';
import { labelModality, labelSport } from '@/lib/format';
import type { Modality, Sport as SportType } from '@/types/domain';
import type {
  Currency,
  Match,
  MatchParticipant,
  MatchType,
  PaymentMethod,
  PendingParticipant,
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
  'id, sport, modality, type, skill_level, missing_positions, missing_count, location_name, location_address, lat, lng, starts_at, duration_min, price_per_hour, currency, payment_methods, requirements, optional_requirements, organizer_id, created_at, started_at, ended_at';

// ─── Mappers ─────────────────────────────────────────────────────────────────

function rowToMatch(row: Record<string, unknown>, joinedPlayers: MatchParticipant[]): Match {
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
    optionalRequirements: (row.optional_requirements as string[]) ?? [],
    organizer: rowToPlayer(row.organizer as Record<string, unknown>),
    joinedPlayers,
    startedAt: (row.started_at as string | null) ?? undefined,
    endedAt: (row.ended_at as string | null) ?? undefined,
  };
}

// ─── Helper: fetch joined players for a list of match IDs ───────────────────

async function fetchJoinedPlayersByMatchIds(
  matchIds: string[],
): Promise<Record<string, MatchParticipant[]>> {
  if (matchIds.length === 0) return {};

  const { data } = await supabase
    .from('match_participants')
    .select(`match_id, payment_method, checked_requirements, player:profiles!profile_id(${PROFILE_FIELDS})`)
    .eq('status', 'joined')
    .in('match_id', matchIds);

  const map: Record<string, MatchParticipant[]> = {};
  for (const row of data ?? []) {
    const r = row as unknown as {
      match_id: string;
      payment_method: string | null;
      checked_requirements: string[] | null;
      player: Record<string, unknown> | null;
    };
    if (!r.player) continue;
    if (!map[r.match_id]) map[r.match_id] = [];
    map[r.match_id].push({
      ...rowToPlayer(r.player),
      paymentMethod: (r.payment_method as PaymentMethod) ?? undefined,
      checkedRequirements: r.checked_requirements ?? [],
    });
  }
  return map;
}

export async function fetchPendingParticipants(matchId: string): Promise<PendingParticipant[]> {
  const { data } = await supabase
    .from('match_participants')
    .select(`profile_id, payment_method, checked_requirements, player:profiles!profile_id(${PROFILE_FIELDS})`)
    .eq('match_id', matchId)
    .eq('status', 'pending');

  return (data ?? []).flatMap((row) => {
    const r = row as unknown as {
      payment_method: string | null;
      checked_requirements: string[] | null;
      player: Record<string, unknown> | null;
    };
    if (!r.player) return [];
    return [{
      ...rowToPlayer(r.player),
      paymentMethod: (r.payment_method as PaymentMethod) ?? undefined,
      checkedRequirements: r.checked_requirements ?? [],
    }];
  });
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const PAGE_SIZE = 20;

export interface MatchFilters {
  sport?: Sport | 'all';
  types?: MatchType[];
  skillLevel?: SkillLevel;
  upcomingOnly?: boolean;
  includeFull?: boolean;
  limit?: number;
  offset?: number;
  excludeIds?: string[];
}

export async function fetchMatches(filters: MatchFilters = {}): Promise<Match[]> {
  let query = supabase
    .from('matches')
    .select(`${MATCH_BASE_FIELDS}, organizer:profiles!organizer_id(${PROFILE_FIELDS})`)
    .order('starts_at', { ascending: true });

  // Never show ended or cancelled matches in search/browse
  query = query.is('ended_at', null);

  if (filters.excludeIds && filters.excludeIds.length > 0) {
    query = query.not('id', 'in', `(${filters.excludeIds.join(',')})`);
  }

  if (filters.upcomingOnly !== false) {
    query = query.gt('starts_at', new Date().toISOString());
  }
  // Only show matches with open spots by default
  if (filters.includeFull !== true) {
    query = query.gt('missing_count', 0);
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
  if (filters.offset !== undefined) {
    query = query.range(filters.offset, filters.offset + PAGE_SIZE - 1);
  } else if (filters.limit) {
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

export async function fetchPlayerJoinedMatches(profileId: string): Promise<Match[]> {
  const { data: rows } = await supabase
    .from('match_participants')
    .select('match_id')
    .eq('profile_id', profileId)
    .eq('status', 'joined')
    .limit(30);

  if (!rows || rows.length === 0) return [];

  const results = await Promise.all(
    rows.map((r) => fetchMatch(r.match_id as string)),
  );
  return results
    .filter((m): m is Match => m !== null)
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
}

export async function fetchPlayerOrganizedMatches(profileId: string): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select(`${MATCH_BASE_FIELDS}, organizer:profiles!organizer_id(${PROFILE_FIELDS})`)
    .eq('organizer_id', profileId)
    .order('starts_at', { ascending: false })
    .limit(30);

  if (error || !data) return [];
  const ids = (data as Record<string, unknown>[]).map((r) => r.id as string);
  const playersByMatch = await fetchJoinedPlayersByMatchIds(ids);
  return (data as Record<string, unknown>[]).map((r) =>
    rowToMatch(r, playersByMatch[r.id as string] ?? []),
  );
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

  const pastJoined = joinedMatches.filter((m) => m.startsAt <= now || !!m.endedAt);
  const joinedMatchIds = new Set(pastJoined.map((m) => m.id));
  // Include organizer's ended/past created matches in "past" too so they can rate participants
  const pastCreatedOnly = createdMatches.filter(
    (m) => (m.startsAt <= now || !!m.endedAt) && !joinedMatchIds.has(m.id),
  );

  return {
    upcoming: joinedMatches.filter((m) => m.startsAt > now && !m.endedAt),
    past: [...pastJoined, ...pastCreatedOnly],
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
      optional_requirements: draft.extraRequirements.map((r) => r.trim()).filter(Boolean),
      organizer_id: organizerId,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return (data as { id: string }).id;
}

export async function joinMatch(
  matchId: string,
  userId: string,
  paymentMethod?: PaymentMethod,
  checkedRequirements: string[] = [],
): Promise<void> {
  const { error } = await supabase
    .from('match_participants')
    .insert({
      match_id: matchId,
      profile_id: userId,
      status: 'pending',
      ...(paymentMethod ? { payment_method: paymentMethod } : {}),
      checked_requirements: checkedRequirements,
    });
  if (error) {
    console.warn('[joinMatch] INSERT error:', error.message, error.code, error.details);
    // 23505 = already exists (unique constraint), ignore
    if (error.code !== '23505') throw new Error(error.message);
  }

  // Notify organizer
  try {
    const [matchRow, playerRow] = await Promise.all([
      supabase
        .from('matches')
        .select('organizer_id, sport, modality')
        .eq('id', matchId)
        .maybeSingle()
        .then((r) => r.data),
      supabase
        .from('profiles')
        .select('name')
        .eq('id', userId)
        .maybeSingle()
        .then((r) => r.data),
    ]);

    if (matchRow && playerRow) {
      const m = matchRow as { organizer_id: string; sport: string; modality: string };
      const playerName = (playerRow as { name: string }).name;
      const sportLabel = `${labelSport(m.sport as SportType)} ${labelModality(m.modality as Modality)}`;
      await supabase.from('notifications').insert({
        profile_id: m.organizer_id,
        kind: 'join_request',
        payload: {
          matchId,
          playerId: userId,
          playerName,
          paymentMethod: paymentMethod ?? null,
          sport: m.sport,
          modality: m.modality,
        },
      });
      void sendPushToUser(
        m.organizer_id,
        '¡Solicitud de unión!',
        `${playerName} quiere unirse a tu ${sportLabel}`,
        `/match/${matchId}`,
      );
    }
  } catch (e) {
    console.warn('[notifications] joinMatch notify error:', e);
  }
}

export type ParticipantStatus = 'pending' | 'joined' | 'left' | 'rejected' | null;

export async function fetchMyParticipantStatus(
  matchId: string,
  userId: string,
): Promise<ParticipantStatus> {
  const { data } = await supabase
    .from('match_participants')
    .select('status')
    .eq('match_id', matchId)
    .eq('profile_id', userId)
    .maybeSingle();
  return (data?.status as ParticipantStatus) ?? null;
}

export async function leaveMatch(matchId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('match_participants')
    .delete()
    .eq('match_id', matchId)
    .eq('profile_id', userId);
  if (error) throw new Error(error.message);
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

async function notifyParticipants(
  matchId: string,
  kind: string,
  extraPayload: Record<string, unknown> = {},
): Promise<void> {
  try {
    const [matchRes, partsRes] = await Promise.all([
      supabase.from('matches').select('sport, modality').eq('id', matchId).maybeSingle(),
      supabase
        .from('match_participants')
        .select('profile_id')
        .eq('match_id', matchId)
        .eq('status', 'joined'),
    ]);
    if (!matchRes.data || !partsRes.data?.length) return;
    const payload = {
      matchId,
      sport: matchRes.data.sport,
      modality: matchRes.data.modality,
      ...extraPayload,
    };
    await supabase.from('notifications').insert(
      partsRes.data.map((row: { profile_id: string }) => ({
        profile_id: row.profile_id,
        kind,
        payload,
      })),
    );
    const sportLabel = `${labelSport(matchRes.data.sport as SportType)} ${labelModality(matchRes.data.modality as Modality)}`;
    const pushTitle = kind === 'match_started' ? `¡Tu ${sportLabel} ha iniciado! ⚡` : `La ${sportLabel} finalizó 🏁`;
    const pushBody = kind === 'match_ended' ? '¡Califica a tus compañeros!' : '';
    const navigateTo = kind === 'match_ended' ? '/(tabs)/mis-partidas' : `/match/${matchId}`;
    await Promise.all(
      partsRes.data.map((row: { profile_id: string }) =>
        sendPushToUser(row.profile_id, pushTitle, pushBody, navigateTo),
      ),
    );
  } catch {
    // non-critical
  }
}

export async function startMatch(id: string): Promise<void> {
  const { error } = await supabase
    .from('matches')
    .update({ started_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
  void notifyParticipants(id, 'match_started');
}

export async function endMatch(id: string): Promise<void> {
  // Auto-approve any still-pending participants so they appear in joinedPlayers for rating
  await supabase
    .from('match_participants')
    .update({ status: 'joined' })
    .eq('match_id', id)
    .eq('status', 'pending');

  const { error } = await supabase
    .from('matches')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
  void notifyParticipants(id, 'match_ended');
}

export async function approveParticipant(matchId: string, profileId: string): Promise<void> {
  const { error } = await supabase
    .from('match_participants')
    .update({ status: 'joined' })
    .eq('match_id', matchId)
    .eq('profile_id', profileId);
  if (error) throw new Error(error.message);

  try {
    const { data: m } = await supabase
      .from('matches')
      .select('sport, modality')
      .eq('id', matchId)
      .maybeSingle();
    await supabase.from('notifications').insert({
      profile_id: profileId,
      kind: 'join_approved',
      payload: { matchId, sport: m?.sport, modality: m?.modality },
    });
    const sportLabel = m ? `${labelSport(m.sport as SportType)} ${labelModality(m.modality as Modality)}` : 'partida';
    void sendPushToUser(profileId, '¡Solicitud aprobada! ✅', `Ya eres parte de la ${sportLabel}`, `/match/${matchId}`);
  } catch {}
}

export async function rejectParticipant(matchId: string, profileId: string): Promise<void> {
  const { error } = await supabase
    .from('match_participants')
    .update({ status: 'rejected' })
    .eq('match_id', matchId)
    .eq('profile_id', profileId);
  if (error) throw new Error(error.message);

  try {
    const { data: m } = await supabase
      .from('matches')
      .select('sport, modality')
      .eq('id', matchId)
      .maybeSingle();
    await supabase.from('notifications').insert({
      profile_id: profileId,
      kind: 'join_rejected',
      payload: { matchId, sport: m?.sport, modality: m?.modality },
    });
    const sportLabel = m ? `${labelSport(m.sport as SportType)} ${labelModality(m.modality as Modality)}` : 'partida';
    void sendPushToUser(profileId, 'Solicitud no aceptada', `Tu solicitud para ${sportLabel} no fue aceptada`, `/match/${matchId}`);
  } catch {}
}

export async function inviteToMatch(
  matchId: string,
  inviteeId: string,
  organizerName: string,
  sport: string,
  modality: string,
): Promise<void> {
  await supabase.from('notifications').insert({
    profile_id: inviteeId,
    kind: 'match_invitation',
    payload: { matchId, organizerName, sport, modality },
  });
  const sportLabel = `${labelSport(sport as SportType)} ${labelModality(modality as Modality)}`;
  void sendPushToUser(inviteeId, '¡Te invitaron a jugar!', `${organizerName} te invitó a ${sportLabel}`, `/unirse/${matchId}`);
}

export async function cancelMatch(matchId: string): Promise<void> {
  // Notify participants before deleting (cascade would remove match_participants)
  try {
    const [matchRes, partsRes] = await Promise.all([
      supabase.from('matches').select('sport, modality').eq('id', matchId).maybeSingle(),
      supabase
        .from('match_participants')
        .select('profile_id')
        .eq('match_id', matchId)
        .eq('status', 'joined'),
    ]);
    if (matchRes.data && partsRes.data?.length) {
      const sportLabel = `${labelSport(matchRes.data.sport as SportType)} ${labelModality(matchRes.data.modality as Modality)}`;
      await supabase.from('notifications').insert(
        partsRes.data.map((row: { profile_id: string }) => ({
          profile_id: row.profile_id,
          kind: 'match_cancelled',
          payload: {
            matchId,
            sport: matchRes.data!.sport,
            modality: matchRes.data!.modality,
          },
        })),
      );
      await Promise.all(
        partsRes.data.map((row: { profile_id: string }) =>
          sendPushToUser(row.profile_id, 'Partida cancelada', `La ${sportLabel} fue cancelada`),
        ),
      );
    }
  } catch {
    // non-critical
  }
  const { error } = await supabase.from('matches').delete().eq('id', matchId);
  if (error) throw new Error(error.message);
}
