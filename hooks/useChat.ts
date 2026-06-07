import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

import {
  deleteMessage,
  deleteThread,
  fetchMessages,
  fetchMyPrivateThreads,
  fetchMyThreads,
  fetchOrCreatePrivateThread,
  fetchPrivateMessages,
  fetchThreadByMatchId,
  fetchThreadParticipants,
  sendMessage,
  sendPrivateMessage,
  type ChatMessageData,
  type ChatParticipant,
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

  // Keep a stable ref so the realtime callback always has fresh participant data
  const participantsRef = useRef(participants);
  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

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

        setMessages(msgs);

        const map = new Map<string, ChatParticipant>();
        for (const p of parts) map.set(p.id, p);
        setParticipants(map);
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

    const channel = supabase
      .channel(`chat-messages:${threadId}`)
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
          const newMsg: ChatMessageData = {
            id: row.id as string,
            threadId: row.thread_id as string,
            authorId,
            authorName: authorInfo?.name ?? 'Usuario',
            authorAvatarUrl: authorInfo?.avatarUrl,
            body: row.body as string,
            sentAt: row.sent_at as string,
          };

          setMessages((prev) => {
            // Already present (exact ID match)
            if (prev.some((m) => m.id === newMsg.id)) return prev;

            // If it's our own message, find and replace the matching optimistic entry
            if (authorId === userId) {
              let lastOptIdx = -1;
              for (let i = prev.length - 1; i >= 0; i--) {
                if (prev[i].id.startsWith('opt_') && prev[i].body === newMsg.body) {
                  lastOptIdx = i;
                  break;
                }
              }
              if (lastOptIdx !== -1) {
                const next = [...prev];
                next[lastOptIdx] = newMsg;
                return next;
              }
            }

            return [...prev, newMsg];
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [threadId]);

  const send = async (body: string) => {
    if (!threadId || !userId || !body.trim()) return;

    const trimmed = body.trim();
    const optimisticId = `opt_${Date.now()}`;
    const me = participantsRef.current.get(userId);

    // Optimistic add
    setMessages((prev) => [
      ...prev,
      {
        id: optimisticId,
        threadId,
        authorId: userId,
        authorName: me?.name ?? 'Tú',
        authorAvatarUrl: me?.avatarUrl,
        body: trimmed,
        sentAt: new Date().toISOString(),
      },
    ]);

    try {
      await sendMessage(threadId, userId, trimmed);
    } catch {
      // Roll back optimistic message
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    }
  };

  return { messages, participants, loading, error, send, threadId };
}

// ─── Private DM hooks ────────────────────────────────────────────────────────

export function useMyPrivateThreads() {
  const userId = useSession((s) => s.user?.id);
  return useQuery({
    queryKey: ['private-threads', userId ?? ''],
    queryFn: () => fetchMyPrivateThreads(userId!),
    enabled: !!userId,
    staleTime: 15_000,
  });
}

export function usePrivateChat(otherId: string | undefined) {
  const userId = useSession((s) => s.user?.id);
  const user = useSession((s) => s.user);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setMessages(msgs);
      } catch { setError('Error al cargar el chat.'); }
      finally { setLoading(false); }
    })();
  }, [userId, otherId]);

  // Realtime for private messages
  useEffect(() => {
    if (!threadId) return;
    const channel = supabase
      .channel(`pm:${threadId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'private_messages', filter: `thread_id=eq.${threadId}` },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const authorId = row.author_id as string;
          const newMsg: ChatMessageData = {
            id: row.id as string,
            threadId: row.thread_id as string,
            authorId,
            authorName: authorId === userId ? (user?.name ?? 'Tú') : 'Usuario',
            body: row.body as string,
            sentAt: row.sent_at as string,
          };
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            if (authorId === userId) {
              let idx = -1;
              for (let i = prev.length - 1; i >= 0; i--) {
                if (prev[i].id.startsWith('opt_') && prev[i].body === newMsg.body) { idx = i; break; }
              }
              if (idx !== -1) { const next = [...prev]; next[idx] = newMsg; return next; }
            }
            return [...prev, newMsg];
          });
        })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [threadId, userId, user?.name]);

  const send = async (body: string) => {
    if (!threadId || !userId || !body.trim()) return;
    const trimmed = body.trim();
    const optId = `opt_${Date.now()}`;
    setMessages((prev) => [...prev, {
      id: optId, threadId: threadId!, authorId: userId,
      authorName: user?.name ?? 'Tú', body: trimmed, sentAt: new Date().toISOString(),
    }]);
    try {
      await sendPrivateMessage(threadId, userId, trimmed);
      void queryClient.invalidateQueries({ queryKey: ['private-threads', userId] });
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optId));
    }
  };

  return { messages, loading, error, send, threadId };
}

// ─── Delete a single message ──────────────────────────────────────────────────

export function useDeleteMessage() {
  return useMutation({
    mutationFn: (messageId: string) => deleteMessage(messageId),
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
