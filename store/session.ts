import { create } from "zustand";

import { supabase } from "@/lib/supabase";
import { rowToPlayer } from "@/lib/mappers";
import type { Player } from "@/types/domain";

async function fetchProfile(userId: string): Promise<Player | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("[fetchProfile] query error:", error.code, error.message);
    return null;
  }
  if (!data) return null; // 0 rows — profile not created yet
  return rowToPlayer(data as Record<string, unknown>);
}

/**
 * Fetch profile, creating a stub row if the trigger hasn't fired yet
 * (race condition after signUp or orphaned auth user).
 */
async function fetchOrCreateProfile(
  userId: string,
  fallbackName: string,
): Promise<Player | null> {
  const existing = await fetchProfile(userId);
  if (existing) return existing;

  // Profile row missing — upsert a stub so onboarding can proceed.
  // FK violation (23503) means auth.users row isn't visible yet (rare race);
  // in that case skip the upsert and let the trigger create the row instead.
  const { error: upsertError } = await supabase.from("profiles").upsert(
    { id: userId, name: fallbackName },
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (upsertError) {
    if (upsertError.code === "23503") {
      // FK race — auth user not yet committed; wait and retry read only
      console.warn("[fetchOrCreateProfile] FK race, retrying read after delay");
    } else {
      console.error("[fetchOrCreateProfile] upsert error:", upsertError.message);
      return null;
    }
  }
  // Brief pause so PgBouncer propagates the write (or trigger) before re-reading
  await new Promise((r) => setTimeout(r, 500));
  return fetchProfile(userId);
}

interface SessionState {
  user: Player | null;
  isAuthed: boolean;
  isLoading: boolean;
  isOnboarded: boolean;
  setUser: (user: Player | null) => void;
  setOnboarded: (v: boolean) => void;
  setCity: (city: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (name: string, email: string, password: string) => Promise<string | null>;
  completeOAuthSignIn: (url: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  initialize: () => () => void;
}

export const useSession = create<SessionState>((set) => ({
  user: null,
  isAuthed: false,
  isLoading: true,
  isOnboarded: false,

  setUser: (user) => set({ user, isAuthed: !!user }),
  setOnboarded: (v) => set({ isOnboarded: v }),

  setCity: async (city) => {
    const { user } = useSession.getState();
    if (!user) return;
    await supabase.from("profiles").update({ city }).eq("id", user.id);
    set({ user: { ...user, city } });
  },

  signIn: async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return error.message;
      if (data.user) {
        const fallback = data.user.email?.split("@")[0] ?? "Usuario";
        const profile = await fetchOrCreateProfile(data.user.id, fallback);
        set({
          user: profile,
          isAuthed: true,
          isLoading: false,
          isOnboarded: profile?.onboarded ?? false,
        });
      }
      return null;
    } catch (e: unknown) {
      console.error("[signIn] threw:", e);
      return e instanceof Error ? e.message : "Error de conexión";
    }
  },

  signUp: async (name, email, password) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) return error.message;
      if (data.user) {
        const profile = await fetchOrCreateProfile(data.user.id, name);
        set({ user: profile, isAuthed: true, isLoading: false, isOnboarded: false });
      }
      return null;
    } catch (e: unknown) {
      return e instanceof Error ? e.message : "Error de conexión";
    }
  },

  completeOAuthSignIn: async (url: string) => {
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(url);
      if (error) return error.message;
      const session = data.session;
      if (!session?.user) return 'No se pudo obtener la sesión.';
      const fallback =
        (session.user.user_metadata?.name as string | undefined) ??
        session.user.email?.split('@')[0] ??
        'Usuario';
      const profile = await fetchOrCreateProfile(session.user.id, fallback);
      set({
        user: profile,
        isAuthed: true,
        isLoading: false,
        isOnboarded: profile?.onboarded ?? false,
      });
      return null;
    } catch (e: unknown) {
      return e instanceof Error ? e.message : 'Error de conexión';
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, isAuthed: false, isOnboarded: false });
  },

  initialize: () => {
    supabase.auth
      .getSession()
      .then(async ({ data: { session }, error }) => {
        if (error || !session?.user) {
          set({ user: null, isAuthed: false, isLoading: false, isOnboarded: false });
          return;
        }
        const fallback =
          (session.user.user_metadata?.name as string | undefined) ??
          session.user.email?.split("@")[0] ??
          "Usuario";
        const profile = await fetchOrCreateProfile(session.user.id, fallback);
        if (!profile) {
          // Profile unrecoverable — sign out so user can re-authenticate cleanly
          await supabase.auth.signOut();
          set({ user: null, isAuthed: false, isLoading: false, isOnboarded: false });
          return;
        }
        set({
          user: profile,
          isAuthed: true,
          isLoading: false,
          isOnboarded: profile.onboarded ?? false,
        });
      })
      .catch(() => {
        set({ user: null, isAuthed: false, isLoading: false });
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session?.user) {
        set({ user: null, isAuthed: false, isLoading: false, isOnboarded: false });
        return;
      }
      // Skip redundant re-fetch when the same user is already loaded.
      // TOKEN_REFRESHED: background token rotation.
      // SIGNED_IN: fired by signInWithPassword used to verify current password
      //   in cuenta/contrasena before calling updateUser.
      // USER_UPDATED: fired by updateUser (password/email change) — profile row
      //   is unchanged, no need to re-fetch. Without this guard the fetch can
      //   transiently return null → signOut() → screen unmounts mid-save.
      if (
        event === "TOKEN_REFRESHED" ||
        event === "SIGNED_IN" ||
        event === "USER_UPDATED"
      ) {
        const current = useSession.getState().user;
        if (current?.id === session.user.id) {
          set({ isAuthed: true, isLoading: false });
          return;
        }
      }
      const fallback =
        (session.user.user_metadata?.name as string | undefined) ??
        session.user.email?.split("@")[0] ??
        "Usuario";
      const profile = await fetchOrCreateProfile(session.user.id, fallback);
      if (!profile) {
        await supabase.auth.signOut();
        set({ user: null, isAuthed: false, isLoading: false, isOnboarded: false });
        return;
      }
      set({
        user: profile,
        isAuthed: true,
        isLoading: false,
        isOnboarded: profile.onboarded ?? false,
      });
    });

    return () => subscription.unsubscribe();
  },
}));
