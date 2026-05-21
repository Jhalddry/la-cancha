import { create } from 'zustand';

import type { Match } from '@/types/domain';

interface MatchOverridesStore {
  overrides: Record<string, Partial<Match>>;
  setOverride: (id: string, patch: Partial<Match>) => void;
  getMatch: (base: Match) => Match;
}

export const useMatchOverrides = create<MatchOverridesStore>((set, get) => ({
  overrides: {},
  setOverride: (id, patch) =>
    set((s) => ({
      overrides: { ...s.overrides, [id]: { ...s.overrides[id], ...patch } },
    })),
  getMatch: (base) => ({ ...base, ...get().overrides[base.id] }),
}));
