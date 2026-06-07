import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text as RNText, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { BackHeader } from '@/components/ui/BackHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Stars } from '@/components/ui/Stars';
import { Text } from '@/components/ui/Text';
import { MatchTypeBadge } from '@/features/match/MatchTypeBadge';
import { useColors } from '@/hooks/useColors';
import { useMyMatches } from '@/hooks/useMatches';
import { useMyGivenRatings } from '@/hooks/useProfiles';
import { formatMatchTime, labelModality, labelSport } from '@/lib/format';
import { useSession } from '@/store/session';
import { radius, spacing } from '@/theme';
import type { Match, SkillLevel } from '@/types/domain';
import type { ColorPalette } from '@/theme/palettes';

const SPORT_EMOJIS: Record<string, string> = {
  futbol: '⚽', basket: '🏀', tenis: '🎾', padel: '🏓', beachTennis: '🏖️',
};

export default function HistorialScreen() {
  const router = useRouter();
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const userId = useSession((st) => st.user?.id);

  const { data: myMatches, isLoading } = useMyMatches();
  const { data: givenRatings = [] } = useMyGivenRatings(userId);

  // All ended matches (past with endedAt OR created with endedAt)
  const endedMatches = useMemo(() => {
    if (!myMatches) return [];
    const fromPast = (myMatches.past ?? []).filter((m) => m.endedAt);
    const fromCreated = (myMatches.created ?? []).filter((m) => m.endedAt);
    const seen = new Set<string>();
    const result: Match[] = [];
    for (const m of [...fromPast, ...fromCreated]) {
      if (!seen.has(m.id)) { seen.add(m.id); result.push(m); }
    }
    // Sort newest first
    return result.sort(
      (a, b) => new Date(b.endedAt!).getTime() - new Date(a.endedAt!).getTime(),
    );
  }, [myMatches]);

  // Map matchId → list of ratings I gave in that match
  const ratingsByMatch = useMemo(() => {
    const map = new Map<string, typeof givenRatings>();
    for (const r of givenRatings) {
      const list = map.get(r.matchId) ?? [];
      list.push(r);
      map.set(r.matchId, list);
    }
    return map;
  }, [givenRatings]);

  const totalPlayed = endedMatches.length;
  const totalRated = new Set(givenRatings.map((r) => `${r.matchId}:${r.rateeId}`)).size;

  return (
    <Screen>
      <BackHeader title="Historial" />

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.primary} size="large" />
        </View>
      ) : endedMatches.length === 0 ? (
        <EmptyState
          icon={<RNText style={{ fontSize: 36, lineHeight: 40 } as object}>🏅</RNText>}
          title="Sin partidas finalizadas"
          description="Aquí verás el historial de todas las partidas que hayas jugado y finalizado."
        />
      ) : (
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {/* Stats */}
          <View style={s.statsRow}>
            <View style={s.statBox}>
              <Text variant="h2" color="primary">{totalPlayed}</Text>
              <Text variant="caption" color="textSecondary">Partidas</Text>
            </View>
            <View style={s.statSep} />
            <View style={s.statBox}>
              <Text variant="h2" color="primary">{totalRated}</Text>
              <Text variant="caption" color="textSecondary">Calificaciones dadas</Text>
            </View>
          </View>

          {/* Match list */}
          {endedMatches.map((m) => {
            const isOrganizer = m.organizer.id === userId;
            const ratingsGiven = ratingsByMatch.get(m.id) ?? [];
            const allPlayers = [
              ...(m.organizer.id !== userId ? [m.organizer] : []),
              ...m.joinedPlayers.filter((p) => p.id !== userId),
            ];
            const ratedIds = new Set(ratingsGiven.map((r) => r.rateeId));

            return (
              <PressableScale
                key={m.id}
                style={s.card}
                scaleTo={0.98}
                onPress={() => router.push(`/match/${m.id}`)}
              >
                {/* Header */}
                <View style={s.cardHead}>
                  <Text style={s.emoji}>{SPORT_EMOJIS[m.sport] ?? '🏅'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodySemibold" color="textPrimary">
                      {labelSport(m.sport)} · {labelModality(m.modality)}
                    </Text>
                    <Text variant="small" color="textSecondary">
                      {m.location.name} · {formatMatchTime(m.startsAt)}
                    </Text>
                  </View>
                  <MatchTypeBadge type={m.type} />
                </View>

                {/* Role */}
                <View style={s.roleBadge}>
                  <Text variant="caption" color={isOrganizer ? 'primary' : 'textSecondary'}>
                    {isOrganizer ? 'Organizador' : 'Jugador'}
                  </Text>
                </View>

                {/* Players & ratings */}
                {allPlayers.length > 0 ? (
                  <View style={s.playerSection}>
                    <Text variant="caption" color="textTertiary">Jugadores calificados</Text>
                    <View style={s.playerList}>
                      {allPlayers.map((p) => {
                        const rated = ratedIds.has(p.id);
                        return (
                          <View key={p.id} style={s.playerRow}>
                            <Avatar name={p.name} uri={p.avatarUrl} size={28} />
                            <Text variant="small" color="textSecondary" style={{ flex: 1 }}>
                              {p.name}
                            </Text>
                            {rated ? (
                              <Stars
                                level={(ratingsGiven.find((r) => r.rateeId === p.id)?.stars ?? 3) as SkillLevel}
                                size={11}
                              />
                            ) : (
                              <Text variant="caption" color="textTertiary">Sin calificar</Text>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ) : null}
              </PressableScale>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.huge,
      gap: spacing.md,
    },
    statsRow: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: spacing.lg,
    },
    statBox: { flex: 1, alignItems: 'center', gap: 2 },
    statSep: { width: 1, backgroundColor: c.border, marginVertical: spacing.xs },
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing.md,
      gap: spacing.sm,
    },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    emoji: { fontSize: 22, lineHeight: 28, width: 28 },
    roleBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      backgroundColor: c.bg,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: c.border,
    },
    playerSection: { gap: spacing.xs, marginTop: spacing.xs },
    playerList: { gap: spacing.xs },
    playerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
  });
}
