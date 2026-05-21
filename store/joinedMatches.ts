import { create } from 'zustand';

interface JoinedMatchesStore {
  joinedIds: string[];
  join: (id: string) => void;
  hasJoined: (id: string) => boolean;
}

export const useJoinedMatches = create<JoinedMatchesStore>((set, get) => ({
  joinedIds: [],
  join: (id) =>
    set((s) =>
      s.joinedIds.includes(id) ? s : { joinedIds: [...s.joinedIds, id] },
    ),
  hasJoined: (id) => get().joinedIds.includes(id),
}));
