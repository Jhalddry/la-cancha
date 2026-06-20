import { supabase } from '@/lib/supabase';
import { sendPushToUser } from '@/lib/pushNotifications';

// Local reads cache — written immediately on markThreadRead so a pull-to-refresh
// that fires before the RPC commits to DB still sees the correct last_read_at.
const _localReads = new Map<string, string>(); // `${threadType}:${threadId}` → ISO

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
  replyTo?: { id: string; authorName: string; body: string; voiceUrl?: string };
  voiceUrl?: string;
  voiceDurationSec?: number;
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
  lastMessageAuthorId?: string;
  lastReadAt?: string;
  unreadCount: number;
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
  if (data) return { id: data.id as string, matchId: data.match_id as string };

  // Thread doesn't exist yet — create it (organizer entering chat before anyone joins)
  const { data: created, error } = await supabase
    .from('chat_threads')
    .insert({ match_id: matchId })
    .select('id, match_id')
    .single();
  if (error || !created) return null;
  return { id: created.id as string, matchId: created.match_id as string };
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

  if (matchRes.data?.organizer) add(matchRes.data.organizer as unknown as Record<string, unknown>);
  for (const row of partsRes.data ?? []) {
    if (row.player) add(row.player as unknown as Record<string, unknown>);
  }
  return result;
}

// ─── Messages ─────────────────────────────────────────────────────────────────

type MsgRow = { id: string; thread_id: string; author_id: string; body: string; sent_at: string; voice_url?: string | null; voice_duration_sec?: number | null; reply_to_id?: string | null };
type ProfileRow = { id: string; name: string; avatar_url: string | null };
type ReplyRow = { id: string; body: string; voice_url: string | null; author_id: string };

export async function fetchMessages(threadId: string): Promise<ChatMessageData[]> {
  // Try extended query (requires voice + reply_to_id migrations). Fall back to basic on error.
  const { data: extData, error: extErr } = await supabase
    .from('chat_messages')
    .select('id, thread_id, author_id, body, sent_at, voice_url, voice_duration_sec, reply_to_id')
    .eq('thread_id', threadId)
    .order('sent_at', { ascending: true })
    .limit(300);

  let rows: MsgRow[];
  if (!extErr && extData) {
    rows = extData as unknown as MsgRow[];
  } else {
    const { data: simple } = await supabase
      .from('chat_messages')
      .select('id, thread_id, author_id, body, sent_at')
      .eq('thread_id', threadId)
      .order('sent_at', { ascending: true })
      .limit(300);
    rows = (simple ?? []) as unknown as MsgRow[];
  }

  if (rows.length === 0) return [];

  // Batch-fetch all author profiles separately — avoids FK join ambiguity
  const authorIdSet = new Set(rows.map((r) => r.author_id));
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, avatar_url')
    .in('id', [...authorIdSet]);
  const profileMap = new Map<string, ProfileRow>(
    (profiles ?? []).map((p) => [p.id as string, p as ProfileRow]),
  );

  // Batch-fetch reply-to messages if any
  const replyIds = [...new Set(rows.filter((r) => r.reply_to_id).map((r) => r.reply_to_id as string))];
  const replyMap = new Map<string, ReplyRow>();
  if (replyIds.length > 0) {
    const { data: replyRows } = await supabase
      .from('chat_messages')
      .select('id, body, voice_url, author_id')
      .in('id', replyIds);
    for (const rr of (replyRows ?? []) as unknown as ReplyRow[]) {
      replyMap.set(rr.id, rr);
    }
    // Fetch any missing reply-author profiles
    const missingIds = [...new Set([...replyMap.values()].map((r) => r.author_id))].filter((id) => !profileMap.has(id));
    if (missingIds.length > 0) {
      const { data: mp } = await supabase.from('profiles').select('id, name, avatar_url').in('id', missingIds);
      for (const p of (mp ?? []) as unknown as ProfileRow[]) profileMap.set(p.id, p);
    }
  }

  return rows.map((r) => {
    const author = profileMap.get(r.author_id);
    const reply = r.reply_to_id ? replyMap.get(r.reply_to_id) : undefined;
    const replyAuthor = reply ? profileMap.get(reply.author_id) : undefined;
    return {
      id: r.id, threadId: r.thread_id, authorId: r.author_id,
      authorName: author?.name ?? 'Usuario',
      authorAvatarUrl: author?.avatar_url ?? undefined,
      body: r.body, sentAt: r.sent_at,
      voiceUrl: r.voice_url ?? undefined,
      voiceDurationSec: r.voice_duration_sec ?? undefined,
      replyTo: reply
        ? { id: reply.id, authorName: replyAuthor?.name ?? 'Usuario', body: reply.body, voiceUrl: reply.voice_url ?? undefined }
        : undefined,
    };
  });
}

