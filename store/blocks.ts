import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

interface BlocksState {
  blockedIds: Set<string>;
  initialized: boolean;
  loadBlocks: (myUserId: string) => Promise<void>;
  blockUser: (myUserId: string, targetId: string) => Promise<void>;
  unblockUser: (myUserId: string, targetId: string) => Promise<void>;
  isBlocked: (targetId: string) => boolean;
}

function storageKey(userId: string) {
  return `blocks_${userId}`;
}

export const useBlocks = create<BlocksState>((set, get) => ({
  blockedIds: new Set(),
  initialized: false,

  loadBlocks: async (myUserId) => {
    if (get().initialized) return;
    try {
      const raw = await AsyncStorage.getItem(storageKey(myUserId));
      const ids: string[] = raw ? (JSON.parse(raw) as string[]) : [];
      set({ blockedIds: new Set(ids), initialized: true });
    } catch {
      set({ initialized: true });
    }
  },

  blockUser: async (myUserId, targetId) => {
    const next = new Set(get().blockedIds);
    next.add(targetId);
    set({ blockedIds: next });
    try {
      await AsyncStorage.setItem(storageKey(myUserId), JSON.stringify([...next]));
    } catch {}
  },

  unblockUser: async (myUserId, targetId) => {
    const next = new Set(get().blockedIds);
    next.delete(targetId);
    set({ blockedIds: next });
    try {
      await AsyncStorage.setItem(storageKey(myUserId), JSON.stringify([...next]));
    } catch {}
  },

  isBlocked: (targetId) => get().blockedIds.has(targetId),
}));
