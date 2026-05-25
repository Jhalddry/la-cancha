import type { Player, Position, SkillLevel, Sport } from '@/types/domain';

export function rowToPlayer(row: Record<string, unknown>): Player {
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
    city: (row.city as string | null) ?? undefined,
    onboarded: (row.onboarded as boolean) ?? false,
  };
}
