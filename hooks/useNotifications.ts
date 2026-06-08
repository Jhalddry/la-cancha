import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

import {
  countUnreadNotifications,
  deleteAllNotifications,
  deleteNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/notificationsApi';
import { useSession } from '@/store/session';

const notifKeys = {
  all: ['notifications'] as const,
  list: (userId: string) => [...notifKeys.all, userId] as const,
  unread: (userId: string) => [...notifKeys.all, 'unread', userId] as const,
};

export function useNotifications() {
  const userId = useSession((s) => s.user?.id);
  return useQuery({
    queryKey: notifKeys.list(userId ?? ''),
    queryFn: () => fetchNotifications(userId!),
    enabled: !!userId,
    staleTime: 20_000,
  });
}

export function useUnreadCount() {
  const userId = useSession((s) => s.user?.id);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications-realtime:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `profile_id=eq.${userId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: notifKeys.list(userId) });
          void queryClient.invalidateQueries({ queryKey: notifKeys.unread(userId) });
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [userId, queryClient]);

  return useQuery({
    queryKey: notifKeys.unread(userId ?? ''),
    queryFn: () => countUnreadNotifications(userId!),
    enabled: !!userId,
    staleTime: 20_000,
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  const userId = useSession((s) => s.user?.id);
  return useMutation({
    mutationFn: () => markAllNotificationsRead(userId!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notifKeys.all });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  const userId = useSession((s) => s.user?.id);
  return useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onMutate: async (id) => {
      if (!userId) return;
      queryClient.setQueryData(
        notifKeys.list(userId),
        (old: ReturnType<typeof fetchNotifications> extends Promise<infer T> ? T : never) => {
          if (!old) return old;
          return (old as { id: string }[]).filter((n) => n.id !== id);
        },
      );
    },
    onSuccess: () => {
      if (userId) void queryClient.invalidateQueries({ queryKey: notifKeys.unread(userId) });
    },
  });
}

export function useDeleteAllNotifications() {
  const queryClient = useQueryClient();
  const userId = useSession((s) => s.user?.id);
  return useMutation({
    mutationFn: () => deleteAllNotifications(userId!),
    onMutate: () => {
      if (!userId) return;
      // Optimistically clear list immediately so individually-deleted items don't flicker back
      queryClient.setQueryData(notifKeys.list(userId), []);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notifKeys.all });
    },
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  const userId = useSession((s) => s.user?.id);
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onMutate: async (id) => {
      // Optimistically mark as read in list
      if (!userId) return;
      queryClient.setQueryData(
        notifKeys.list(userId),
        (old: ReturnType<typeof fetchNotifications> extends Promise<infer T> ? T : never) => {
          if (!old) return old;
          return (old as { id: string; read: boolean }[]).map((n) =>
            n.id === id ? { ...n, read: true } : n,
          );
        },
      );
    },
    onSuccess: () => {
      if (userId) void queryClient.invalidateQueries({ queryKey: notifKeys.unread(userId) });
    },
  });
}
