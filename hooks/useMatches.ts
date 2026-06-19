import { useEffect } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Match } from '@/types/domain';

import {
  approveParticipant,
  deleteMatch,
  endMatch,
  fetchMatch,
  fetchMatches,
  fetchMyMatches,
  fetchMyParticipantStatus,
  fetchPendingParticipants,
  fetchPlayerJoinedMatches,
  fetchPlayerOrganizedMatches,
  inviteToMatch,
  joinMatch,
  leaveMatch,
  rejectParticipant,
  startMatch,
  updateMatch,
  PAGE_SIZE,
  type MatchFilters,
} from '@/lib/matchesApi';
import { useSession } from '@/store/session';
import { supabase } from '@/lib/supabase';

// ─── Query keys ──────────────────────────────────────────────────────────────

export const matchKeys = {
  all: ['matches'] as const,
  lists: () => [...matchKeys.all, 'list'] as const,
  list: (filters: MatchFilters) => [...matchKeys.lists(), filters] as const,
  listInfinite: (filters: MatchFilters) => [...matchKeys.all, 'listInfinite', filters] as const,
  details: () => [...matchKeys.all, 'detail'] as const,
  detail: (id: string) => [...matchKeys.details(), id] as const,
  mine: (userId: string) => [...matchKeys.all, 'mine', userId] as const,
  pending: (matchId: string) => [...matchKeys.all, 'pending', matchId] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useMatches(filters: MatchFilters = {}) {
  const userId = useSession((s) => s.user?.id);

  const rejectedQuery = useQuery({
    queryKey: ['rejectedMatchIds', userId ?? ''],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase
        .from('match_participants')
        .select('match_id')
        .eq('profile_id', userId)
        .eq('status', 'rejected');
      return (data ?? []).map((r) => (r as { match_id: string }).match_id);
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

  const matchesQuery = useQuery({
    queryKey: matchKeys.list({ ...filters, excludeIds: rejectedQuery.data }),
    queryFn: () => fetchMatches({ ...filters, excludeIds: rejectedQuery.data ?? [] }),
    enabled: !rejectedQuery.isLoading,
    staleTime: 30_000,
  });

  return matchesQuery;
}

export function useMatchesInfinite(filters: MatchFilters = {}) {
  const userId = useSession((s) => s.user?.id);

  const rejectedQuery = useQuery({
    queryKey: ['rejectedMatchIds', userId ?? ''],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase
        .from('match_participants')
        .select('match_id')
        .eq('profile_id', userId)
        .eq('status', 'rejected');
      return (data ?? []).map((r) => (r as { match_id: string }).match_id);
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

  return useInfiniteQuery({
    queryKey: matchKeys.listInfinite({ ...filters, excludeIds: rejectedQuery.data }),
    queryFn: ({ pageParam }) =>
      fetchMatches({
        ...filters,
        excludeIds: rejectedQuery.data ?? [],
        offset: pageParam as number,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length * PAGE_SIZE : undefined,
    enabled: !rejectedQuery.isLoading,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useMatch(id: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`match-participants:${id}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'match_participants', filter: `match_id=eq.${id}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: matchKeys.detail(id) });
          void queryClient.invalidateQueries({ queryKey: matchKeys.pending(id) });
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [id, queryClient]);

  return useQuery({
    queryKey: matchKeys.detail(id ?? ''),
    queryFn: () => fetchMatch(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function usePlayerJoinedMatches(profileId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: [...matchKeys.all, 'playerJoined', profileId ?? ''] as const,
    queryFn: () => fetchPlayerJoinedMatches(profileId!),
    enabled: !!profileId && enabled,
    staleTime: 60_000,
  });
}

export function usePlayerOrganizedMatches(profileId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: [...matchKeys.all, 'playerOrganized', profileId ?? ''] as const,
    queryFn: () => fetchPlayerOrganizedMatches(profileId!),
    enabled: !!profileId && enabled,
    staleTime: 60_000,
  });
}

export function useMyMatches() {
  const userId = useSession((s) => s.user?.id);
  return useQuery({
    queryKey: matchKeys.mine(userId ?? ''),
    queryFn: () => fetchMyMatches(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useJoinMatch() {
  const queryClient = useQueryClient();
  const userId = useSession((s) => s.user?.id);

  return useMutation({
    mutationFn: ({
      matchId,
      paymentMethod,
      checkedRequirements,
    }: {
      matchId: string;
      paymentMethod?: import('@/types/domain').PaymentMethod;
      checkedRequirements?: string[];
    }) => joinMatch(matchId, userId!, paymentMethod, checkedRequirements ?? []),
    onSuccess: (_, { matchId }) => {
      void queryClient.invalidateQueries({ queryKey: matchKeys.detail(matchId) });
      void queryClient.invalidateQueries({ queryKey: matchKeys.lists() });
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: matchKeys.mine(userId) });
        void queryClient.invalidateQueries({
          queryKey: [...matchKeys.detail(matchId), 'myStatus', userId],
        });
      }
    },
  });
}

export const myStatusKey = (matchId: string, userId: string) =>
  [...matchKeys.detail(matchId), 'myStatus', userId] as const;

export function useMyParticipantStatus(matchId: string | undefined) {
  const userId = useSession((s) => s.user?.id);
  return useQuery({
    queryKey: matchId && userId ? myStatusKey(matchId, userId) : ['noop'],
    queryFn: () => fetchMyParticipantStatus(matchId!, userId!),
    enabled: !!matchId && !!userId,
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function usePendingParticipants(matchId: string | undefined, isOrganizer: boolean) {
  return useQuery({
    queryKey: matchKeys.pending(matchId ?? ''),
    queryFn: () => fetchPendingParticipants(matchId!),
    enabled: !!matchId && isOrganizer,
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useApproveParticipant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ matchId, profileId }: { matchId: string; profileId: string }) =>
      approveParticipant(matchId, profileId),
    onSuccess: (_, { matchId }) => {
      void queryClient.invalidateQueries({ queryKey: matchKeys.detail(matchId) });
      void queryClient.invalidateQueries({ queryKey: matchKeys.pending(matchId) });
    },
  });
}

export function useRejectParticipant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ matchId, profileId }: { matchId: string; profileId: string }) =>
      rejectParticipant(matchId, profileId),
    onSuccess: (_, { matchId }) => {
      void queryClient.invalidateQueries({ queryKey: matchKeys.pending(matchId) });
    },
  });
}

export function useInviteToMatch() {
  return useMutation({
    mutationFn: ({
      matchId,
      inviteeId,
      organizerName,
      sport,
      modality,
    }: {
      matchId: string;
      inviteeId: string;
      organizerName: string;
      sport: string;
      modality: string;
    }) => inviteToMatch(matchId, inviteeId, organizerName, sport, modality),
  });
}

export function useLeaveMatch() {
  const queryClient = useQueryClient();
  const userId = useSession((s) => s.user?.id);

  return useMutation({
    mutationFn: (matchId: string) => leaveMatch(matchId, userId!),
    onSuccess: (_, matchId) => {
      void queryClient.invalidateQueries({ queryKey: matchKeys.detail(matchId) });
      void queryClient.invalidateQueries({ queryKey: matchKeys.lists() });
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: matchKeys.mine(userId) });
      }
    },
  });
}

export function useUpdateMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Parameters<typeof updateMatch>[1];
    }) => updateMatch(id, patch),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: matchKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: matchKeys.lists() });
    },
  });
}

