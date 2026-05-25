import { useQuery } from '@tanstack/react-query';

import { fetchProfile } from '@/lib/profilesApi';

export const profileKeys = {
  all: ['profiles'] as const,
  detail: (id: string) => [...profileKeys.all, id] as const,
};

export function useProfile(id: string | undefined) {
  return useQuery({
    queryKey: profileKeys.detail(id ?? ''),
    queryFn: () => fetchProfile(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}
