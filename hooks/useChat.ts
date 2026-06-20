import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

import {
  deleteMessage,
  deletePrivateMessage,
  deleteThread,
  fetchMessages,
  fetchMyPrivateThreads,
  fetchMyThreads,
  fetchOrCreatePrivateThread,
  fetchOthersLastReadAt,
  fetchPrivateMessages,
  fetchThreadByMatchId,
  fetchThreadParticipants,
  markThreadRead,
  sendMessage,
  sendPrivateMessage,
  uploadVoiceMessage,
  type ChatMessageData,
  type ChatParticipant,
  type ChatThreadData,
  type PrivateThreadData,
} from '@/lib/chatApi';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/store/session';

// ─── Thread list (chats tab) ──────────────────────────────────────────────────

export function useMyThreads() {
  return useQuery({
    queryKey: ['chat-threads'],
    queryFn: fetchMyThreads,
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
}

// ─── Single match chat ────────────────────────────────────────────────────────

export function useChat(matchId: string | undefined) {
  const userId = useSession((s) => s.user?.id);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [participants, setParticipants] = useState<Map<string, ChatParticipant>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [othersReadAt, setOthersReadAt] = useState<string | null>(null);
  const [othersTyping, setOthersTyping] = useState<string[]>([]);

  // Keep a stable ref so the realtime callback always has fresh participant data
  const participantsRef = useRef(participants);
  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  // Typing broadcast channel refs
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load thread + messages + participants
  useEffect(() => {
    if (!matchId) return;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const thread = await fetchThreadByMatchId(matchId);
        if (!thread) {
          setError('No se encontró el chat de esta partida.');
          setLoading(false);
          return;
        }
        setThreadId(thread.id);

        const [msgs, parts] = await Promise.all([
          fetchMessages(thread.id),
          fetchThreadParticipants(matchId),
        ]);

        const map = new Map<string, ChatParticipant>();
        for (const p of parts) map.set(p.id, p);
        setParticipants(map);

        // Patch any "Usuario" fallback names with real participant data
        const patchedMsgs = msgs.map((m) => {
          if (m.authorName !== 'Usuario') return m;
          const p = map.get(m.authorId);
          return p ? { ...m, authorName: p.name, authorAvatarUrl: p.avatarUrl } : m;
        });
        setMessages(patchedMsgs);
      } catch {
        setError('Error al cargar el chat.');
      } finally {
        setLoading(false);
      }
    })();
  }, [matchId]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!threadId) return;

    // Unique suffix prevents "already subscribed" error in React StrictMode
    // (double-invocation runs cleanup async, second run hits same channel name)
    const uid = Math.random().toString(36).slice(2);
    const channel = supabase
      .channel(`chat-messages:${threadId}:${uid}`)
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_messages',
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const deletedId = (payload.old as Record<string, unknown>).id as string;
          setMessages((prev) => prev.filter((m) => m.id !== deletedId));
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const authorId = row.author_id as string;
          const authorInfo = participantsRef.current.get(authorId);

          const addMsg = (name: string, avatarUrl?: string) => {
            const newMsg: ChatMessageData = {
              id: row.id as string,
              threadId: row.thread_id as string,
              authorId,
              authorName: name,
              authorAvatarUrl: avatarUrl,
              body: row.body as string,
              sentAt: row.sent_at as string,
              voiceUrl: (row.voice_url as string | null | undefined) ?? undefined,
              voiceDurationSec: (row.voice_duration_sec as number | null | undefined) ?? undefined,
            };
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              if (authorId === userId) {
                let lastOptIdx = -1;
                for (let i = prev.length - 1; i >= 0; i--) {
                  if (prev[i].id.startsWith('opt_') && prev[i].body === newMsg.body) { lastOptIdx = i; break; }
                }
                if (lastOptIdx !== -1) { const next = [...prev]; next[lastOptIdx] = newMsg; return next; }
              }
              return [...prev, newMsg];
            });
          };

          if (authorInfo) {
            addMsg(authorInfo.name, authorInfo.avatarUrl);
          } else {
            // Author not in participants cache — fetch profile then add
            void supabase.from('profiles').select('id, name, avatar_url').eq('id', authorId).maybeSingle()
              .then(({ data }) => {
                const name = (data?.name as string | null | undefined) ?? 'Usuario';
                const avatarUrl = (data?.avatar_url as string | null | undefined) ?? undefined;
                if (data) {
                  const p: ChatParticipant = { id: authorId, name, avatarUrl };
                  setParticipants((prev) => new Map(prev).set(authorId, p));
                }
                addMsg(name, avatarUrl);
              });
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [threadId, userId]);

  // Read receipts: others' last_read_at + realtime updates + 5s poll fallback
  useEffect(() => {
    if (!threadId || !userId) return;

    const fetchLatest = () => {
      void fetchOthersLastReadAt('match', threadId, userId).then(setOthersReadAt);
    };
    fetchLatest();
    const poll = setInterval(fetchLatest, 5_000);

    const uid2 = Math.random().toString(36).slice(2);
    const channel = supabase
      .channel(`chat-reads:${threadId}:${uid2}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_reads', filter: `thread_id=eq.${threadId}` },
        (payload) => {
          const row = payload.new as { user_id?: string; last_read_at?: string };
          if (!row?.user_id || row.user_id === userId || !row.last_read_at) return;
          setOthersReadAt((prev) =>
            !prev || new Date(row.last_read_at!) > new Date(prev) ? row.last_read_at! : prev,
          );
        },
      )
      .subscribe();

    return () => {
      clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [threadId, userId]);

  // Typing broadcast channel
  useEffect(() => {
    if (!threadId || !userId) return;
    const ch = supabase
      .channel(`typing:${threadId}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const p = payload as { userId: string; name: string; typing: boolean };
        if (p.userId === userId) return;
        setOthersTyping((prev) => {
          if (p.typing && !prev.includes(p.name)) return [...prev, p.name];
          if (!p.typing) return prev.filter((n) => n !== p.name);
          return prev;
        });
        if (p.typing) {
          setTimeout(() => setOthersTyping((cur) => cur.filter((n) => n !== p.name)), 4000);
        }
      })
      .subscribe();
    typingChannelRef.current = ch;
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      void supabase.removeChannel(ch);
      typingChannelRef.current = null;
      setOthersTyping([]);
    };
  }, [threadId, userId]);

  const sendTyping = useCallback(() => {
    const ch = typingChannelRef.current;
    if (!ch || !userId) return;
    const me = participantsRef.current.get(userId);
    const myName = me?.name ?? 'Usuario';
    void ch.send({ type: 'broadcast', event: 'typing', payload: { userId, name: myName, typing: true } });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      void ch.send({ type: 'broadcast', event: 'typing', payload: { userId, name: myName, typing: false } });
    }, 3000);
  }, [userId]);

  const send = async (
    body: string,
    opts?: { replyToId?: string; voiceLocalUri?: string; voiceDurationSec?: number },
  ) => {
    if (!threadId || !userId) return;
    const trimmed = body.trim();
    if (!trimmed && !opts?.voiceLocalUri) return;

    const optimisticId = `opt_${Date.now()}`;
    const me = participantsRef.current.get(userId);

    setMessages((prev) => [
      ...prev,
      {
        id: optimisticId,
        threadId,
        authorId: userId,
        authorName: me?.name ?? 'Tú',
        authorAvatarUrl: me?.avatarUrl,
        body: trimmed || '[Nota de voz]',
        voiceUrl: opts?.voiceLocalUri,
        voiceDurationSec: opts?.voiceDurationSec,
        sentAt: new Date().toISOString(),
      },
    ]);

    // Upload failure must not remove the optimistic — fall back to text-only send
    let uploadedVoiceUrl: string | undefined;
    if (opts?.voiceLocalUri) {
      try { uploadedVoiceUrl = await uploadVoiceMessage(opts.voiceLocalUri, userId); } catch (e) { console.warn('[voice] upload failed', e); }
    }
    try {
      await sendMessage(
        threadId, userId, trimmed || '[Nota de voz]', matchId,
        opts?.replyToId, uploadedVoiceUrl, opts?.voiceDurationSec,
      );
      await queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
      queryClient.setQueryData<ChatThreadData[]>(['chat-threads'], (old) =>
        old?.map((t) => (t.id === threadId ? { ...t, unreadCount: 0 } : t)) ?? old,
      );
    } catch {
      // If send with voice fields fails (columns not yet migrated), retry as plain text
      try {
        await sendMessage(threadId, userId, trimmed || '[Nota de voz]', matchId, opts?.replyToId);
        await queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      }
    }
  };

  const removeMessages = (ids: string[]) => {
    const idSet = new Set(ids);
    setMessages((prev) => prev.filter((m) => !idSet.has(m.id)));
  };

  return { messages, participants, loading, error, send, removeMessages, threadId, othersReadAt, othersTyping, sendTyping };
}

