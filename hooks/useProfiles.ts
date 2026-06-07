import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchProfile,
  setPlayerVerified,
  requestVerification,
  fetchVerificationRequests,
  approveVerification,
  rejectVerification,
} from '@/lib/profilesApi';
import { fetchMyRatings, fetchMyGivenRatings } from '@/lib/ratingsApi';

export const profileKeys = {
  all: ['profiles'] as const,
  detail: (id: string) => [...profileKeys.all, id] as const,
};

export const ratingKeys = {
  forPlayer: (id: string) => ['ratings', 'player', id] as const,
  given: (userId: string) => ['ratings', 'given', userId] as const,
};

export function useMyGivenRatings(userId: string | undefined) {
  return useQuery({
    queryKey: ratingKeys.given(userId ?? ''),
    queryFn: () => fetchMyGivenRatings(userId!),
    enabled: !!userId,
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useProfile(id: string | undefined) {
  return useQuery({
    queryKey: profileKeys.detail(id ?? ''),
    queryFn: () => fetchProfile(id!),
    enabled: !!id,
    staleTime: 30_000,
    refetchOnMount: true,   // pick up reputation changes after calificar
  });
}

export const adminKeys = {
  verificationRequests: ['admin', 'verification-requests'] as const,
};

export function useVerificationRequests() {
  return useQuery({
    queryKey: adminKeys.verificationRequests,
    queryFn: fetchVerificationRequests,
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useApproveVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approveVerification(id),
    onMutate: (id) => {
      // Optimistically remove from list immediately
      qc.setQueryData(
        adminKeys.verificationRequests,
        (old: import('@/types/domain').Player[] | undefined) =>
          (old ?? []).filter((p) => p.id !== id),
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminKeys.verificationRequests });
    },
  });
}

export function useRejectVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rejectVerification(id),
    onMutate: (id) => {
      // Optimistically remove from list immediately
      qc.setQueryData(
        adminKeys.verificationRequests,
        (old: import('@/types/domain').Player[] | undefined) =>
          (old ?? []).filter((p) => p.id !== id),
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminKeys.verificationRequests });
    },
  });
}

export function useRequestVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => requestVerification(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: profileKeys.detail(id) });
    },
  });
}

export function useVerifyPlayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, verified }: { id: string; verified: boolean }) =>
      setPlayerVerified(id, verified),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: profileKeys.detail(id) });
    },
  });
}

export function usePlayerRatings(id: string | undefined) {
  return useQuery({
    queryKey: ratingKeys.forPlayer(id ?? ''),
    queryFn: () => fetchMyRatings(id!),
    enabled: !!id,
    staleTime: 0,           // always fetch fresh — ratings change after calificar
    refetchOnMount: true,
  });
}
