import { supabase } from '@/lib/supabase';
import { rowToPlayer } from '@/lib/mappers';
import type { Player } from '@/types/domain';

const PROFILE_FIELDS =
  'id, name, username, avatar_url, skill_level, sports, positions, bio, verified, reputation, matches_played, matches_organized, attendance_pct, badges, city, onboarded';

export async function fetchProfile(id: string): Promise<Player | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_FIELDS)
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return rowToPlayer(data as Record<string, unknown>);
}