export async function sendMessage(
  threadId: string,
  authorId: string,
  body: string,
  matchId?: string,
  replyToId?: string,
  voiceUrl?: string,
  voiceDurationSec?: number,
): Promise<void> {
  const payload: Record<string, unknown> = { thread_id: threadId, author_id: authorId, body };
  if (replyToId) payload.reply_to_id = replyToId;
  if (voiceUrl) { payload.voice_url = voiceUrl; payload.voice_duration_sec = voiceDurationSec ?? null; }
  const { error } = await supabase.from('chat_messages').insert(payload);
  if (error) throw new Error(error.message);

  // Fire-and-forget push to other participants
  void (async () => {
    try {
      let resolvedMatchId = matchId;
      if (!resolvedMatchId) {
        const { data: thread } = await supabase
          .from('chat_threads')
          .select('match_id')
          .eq('id', threadId)
          .maybeSingle();
        resolvedMatchId = thread?.match_id as string | undefined;
      }
      if (!resolvedMatchId) return;

      const [participants, { data: author }] = await Promise.all([
        fetchThreadParticipants(resolvedMatchId),
        supabase.from('profiles').select('name, avatar_url').eq('id', authorId).maybeSingle(),
      ]);
      const authorName = (author?.name as string | undefined) ?? 'Alguien';
      const authorAvatar = (author?.avatar_url as string | null | undefined) ?? undefined;
      const rawPreview = voiceUrl ? '🎤 Nota de voz' : body;
      const preview = rawPreview.length > 80 ? `${rawPreview.slice(0, 77)}…` : rawPreview;

      await Promise.all(
        participants
          .filter((p) => p.id !== authorId)
          .map((p) => sendPushToUser(p.id, `💬 ${authorName}`, preview, `/chat/${resolvedMatchId}`, authorAvatar)),
      );
    } catch {
      // push failures never block sending
    }
  })();
}

