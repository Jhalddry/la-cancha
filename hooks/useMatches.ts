import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  deleteMatch,
  fetchMatch,
  fetchMatches,
  fetchMyMatches,
  joinMatch,
  leaveMatch,
  updateMatch,
  type MatchFilters,
} from '@/lib/matchesApi';
import { useSession } from '@/store/session';

// ─── Query keys ──────────────────────────────────────────────────────────────

export const matchKeys = {
  all: ['matches'] as const,
  lists: () => [...matchKeys.all, 'list'] as const,
  list: (filters: MatchFilters) => [...matchKeys.lists(), filters] as const,
  details: () => [...matchKeys.all, 'detail'] as const,
  detail: (id: string) => [...matchKeys.details(), id] as const,
  mine: (userId: string) => [...matchKeys.all, 'mine', userId] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useMatches(filters: MatchFilters = {}) {
  return useQuery({
    queryKey: matchKeys.list(filters),
    queryFn: () => fetchMatches(filters),
    staleTime: 30_000,
  });
}

export function useMatch(id: string | undefined) {
  return useQuery({
    queryKey: matchKeys.detail(id ?? ''),
    queryFn: () => fetchMatch(id!),
    enabled: !!id,
    staleTime: 30_000,
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
    mutationFn: (matchId: string) => joinMatch(matchId, userId!),
    onSuccess: (_, matchId) => {
      void queryClient.invalidateQueries({ queryKey: matchKeys.detail(matchId) });
      void queryClient.invalidateQueries({ queryKey: matchKeys.lists() });
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: matchKeys.mine(userId) });
      }
    },
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
