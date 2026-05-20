import { create } from 'zustand';

import { mockCurrentUser } from '@/data/players';
import type { Player } from '@/types/domain';

interface SessionState {
  user: Player | null;
  isAuthed: boolean;
  isOnboarded: boolean;
  setUser: (user: Player | null) => void;
  setOnboarded: (v: boolean) => void;
  signIn: (user?: Player) => void;
  signOut: () => void;
}

export const useSession = create<SessionState>((set) => ({
  user: mockCurrentUser,
  isAuthed: true,
  isOnboarded: true,
  setUser: (user) => set({ user, isAuthed: !!user }),
  setOnboarded: (v) => set({ isOnboarded: v }),
  signIn: (user) => set({ user: user ?? mockCurrentUser, isAuthed: true }),
  signOut: () => set({ user: null, isAuthed: false }),
}));