export async function uploadVoiceMessage(
  localUri: string,
  authorId: string,
): Promise<string> {
  const ext = localUri.split('.').pop() ?? 'm4a';
  const path = `${authorId}/${Date.now()}.${ext}`;
  const response = await fetch(localUri);
  const buffer = await response.arrayBuffer();
  const { error } = await supabase.storage
    .from('voice-messages')
    .upload(path, buffer, { contentType: `audio/${ext}`, upsert: false });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from('voice-messages').getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteMessage(messageId: string): Promise<void> {
  const { error } = await supabase
    .from('chat_messages')
    .delete()
    .eq('id', messageId);
  if (error) throw new Error(error.message);
}

export async function deletePrivateMessage(messageId: string): Promise<void> {
  const { error } = await supabase
    .from('private_messages')
    .delete()
    .eq('id', messageId);
  if (error) throw new Error(error.message);
}

export async function deleteThread(threadId: string): Promise<void> {
  // chat_messages has ON DELETE CASCADE — just delete the thread.
  const { error, count } = await supabase
    .from('chat_threads')
    .delete({ count: 'exact' })
    .eq('id', threadId);
  if (error) throw new Error(error.message);
  if (count === 0) throw new Error('No se pudo eliminar el chat (sin permisos).');
}

// ─── Shared match lookup (for "Enviar mensaje" from profile) ─────────────────

/**
 * Finds a matchId where both `userId` and `otherUserId` are participants
 * (either as organizer or as joined match_participant).
 * Returns null if no shared match exists.
 */
export async function fetchSharedMatchId(
  userId: string,
  otherUserId: string,
): Promise<string | null> {
  // Matches where the current user is a participant
  const { data: myParts } = await supabase
    .from('match_participants')
    .select('match_id')
    .eq('profile_id', userId)
    .eq('status', 'joined');

  // Matches where the current user is the organizer
  const { data: myOrganized } = await supabase
    .from('matches')
    .select('id')
    .eq('organizer_id', userId);

  const myMatchIds = new Set<string>([
    ...((myParts ?? []).map((r: { match_id: string }) => r.match_id)),
    ...((myOrganized ?? []).map((r: { id: string }) => r.id)),
  ]);

  if (myMatchIds.size === 0) return null;

  // Now find a match from that set where the other user is involved
  const ids = [...myMatchIds];

  // Check if other user is a participant in any of those matches
  const { data: otherParts } = await supabase
    .from('match_participants')
    .select('match_id')
    .eq('profile_id', otherUserId)
    .eq('status', 'joined')
    .in('match_id', ids);

  if (otherParts && otherParts.length > 0) {
    return (otherParts[0] as { match_id: string }).match_id;
  }

  // Check if other user is the organizer of any of those matches
  const { data: otherOrg } = await supabase
    .from('matches')
    .select('id')
    .eq('organizer_id', otherUserId)
    .in('id', ids);

  if (otherOrg && otherOrg.length > 0) {
    return (otherOrg[0] as { id: string }).id;
  }

  return null;
}

// ─── Private DM types ────────────────────────────────────────────────────────

export interface PrivateThreadData {
  id: string;
  otherUser: ChatParticipant;
  lastMessage?: string;
  lastMessageAt?: string;
  lastMessageAuthorId?: string;
  lastReadAt?: string;
  unreadCount: number;
}

// ─── Private DM API ──────────────────────────────────────────────────────────

// ─── Read receipts ────────────────────────────────────────────────────────────

export async function markThreadRead(
  threadType: 'match' | 'private',
  threadId: string,
  userId: string,
): Promise<void> {
  // Record locally before the async DB write so pull-to-refresh sees this immediately
  _localReads.set(`${threadType}:${threadId}`, new Date().toISOString());

  // Try RPC first (server-side NOW() avoids clock skew).
  const { error: rpcErr } = await supabase.rpc('mark_thread_read', {
    p_thread_type: threadType,
    p_thread_id: threadId,
  });
  if (rpcErr) {
    console.warn('[chat] mark_thread_read RPC error:', rpcErr.message, { threadType, threadId });
  }
  // Always upsert as belt-and-suspenders: RPC can silently no-op if the
  // migration hasn't run, causing badge to restore on refresh or cold start.
  const { error: upsertErr } = await supabase
    .from('chat_reads')
    .upsert(
      { thread_type: threadType, thread_id: threadId, user_id: userId, last_read_at: new Date().toISOString() },
      { onConflict: 'thread_type,thread_id,user_id' },
    );
  if (upsertErr) console.warn('[chat] chat_reads upsert error:', upsertErr.message);
}

/** Latest last_read_at among OTHER users in a thread (for read receipts).
 *  Uses SECURITY DEFINER RPC to bypass RLS — the direct SELECT would be
 *  filtered to own rows only by the "chat_reads: own write" FOR ALL policy. */
export async function fetchOthersLastReadAt(
  threadType: 'match' | 'private',
  threadId: string,
  _myId: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_others_last_read_at', {
    p_thread_type: threadType,
    p_thread_id: threadId,
  });
  if (error) {
    console.warn('[chat] get_others_last_read_at error:', error.message, { threadType, threadId });
    return null;
  }
  return (data as string | null) ?? null;
}

/** Find or create a private thread between two users. Always stores user1_id < user2_id. */
export async function fetchOrCreatePrivateThread(
  myId: string,
  otherId: string,
): Promise<string | null> {
  const [u1, u2] = myId < otherId ? [myId, otherId] : [otherId, myId];

  const { data: existing } = await supabase
    .from('private_threads')
    .select('id')
    .eq('user1_id', u1)
    .eq('user2_id', u2)
    .maybeSingle();

  if (existing) return (existing as { id: string }).id;

  const { data: created, error } = await supabase
    .from('private_threads')
    .insert({ user1_id: u1, user2_id: u2 })
    .select('id')
    .maybeSingle();

  if (error || !created) {
    console.error('[chatApi] fetchOrCreatePrivateThread error:', error?.message);
    return null;
  }
  return (created as { id: string }).id;
}

