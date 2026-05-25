import { supabase } from '@/lib/supabase';

const MINI_PROFILE = 'id, name, avatar_url';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessageData {
  id: string;
  threadId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  body: string;
  sentAt: string;
}

export interface ChatParticipant {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface ChatThreadData {
  id: string;
  matchId: string;
  sport: string;
  modality: string;
  locationName: string;
  participants: ChatParticipant[];
  lastMessage?: string;
  lastMessageAt?: string;
}

// ─── Thread ───────────────────────────────────────────────────────────────────

export async function fetchThreadByMatchId(
  matchId: string,
): Promise<{ id: string; matchId: string } | null> {
  const { data } = await supabase
    .from('chat_threads')
    .select('id, match_id')
    .eq('match_id', matchId)
    .maybeSingle();
  if (!data) return null;
  return { id: data.id as string, matchId: data.match_id as string };
}

export async function fetchThreadParticipants(matchId: string): Promise<ChatParticipant[]> {
  const [matchRes, partsRes] = await Promise.all([
    supabase
      .from('matches')
      .select(`organizer:profiles!organizer_id(${MINI_PROFILE})`)
      .eq('id', matchId)
      .maybeSingle(),
    supabase
      .from('match_participants')
      .select(`player:profiles!profile_id(${MINI_PROFILE})`)
      .eq('match_id', matchId)
      .eq('status', 'joined'),
  ]);

  const seen = new Set<string>();
  const result: ChatParticipant[] = [];

  const add = (raw: Record<string, unknown> | null) => {
    if (!raw || seen.has(raw.id as string)) return;
    seen.add(raw.id as string);
    result.push({
      id: raw.id as string,
      name: raw.name as string,
      avatarUrl: (raw.avatar_url as string | null) ?? undefined,
    });
  };

  if (matchRes.data?.organizer) add(matchRes.data.organizer as Record<string, unknown>);
  for (const row of partsRes.data ?? []) {
    if (row.player) add(row.player as Record<string, unknown>);
  }
  return result;
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function fetchMessages(threadId: string): Promise<ChatMessageData[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select(`id, thread_id, author_id, body, sent_at, author:profiles!author_id(name, avatar_url)`)
    .eq('thread_id', threadId)
    .order('sent_at', { ascending: true })
    .limit(300);

  if (error || !data) return [];

  return data.map((row) => {
    const r = row as unknown as {
      id: string;
      thread_id: string;
      author_id: string;
      body: string;
      sent_at: string;
      author: { name: string; avatar_url: string | null } | null;
    };
    return {
      id: r.id,
      threadId: r.thread_id,
      authorId: r.author_id,
      authorName: r.author?.name ?? 'Usuario',
      authorAvatarUrl: r.author?.avatar_url ?? undefined,
      body: r.body,
      sentAt: r.sent_at,
    };
  });
}

export async function sendMessage(
  threadId: string,
  authorId: string,
  body: string,
): Promise<void> {
  const { error } = await supabase
    .from('chat_messages')
    .insert({ thread_id: threadId, author_id: authorId, body });
  if (error) throw new Error(error.message);
}

// ─── Thread list (chats tab) ──────────────────────────────────────────────────

export async function fetchMyThreads(): Promise<ChatThreadData[]> {
  // RLS on chat_threads already filters to threads the current user can access
  const { data: threadRows } = await supabase
    .from('chat_threads')
    .select(
      `id, match_id, updated_at,
       match:matches!match_id(sport, modality, location_name)`,
    )
    .order('updated_at', { ascending: false })
    .limit(50);

  if (!threadRows || threadRows.length === 0) return [];

  const threadIds = threadRows.map((r) => r.id as string);
  const matchIds = threadRows.map((r) => r.match_id as string);

  // Last message per thread (batch)
  const { data: allMsgs } = await supabase
    .from('chat_messages')
    .select('thread_id, body, sent_at')
    .in('thread_id', threadIds)
    .order('sent_at', { ascending: false });

  const lastMsgByThread = new Map<string, { body: string; sentAt: string }>();
  for (const msg of allMsgs ?? []) {
    const m = msg as unknown as { thread_id: string; body: string; sent_at: string };
    if (!lastMsgByThread.has(m.thread_id)) {
      lastMsgByThread.set(m.thread_id, { body: m.body, sentAt: m.sent_at });
    }
  }

  // Participants per match (batch)
  const { data: partRows } = await supabase
    .from('match_participants')
    .select(`match_id, player:profiles!profile_id(id, name, avatar_url)`)
    .in('match_id', matchIds)
    .eq('status', 'joined');

  const partsByMatch = new Map<string, ChatParticipant[]>();
  for (const row of partRows ?? []) {
    const r = row as unknown as {
      match_id: string;
      player: { id: string; name: string; avatar_url: string | null } | null;
    };
    if (!r.player) continue;
    const p: ChatParticipant = {
      id: r.player.id,
      name: r.player.name,
      avatarUrl: r.player.avatar_url ?? undefined,
    };
    if (!partsByMatch.has(r.match_id)) partsByMatch.set(r.match_id, []);
    partsByMatch.get(r.match_id)!.push(p);
  }

  return threadRows.map((row) => {
    const r = row as unknown as {
      id: string;
      match_id: string;
      updated_at: string;
      match: { sport: string; modality: string; location_name: string } | null;
    };
    const lastMsg = lastMsgByThread.get(r.id);
    return {
      id: r.id,
      matchId: r.match_id,
      sport: r.match?.sport ?? '',
      modality: r.match?.modality ?? '',
      locationName: r.match?.location_name ?? '',
      participants: partsByMatch.get(r.match_id) ?? [],
      lastMessage: lastMsg?.body,
      lastMessageAt: lastMsg?.sentAt ?? r.updated_at,
    };
  });
}