// ─── Private DM hooks ────────────────────────────────────────────────────────

export function useMyPrivateThreads() {
  const userId = useSession((s) => s.user?.id);
  return useQuery({
    queryKey: ['private-threads', userId ?? ''],
    queryFn: () => fetchMyPrivateThreads(userId!),
    enabled: !!userId,
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
}

export function useUnreadChatCount(): number {
  const userId = useSession((s) => s.user?.id);
  const { data: threads } = useMyThreads();
  const { data: privateThreads } = useMyPrivateThreads();

  if (!userId) return 0;

  const matchUnread = (threads ?? []).reduce((sum, t) => sum + t.unreadCount, 0);
  const privateUnread = (privateThreads ?? []).reduce((sum, t) => sum + t.unreadCount, 0);
  return matchUnread + privateUnread;
}

export function useMarkThreadRead() {
  const userId = useSession((s) => s.user?.id);
  const queryClient = useQueryClient();
  return useCallback(
    (threadType: 'match' | 'private', threadId: string) => {
      if (!userId) return;

      // Optimistic: zero immediately. Do NOT invalidateQueries afterwards — that would
      // trigger an immediate refetch that races the DB write and restore the old count.
      // The background refetchInterval (60s) will sync the true state.
      if (threadType === 'match') {
        queryClient.setQueryData<ChatThreadData[]>(['chat-threads'], (old) =>
          old?.map((t) => (t.id === threadId ? { ...t, unreadCount: 0 } : t)) ?? old,
        );
      } else {
        queryClient.setQueryData<PrivateThreadData[]>(['private-threads', userId], (old) =>
          old?.map((t) => (t.id === threadId ? { ...t, unreadCount: 0 } : t)) ?? old,
        );
      }

      void markThreadRead(threadType, threadId, userId);
    },
    [userId, queryClient],
  );
}

export function usePrivateChat(otherId: string | undefined) {
  const userId = useSession((s) => s.user?.id);
  const user = useSession((s) => s.user);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [othersReadAt, setOthersReadAt] = useState<string | null>(null);
  const [othersTyping, setOthersTyping] = useState<string[]>([]);

  const pmTypingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pmTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const otherUserRef = useRef<{ name: string; avatarUrl?: string } | null>(null);

  // Fetch other user's profile so realtime messages can show their name
  useEffect(() => {
    if (!otherId) return;
    void supabase.from('profiles').select('name, avatar_url').eq('id', otherId).maybeSingle()
      .then(({ data }) => {
        if (data) otherUserRef.current = { name: data.name as string, avatarUrl: (data.avatar_url as string | null) ?? undefined };
      });
  }, [otherId]);

  useEffect(() => {
    if (!userId || !otherId) return;
    setLoading(true);
    void (async () => {
      try {
        const tid = await fetchOrCreatePrivateThread(userId, otherId);
        if (!tid) { setError('No se pudo abrir el chat.'); setLoading(false); return; }
        setThreadId(tid);
        void queryClient.invalidateQueries({ queryKey: ['private-threads', userId] });
        const msgs = await fetchPrivateMessages(tid);
        // Patch "Usuario" names using the other user's profile (may already be in ref)
        const other = otherUserRef.current;
        const patchedMsgs = other
          ? msgs.map((m) =>
              m.authorName === 'Usuario' && m.authorId === otherId
                ? { ...m, authorName: other.name, authorAvatarUrl: other.avatarUrl }
                : m,
            )
          : msgs;
        setMessages(patchedMsgs);
      } catch { setError('Error al cargar el chat.'); }
      finally { setLoading(false); }
    })();
  }, [userId, otherId]);

  // Realtime for private messages
  useEffect(() => {
    if (!threadId) return;
    const uid = Math.random().toString(36).slice(2);
    const channel = supabase
      .channel(`pm:${threadId}:${uid}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'private_messages', filter: `thread_id=eq.${threadId}` },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const authorId = row.author_id as string;
          const isMe = authorId === userId;
          const authorName = isMe ? (user?.name ?? 'Tú') : (otherUserRef.current?.name ?? 'Usuario');
          const authorAvatarUrl = isMe ? undefined : otherUserRef.current?.avatarUrl;

          const addMsg = (name: string, avatar?: string) => {
            const newMsg: ChatMessageData = {
              id: row.id as string, threadId: row.thread_id as string, authorId,
              authorName: name, authorAvatarUrl: avatar, body: row.body as string, sentAt: row.sent_at as string,
              voiceUrl: (row.voice_url as string | null | undefined) ?? undefined,
              voiceDurationSec: (row.voice_duration_sec as number | null | undefined) ?? undefined,
            };
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              if (isMe) {
                let idx = -1;
                for (let i = prev.length - 1; i >= 0; i--) {
                  if (prev[i].id.startsWith('opt_') && prev[i].body === newMsg.body) { idx = i; break; }
                }
                if (idx !== -1) { const next = [...prev]; next[idx] = newMsg; return next; }
              }
              return [...prev, newMsg];
            });
          };

          if (!isMe && !otherUserRef.current) {
            // Profile not yet loaded — fetch it then add message
            void supabase.from('profiles').select('name, avatar_url').eq('id', authorId).maybeSingle()
              .then(({ data }) => {
                const name = (data?.name as string | null | undefined) ?? 'Usuario';
                const avatar = (data?.avatar_url as string | null | undefined) ?? undefined;
                otherUserRef.current = { name, avatarUrl: avatar };
                addMsg(name, avatar);
              });
          } else {
            addMsg(authorName, authorAvatarUrl);
          }
        })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [threadId, userId, user?.name]);

  // Read receipts: others' last_read_at + realtime + 5s poll
  useEffect(() => {
    if (!threadId || !userId) return;

    const fetchLatest = () => {
      void fetchOthersLastReadAt('private', threadId, userId).then(setOthersReadAt);
    };
    fetchLatest();
    const poll = setInterval(fetchLatest, 5_000);

    const uid2 = Math.random().toString(36).slice(2);
    const channel = supabase
      .channel(`pm-reads:${threadId}:${uid2}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_reads', filter: `thread_id=eq.${threadId}` },
        (payload) => {
          const row = payload.new as { user_id?: string; last_read_at?: string };
          if (!row?.user_id || row.user_id === userId || !row.last_read_at) return;
          setOthersReadAt((prev) =>
            !prev || new Date(row.last_read_at!) > new Date(prev) ? row.last_read_at! : prev,
          );
        },
      )
      .subscribe();

    return () => {
      clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [threadId, userId]);

  // Typing broadcast channel (private)
  useEffect(() => {
    if (!threadId || !userId) return;
    const ch = supabase
      .channel(`pm-typing:${threadId}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const p = payload as { userId: string; name: string; typing: boolean };
        if (p.userId === userId) return;
        setOthersTyping((prev) => {
          if (p.typing && !prev.includes(p.name)) return [...prev, p.name];
          if (!p.typing) return prev.filter((n) => n !== p.name);
          return prev;
        });
        if (p.typing) {
          setTimeout(() => setOthersTyping((cur) => cur.filter((n) => n !== p.name)), 4000);
        }
      })
      .subscribe();
    pmTypingChannelRef.current = ch;
    return () => {
      if (pmTypingTimerRef.current) clearTimeout(pmTypingTimerRef.current);
      void supabase.removeChannel(ch);
      pmTypingChannelRef.current = null;
      setOthersTyping([]);
    };
  }, [threadId, userId]);

  const sendTyping = useCallback(() => {
    const ch = pmTypingChannelRef.current;
    if (!ch || !userId) return;
    const myName = user?.name ?? 'Usuario';
    void ch.send({ type: 'broadcast', event: 'typing', payload: { userId, name: myName, typing: true } });
    if (pmTypingTimerRef.current) clearTimeout(pmTypingTimerRef.current);
    pmTypingTimerRef.current = setTimeout(() => {
      void ch.send({ type: 'broadcast', event: 'typing', payload: { userId, name: myName, typing: false } });
    }, 3000);
  }, [userId, user?.name]);

  const send = async (
    body: string,
    opts?: { replyToId?: string; voiceLocalUri?: string; voiceDurationSec?: number },
  ) => {
    if (!threadId || !userId) return;
    const trimmed = body.trim();
    if (!trimmed && !opts?.voiceLocalUri) return;
    const optId = `opt_${Date.now()}`;
    setMessages((prev) => [...prev, {
      id: optId, threadId: threadId!, authorId: userId,
      authorName: user?.name ?? 'Tú',
      body: trimmed || '[Nota de voz]',
      voiceUrl: opts?.voiceLocalUri,
      voiceDurationSec: opts?.voiceDurationSec,
      sentAt: new Date().toISOString(),
    }]);
    let uploadedVoiceUrl: string | undefined;
    if (opts?.voiceLocalUri) {
      try { uploadedVoiceUrl = await uploadVoiceMessage(opts.voiceLocalUri, userId); } catch (e) { console.warn('[voice] upload failed', e); }
    }
    try {
      await sendPrivateMessage(threadId, userId, trimmed || '[Nota de voz]', opts?.replyToId, uploadedVoiceUrl, opts?.voiceDurationSec);
      await queryClient.invalidateQueries({ queryKey: ['private-threads', userId] });
      queryClient.setQueryData<PrivateThreadData[]>(['private-threads', userId], (old) =>
        old?.map((t) => (t.id === threadId ? { ...t, unreadCount: 0 } : t)) ?? old,
      );
    } catch {
      try {
        await sendPrivateMessage(threadId, userId, trimmed || '[Nota de voz]', opts?.replyToId);
        await queryClient.invalidateQueries({ queryKey: ['private-threads', userId] });
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== optId));
      }
    }
  };

  const removeMessages = (ids: string[]) => {
    const idSet = new Set(ids);
    setMessages((prev) => prev.filter((m) => !idSet.has(m.id)));
  };

  return { messages, loading, error, send, removeMessages, threadId, othersReadAt, othersTyping, sendTyping };
}

// ─── Delete a single message ──────────────────────────────────────────────────

export function useDeleteMessage() {
  return useMutation({
    mutationFn: (messageId: string) => deleteMessage(messageId),
  });
}

export function useDeletePrivateMessage() {
  return useMutation({
    mutationFn: (messageId: string) => deletePrivateMessage(messageId),
  });
}

// ─── Delete a thread ──────────────────────────────────────────────────────────

export function useDeleteThread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (threadId: string) => deleteThread(threadId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
    },
    onError: (err: Error) => {
      console.warn('[useDeleteThread]', err.message);
    },
  });
}
