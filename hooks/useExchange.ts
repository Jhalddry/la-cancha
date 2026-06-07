import { useQuery } from '@tanstack/react-query';

import { BCV_RATE, fetchBcvRate } from '@/lib/exchange';

export function useBcvRate() {
  const { data } = useQuery({
    queryKey: ['bcv-rate'],
    queryFn: fetchBcvRate,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    retry: 2,
  });
  return data ?? BCV_RATE;
}
