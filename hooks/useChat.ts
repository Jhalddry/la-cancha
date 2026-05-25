import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  fetchMessages,
  fetchMyThreads,
  fetchThreadByMatchId,
  fetchThreadParticipants,
  sendMessage,
  type ChatMessageData,
  type ChatParticipant,
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
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const authorId = row.author_id as string;
          const authorInfo = participantsRef.current.get(authorId);

          setMessages((prev) => {
            // Ignore if already present (optimistic insert from this client)
            if (prev.some((m) => m.id === (row.id as string))) return prev;
            return [
              ...prev,
              {
                id: row.id as string,
                threadId: row.thread_id as string,
                authorId,
                authorName: authorInfo?.name ?? 'Usuario',
                authorAvatarUrl: authorInfo?.avatarUrl,
                body: row.body as string,
                sentAt: row.sent_at as string,
              },
            ];
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