export function useDeleteMatch() {
  const queryClient = useQueryClient();
  const userId = useSession((s) => s.user?.id);

  return useMutation({
    mutationFn: (id: string) => deleteMatch(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: matchKeys.lists() });
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: matchKeys.mine(userId) });
      }
    },
  });
}

export function useStartMatch() {
  const queryClient = useQueryClient();
  const userId = useSession((s) => s.user?.id);

  return useMutation({
    mutationFn: (id: string) => startMatch(id),
    onMutate: (id) => {
      const now = new Date().toISOString();
      // Optimistically patch detail cache
      queryClient.setQueryData<Match>(matchKeys.detail(id), (old) =>
        old ? { ...old, startedAt: now } : old,
      );
      // Optimistically patch mine cache
      if (userId) {
        queryClient.setQueryData<{ upcoming: Match[]; past: Match[]; created: Match[] }>(
          matchKeys.mine(userId),
          (old) => {
            if (!old) return old;
            const patch = (arr: Match[]) =>
              arr.map((m) => (m.id === id ? { ...m, startedAt: now } : m));
            return { upcoming: patch(old.upcoming), past: patch(old.past), created: patch(old.created) };
          },
        );
      }
    },
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: matchKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: matchKeys.lists() });
      if (userId) void queryClient.invalidateQueries({ queryKey: matchKeys.mine(userId) });
    },
  });
}

export function useEndMatch() {
  const queryClient = useQueryClient();
  const userId = useSession((s) => s.user?.id);

  return useMutation({
    mutationFn: (id: string) => endMatch(id),
    onMutate: (id) => {
      const now = new Date().toISOString();
      // Optimistically patch detail cache
      queryClient.setQueryData<Match>(matchKeys.detail(id), (old) =>
        old ? { ...old, endedAt: now } : old,
      );
      // Optimistically patch mine cache
      if (userId) {
        queryClient.setQueryData<{ upcoming: Match[]; past: Match[]; created: Match[] }>(
          matchKeys.mine(userId),
          (old) => {
            if (!old) return old;
            const patch = (arr: Match[]) =>
              arr.map((m) => (m.id === id ? { ...m, endedAt: now } : m));
            return { upcoming: patch(old.upcoming), past: patch(old.past), created: patch(old.created) };
          },
        );
      }
    },
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: matchKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: matchKeys.lists() });
      if (userId) void queryClient.invalidateQueries({ queryKey: matchKeys.mine(userId) });
    },
  });
}
