import { create } from "zustand";

import { supabase } from "@/lib/supabase";
import type { Player, Position, SkillLevel, Sport } from "@/types/domain";

function rowToPlayer(row: Record<string, unknown>): Player {
  return {
    id: row.id as string,
    name: row.name as string,
    username: (row.username as string | null) ?? undefined,
    avatarUrl: (row.avatar_url as string | null) ?? undefined,
    skillLevel: ((row.skill_level as number) ?? 1) as SkillLevel,
    sports: (row.sports as Sport[]) ?? [],
    positions: (row.positions as Position[]) ?? [],
    bio: (row.bio as string | null) ?? undefined,
    verified: (row.verified as boolean) ?? false,
    reputation: (row.reputation as number | null) ?? undefined,
    matchesPlayed: (row.matches_played as number) ?? 0,
    matchesOrganized: (row.matches_organized as number) ?? 0,
    attendancePct: (row.attendance_pct as number | null) ?? undefined,
    badges: (row.badges as string[]) ?? [],
  };
}

async function fetchProfile(userId: string): Promise<Player | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error || !data) return null;
  return rowToPlayer(data as Record<string, unknown>);
}

interface SessionState {
  user: Player | null;
  isAuthed: boolean;
  isLoading: boolean;
  isOnboarded: boolean;
  setUser: (user: Player | null) => void;
  setOnboarded: (v: boolean) => void;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (
    name: string,
    email: string,
    password: string,
  ) => Promise<string | null>;
  signOut: () => Promise<void>;
  initialize: () => () => void;
}

export const useSession = create<SessionState>((set) => ({
  user: null,
  isAuthed: false,
  isLoading: true,
  isOnboarded: true,
  setUser: (user) => set({ user, isAuthed: !!user }),
  setOnboarded: (v) => set({ isOnboarded: v }),

  signIn: async (email, password) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return error.message;
      return null;
    } catch (e: unknown) {
      console.error("[signIn] threw:", e);
      return e instanceof Error ? e.message : "Error de conexión";
    }
  },

  signUp: async (name, email, password) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) return error.message;
      return null;
    } catch (e: unknown) {
      return e instanceof Error ? e.message : "Error de conexión";
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, isAuthed: false });
  },

  initialize: () => {
    supabase.auth
      .getSession()
      .then(async ({ data: { session }, error }) => {
        if (error) {
          set({ user: null, isAuthed: false, isLoading: false });
          return;
        }
        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          set({ user: profile, isAuthed: true, isLoading: false });
        } else {
          set({ user: null, isAuthed: false, isLoading: false });
        }
      })
      .catch(() => {
        set({ user: null, isAuthed: false, isLoading: false });
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        set({ user: profile, isAuthed: true, isLoading: false });
      } else {
        set({ user: null, isAuthed: false, isLoading: false });
      }
    });

    return () => subscription.unsubscribe();
  },
}));