export async function fetchPrivateMessages(threadId: string): Promise<ChatMessageData[]> {
  // Try extended query (requires voice + reply migrations)
  const { data, error } = await supabase
    .from('private_messages')
    .select(`id, thread_id, author_id, body, sent_at, voice_url, voice_duration_sec, reply_to:private_messages!reply_to_id(id, body, voice_url, author_id)`)
    .eq('thread_id', threadId)
    .order('sent_at', { ascending: true })
    .limit(300);

  // Determine rows to use — fall back to simple query if extended fails
  let simpleRows: { id: string; thread_id: string; author_id: string; body: string; sent_at: string }[] | null = null;
  if (error) {
    const { data: simple } = await supabase
      .from('private_messages')
      .select('id, thread_id, author_id, body, sent_at')
      .eq('thread_id', threadId)
      .order('sent_at', { ascending: true })
      .limit(300);
    simpleRows = simple as typeof simpleRows;
  }

  const baseRows = (error ? simpleRows : data) as { id: string; thread_id: string; author_id: string; body: string; sent_at: string }[] | null;
  if (!baseRows) return [];

  const allAuthorIds = new Set(baseRows.map((r) => r.author_id));
  const { data: profiles } = await supabase.from('profiles').select('id, name, avatar_url').in('id', [...allAuthorIds]);
  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id as string, p as { id: string; name: string; avatar_url: string | null }]),
  );

  if (error) {
    return baseRows.map((row) => {
      const author = profileMap.get(row.author_id);
      return { id: row.id, threadId: row.thread_id, authorId: row.author_id, authorName: author?.name ?? 'Usuario', authorAvatarUrl: author?.avatar_url ?? undefined, body: row.body, sentAt: row.sent_at };
    });
  }

  const rows = (data as unknown as {
    id: string; thread_id: string; author_id: string; body: string; sent_at: string;
    voice_url: string | null; voice_duration_sec: number | null;
    reply_to: { id: string; body: string; voice_url: string | null; author_id: string } | null;
  }[]);

  for (const r of rows) if (r.reply_to) allAuthorIds.add(r.reply_to.author_id);
  if (allAuthorIds.size > profileMap.size) {
    const extra = [...allAuthorIds].filter((id) => !profileMap.has(id));
    const { data: ep } = await supabase.from('profiles').select('id, name, avatar_url').in('id', extra);
    for (const p of ep ?? []) profileMap.set(p.id as string, p as { id: string; name: string; avatar_url: string | null });
  }

  return rows.map((row) => {
    const author = profileMap.get(row.author_id);
    const replyAuthor = row.reply_to ? profileMap.get(row.reply_to.author_id) : undefined;
    return {
      id: row.id, threadId: row.thread_id, authorId: row.author_id,
      authorName: author?.name ?? 'Usuario', authorAvatarUrl: author?.avatar_url ?? undefined,
      body: row.body, sentAt: row.sent_at,
      voiceUrl: row.voice_url ?? undefined, voiceDurationSec: row.voice_duration_sec ?? undefined,
      replyTo: row.reply_to?.id
        ? { id: row.reply_to.id, authorName: replyAuthor?.name ?? 'Usuario', body: row.reply_to.body, voiceUrl: row.reply_to.voice_url ?? undefined }
        : undefined,
    };
  });
}

