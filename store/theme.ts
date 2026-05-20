import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeState {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
}

export const useTheme = create<ThemeState>((set) => ({
  mode: 'dark',
  setMode: (mode) => set({ mode }),
}));