export async function sendPrivateMessage(
  threadId: string,
  authorId: string,
  body: string,
  replyToId?: string,
  voiceUrl?: string,
  voiceDurationSec?: number,
): Promise<void> {
  const payload: Record<string, unknown> = { thread_id: threadId, author_id: authorId, body };
  if (replyToId) payload.reply_to_id = replyToId;
  if (voiceUrl) { payload.voice_url = voiceUrl; payload.voice_duration_sec = voiceDurationSec ?? null; }
  const { error } = await supabase.from('private_messages').insert(payload);
  if (error) throw new Error(error.message);

  void supabase
    .from('private_threads')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', threadId);

  // Fire-and-forget push to the other user
  void (async () => {
    try {
      const [threadResult, authorResult] = await Promise.all([
        supabase.from('private_threads').select('user1_id, user2_id').eq('id', threadId).maybeSingle(),
        supabase.from('profiles').select('name, avatar_url').eq('id', authorId).maybeSingle(),
      ]);
      if (!threadResult.data) return;
      const t = threadResult.data as { user1_id: string; user2_id: string };
      const otherId = t.user1_id === authorId ? t.user2_id : t.user1_id;
      const authorName = (authorResult.data?.name as string | undefined) ?? 'Alguien';
      const authorAvatar = (authorResult.data?.avatar_url as string | null | undefined) ?? undefined;
      const rawPreview = voiceUrl ? '🎤 Nota de voz' : body;
      const preview = rawPreview.length > 80 ? `${rawPreview.slice(0, 77)}…` : rawPreview;

      await sendPushToUser(otherId, `💬 ${authorName}`, preview, `/direct/${authorId}`, authorAvatar);
    } catch {
      // push failures never block sending
    }
  })();
}

export async function fetchMyPrivateThreads(userId: string): Promise<PrivateThreadData[]> {
  const { data: threadRows, error } = await supabase
    .from('private_threads')
    .select('id, user1_id, user2_id, updated_at')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error || !threadRows || threadRows.length === 0) return [];

  const typedRows = threadRows as { id: string; user1_id: string; user2_id: string; updated_at: string }[];
  const otherIds = typedRows.map((r) => (r.user1_id === userId ? r.user2_id : r.user1_id));

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, avatar_url')
    .in('id', [...new Set(otherIds)]);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [
      p.id as string,
      p as { id: string; name: string; avatar_url: string | null },
    ]),
  );

  const threadIds = typedRows.map((r) => r.id);

  // Read receipts for current user
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  const currentUserId = currentUser?.id;
  let readsMap = new Map<string, string>();
  if (currentUserId && threadIds.length > 0) {
    const { data: reads } = await supabase
      .from('chat_reads')
      .select('thread_id, last_read_at')
      .eq('user_id', currentUserId)
      .eq('thread_type', 'private')
      .in('thread_id', threadIds);
    readsMap = new Map(
      (reads ?? []).map((r: { thread_id: string; last_read_at: string }) => [r.thread_id, r.last_read_at]),
    );
  }
  if (!currentUserId) return [];

  const { data: allMsgs } = await supabase
    .from('private_messages')
    .select('thread_id, body, sent_at, author_id')
    .in('thread_id', threadIds)
    .order('sent_at', { ascending: false });

  const lastMsgMap = new Map<string, { body: string; sentAt: string; authorId: string }>();
  for (const msg of allMsgs ?? []) {
    const m = msg as { thread_id: string; body: string; sent_at: string; author_id: string };
    if (!lastMsgMap.has(m.thread_id)) {
      lastMsgMap.set(m.thread_id, { body: m.body, sentAt: m.sent_at, authorId: m.author_id });
    }
  }

  const localPrivateReads = new Map<string, string>();
  for (const [k, v] of _localReads) {
    if (k.startsWith('private:')) localPrivateReads.set(k.slice('private:'.length), v);
  }
  const unreadByThread = buildUnreadMap(
    (allMsgs ?? []) as { thread_id: string; sent_at: string; author_id: string }[],
    readsMap,
    localPrivateReads,
    currentUserId,
  );

  return typedRows.map((r) => {
    const otherId = r.user1_id === userId ? r.user2_id : r.user1_id;
    const other = profileMap.get(otherId);
    const lastMsg = lastMsgMap.get(r.id);
    return {
      id: r.id,
      otherUser: {
        id: otherId,
        name: other?.name ?? 'Usuario',
        avatarUrl: other?.avatar_url ?? undefined,
      },
      lastMessage: lastMsg?.body,
      lastMessageAt: lastMsg?.sentAt ?? r.updated_at,
      lastMessageAuthorId: lastMsg?.authorId,
      lastReadAt: readsMap.get(r.id),
      unreadCount: unreadByThread.get(r.id) ?? 0,
    };
  });
}

// ─── Shared unread counting helper ───────────────────────────────────────────

function buildUnreadMap(
  msgs: { thread_id: string; sent_at: string; author_id: string }[],
  serverReadsMap: Map<string, string>,
  localReadsMap: Map<string, string>,
  currentUserId: string,
): Map<string, number> {
  const unreadByThread = new Map<string, number>();
  for (const m of msgs) {
    if (m.author_id === currentUserId) continue;
    const s = serverReadsMap.get(m.thread_id);
    const l = localReadsMap.get(m.thread_id);
    // Use whichever timestamp is more recent
    const readAt = s && l ? (new Date(s) >= new Date(l) ? s : l) : s ?? l;
    if (!readAt || new Date(m.sent_at) > new Date(readAt)) {
      unreadByThread.set(m.thread_id, (unreadByThread.get(m.thread_id) ?? 0) + 1);
    }
  }
  return unreadByThread;
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

  // Read receipts for current user
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  const currentUserId = currentUser?.id;
  let readsMap = new Map<string, string>();
  if (currentUserId && threadIds.length > 0) {
    const { data: reads } = await supabase
      .from('chat_reads')
      .select('thread_id, last_read_at')
      .eq('user_id', currentUserId)
      .eq('thread_type', 'match')
      .in('thread_id', threadIds);
    readsMap = new Map(
      (reads ?? []).map((r: { thread_id: string; last_read_at: string }) => [r.thread_id, r.last_read_at]),
    );
  }
  if (!currentUserId) return [];

  // Last message per thread (batch)
  const { data: allMsgs } = await supabase
    .from('chat_messages')
    .select('thread_id, body, sent_at, author_id')
    .in('thread_id', threadIds)
    .order('sent_at', { ascending: false });

  const lastMsgByThread = new Map<string, { body: string; sentAt: string; authorId: string }>();
  for (const msg of allMsgs ?? []) {
    const m = msg as unknown as { thread_id: string; body: string; sent_at: string; author_id: string };
    if (!lastMsgByThread.has(m.thread_id)) {
      lastMsgByThread.set(m.thread_id, { body: m.body, sentAt: m.sent_at, authorId: m.author_id });
    }
  }

  const localMatchReads = new Map<string, string>();
  for (const [k, v] of _localReads) {
    if (k.startsWith('match:')) localMatchReads.set(k.slice('match:'.length), v);
  }
  const unreadByThread = buildUnreadMap(
    (allMsgs ?? []) as { thread_id: string; sent_at: string; author_id: string }[],
    readsMap,
    localMatchReads,
    currentUserId,
  );

  // Participants per match: joined players + organizers (batch)
  const { data: partRows } = await supabase
    .from('match_participants')
    .select(`match_id, player:profiles!profile_id(id, name, avatar_url)`)
    .in('match_id', matchIds)
    .eq('status', 'joined');

  // Fetch organizers so they appear in the participants list
  const { data: orgRows } = await supabase
    .from('matches')
    .select(`id, organizer:profiles!organizer_id(id, name, avatar_url)`)
    .in('id', matchIds);

  const partsByMatch = new Map<string, ChatParticipant[]>();

  const addParticipant = (matchId: string, profile: { id: string; name: string; avatar_url: string | null } | null) => {
    if (!profile) return;
    if (!partsByMatch.has(matchId)) partsByMatch.set(matchId, []);
    const list = partsByMatch.get(matchId)!;
    if (!list.some((p) => p.id === profile.id)) {
      list.push({ id: profile.id, name: profile.name, avatarUrl: profile.avatar_url ?? undefined });
    }
  };

  for (const row of orgRows ?? []) {
    const r = row as unknown as { id: string; organizer: { id: string; name: string; avatar_url: string | null } | null };
    addParticipant(r.id, r.organizer);
  }
  for (const row of partRows ?? []) {
    const r = row as unknown as { match_id: string; player: { id: string; name: string; avatar_url: string | null } | null };
    addParticipant(r.match_id, r.player);
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
      lastMessageAuthorId: lastMsg?.authorId,
      lastReadAt: readsMap.get(r.id),
      unreadCount: unreadByThread.get(r.id) ?? 0,
    };
  });
}
