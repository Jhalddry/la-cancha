import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChatCircle,
  CheckCircle,
  DotsThreeVertical,
  MapPin,
  SoccerBall,
  UserPlus,
} from 'phosphor-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { Stars } from '@/components/ui/Stars';
import { Text } from '@/components/ui/Text';
import { mockMatches } from '@/data/matches';
import { mockCurrentUser, mockPlayers } from '@/data/players';
import { MatchTypeBadge } from '@/features/match/MatchTypeBadge';
import { formatMatchTime, labelModality, labelPosition, labelSport } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';
import type { Sport } from '@/types/domain';

const SPORT_EMOJIS: Record<Sport, string> = {
  futbol: '⚽',
  tenis: '🎾',
  padel: '🏓',
  beachTennis: '🏖️',
  basket: '🏀',
};

const SKILL_LABEL: Record<number, string> = {
  1: 'Principiante',
  2: 'Básico',
  3: 'Intermedio',
  4: 'Avanzado',
  5: 'Competitivo',
};

export default function PlayerProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const all = [...mockPlayers, mockCurrentUser];
  const player = all.find((p) => p.id === id) ?? mockPlayers[0];

  const [inviteOpen, setInviteOpen] = useState(false);
  const [invitedMatchId, setInvitedMatchId] = useState<string | null>(null);

  const recentMatches = mockMatches
    .filter(
      (m) =>
        m.organizer.id === player.id ||
        m.joinedPlayers.some((p) => p.id === player.id),
    )
    .slice(0, 3);

  const myUpcomingMatches = mockMatches.filter(
    (m) =>
      m.organizer.id === mockCurrentUser.id &&
      new Date(m.startsAt).getTime() > Date.now(),
  );

  return (
    <Screen edges={['top']}>
      <BackHeader
        title=""
        transparent
        trailing={
          <PressableScale style={styles.menuBtn} scaleTo={0.9}>
            <DotsThreeVertical size={22} color={colors.textPrimary} weight="bold" />
          </PressableScale>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <Avatar name={player.name} size={88} />
          <Text variant="h2" color="textPrimary" style={styles.heroName}>
            {player.name}
          </Text>
          {player.username ? (
            <Text variant="body" color="textTertiary">
              @{player.username}
            </Text>
          ) : null}

          <View style={styles.heroMeta}>
            <View style={styles.skillBadge}>
              <Stars level={player.skillLevel} size={13} />
              <Text variant="caption" color="textSecondary">
                {SKILL_LABEL[player.skillLevel]}
              </Text>
            </View>
            {player.verified ? (
              <View style={styles.verifiedBadge}>
                <CheckCircle size={13} color={colors.primary} weight="fill" />
                <Text variant="caption" color="primary">
                  Verificado
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.locationRow}>
            <MapPin size={12} color={colors.textTertiary} weight="fill" />
            <Text variant="small" color="textTertiary">
              Caracas, Venezuela
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsCard}>
          <StatBlock label="Partidas" value={String(player.matchesPlayed ?? 0)} />
          <View style={styles.statDivider} />
          <StatBlock label="Organizadas" value={String(player.matchesOrganized ?? 0)} />
          <View style={styles.statDivider} />
          <StatBlock label="Asistencia" value={`${player.attendancePct ?? 100}%`} />
          <View style={styles.statDivider} />
          <StatBlock
            label="Reputación"
            value={player.reputation?.toFixed(1) ?? '—'}
            accent
          />
        </View>

        {/* Sports */}
        {player.sports.length > 0 ? (
          <View style={styles.section}>
            <Text variant="caption" color="textSecondary" style={styles.sectionLabel}>
              Deportes favoritos
            </Text>
            <View style={styles.sportsRow}>
              {player.sports.map((s) => (
                <View key={s} style={styles.sportItem}>
                  <View style={styles.sportCircle}>
                    <Text style={styles.sportEmoji}>{SPORT_EMOJIS[s]}</Text>
                  </View>
                  <Text variant="caption" color="textSecondary">
                    {labelSport(s)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Positions */}
        {player.positions.length > 0 ? (
          <View style={styles.section}>
            <Text variant="caption" color="textSecondary" style={styles.sectionLabel}>
              Posiciones
            </Text>
            <View style={styles.chipsWrap}>
              {player.positions.map((p) => (
                <Chip key={p} label={labelPosition(p)} selected />
              ))}
            </View>
          </View>
        ) : null}

        {/* Bio */}
        {player.bio ? (
          <View style={styles.section}>
            <Text variant="caption" color="textSecondary" style={styles.sectionLabel}>
              Sobre mí
            </Text>
            <Text variant="body" color="textPrimary" style={styles.bioText}>
              {player.bio}
            </Text>
          </View>
        ) : null}

        {/* Badges */}
        {player.badges && player.badges.length > 0 ? (
          <View style={styles.section}>
            <Text variant="caption" color="textSecondary" style={styles.sectionLabel}>
              Insignias
            </Text>
            <View style={styles.badgesWrap}>
              {player.badges.map((b) => (
                <View key={b} style={styles.badgeChip}>
                  <CheckCircle size={13} color={colors.primary} weight="fill" />
                  <Text variant="smallMedium" color="primary">
                    {b}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Recent matches */}
        {recentMatches.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text variant="caption" color="textSecondary">
                Partidos recientes
              </Text>
              <Text variant="caption" color="primary">
                Ver todos
              </Text>
            </View>
            <View style={styles.recentList}>
              {recentMatches.map((m) => (
                <PressableScale
                  key={m.id}
                  style={styles.recentCard}
                  scaleTo={0.97}
                  onPress={() => router.push(`/match/${m.id}`)}
                >
                  <Text style={styles.recentEmoji}>{SPORT_EMOJIS[m.sport]}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={styles.recentTop}>
                      <Text variant="bodyMedium" color="textPrimary">
                        {labelSport(m.sport)}
                      </Text>
                      <MatchTypeBadge type={m.type} />
                    </View>
                    <Text variant="small" color="textSecondary">
                      {m.location.name} · {formatMatchTime(m.startsAt)}
                    </Text>
                  </View>
                </PressableScale>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Enviar mensaje"
          variant="secondary"
          onPress={() => router.push(`/chat/${player.id}`)}
          leading={<ChatCircle size={18} color={colors.textPrimary} weight="fill" />}
        />
        <Button
          label="Invitar a jugar"
          onPress={() => setInviteOpen(true)}
          leading={<UserPlus size={18} color={colors.bg} weight="fill" />}
        />
      </View>

      <Sheet
        visible={inviteOpen}
        onClose={() => { setInviteOpen(false); setInvitedMatchId(null); }}
        title={`Invitar a ${player.name}`}
      >
        {myUpcomingMatches.length === 0 ? (
          <EmptyState
            icon={<SoccerBall size={32} color={colors.primary} weight="fill" />}
            title="Sin partidas activas"
            description="Crea una partida primero para poder invitar jugadores."
          />
        ) : (
          <View style={styles.inviteList}>
            {myUpcomingMatches.map((m) => (
              <PressableScale
                key={m.id}
                style={[
                  styles.inviteRow,
                  invitedMatchId === m.id ? styles.inviteRowActive : null,
                ]}
                scaleTo={0.98}
                onPress={() => setInvitedMatchId(m.id)}
              >
                <Text style={styles.inviteEmoji}>{SPORT_EMOJIS[m.sport]}</Text>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium" color="textPrimary">
                    {labelModality(m.modality)}
                  </Text>
                  <Text variant="small" color="textSecondary">
                    {m.location.name} · {formatMatchTime(m.startsAt)}
                  </Text>
                </View>
                {invitedMatchId === m.id ? (
                  <CheckCircle size={20} color={colors.primary} weight="fill" />
                ) : null}
              </PressableScale>
            ))}
            <Button
              label="Enviar invitación"
              disabled={!invitedMatchId}
              onPress={() => { setInviteOpen(false); setInvitedMatchId(null); }}
            />
          </View>
        )}
      </Sheet>
    </Screen>
  );
}

function StatBlock({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.statBlock}>
      <Text variant="h2" color={accent ? 'primary' : 'textPrimary'}>
        {value}
      </Text>
      <Text variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 140,
    gap: spacing.xl,
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: { alignItems: 'center', gap: spacing.sm },
  heroName: { marginTop: spacing.sm },
  heroMeta: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' },
  skillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
  },
  statBlock: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  section: { gap: spacing.sm },
  sectionLabel: { marginBottom: 2 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sportsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  sportItem: { alignItems: 'center', gap: spacing.xs, width: 56 },
  sportCircle: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sportEmoji: { fontSize: 22, lineHeight: 28 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  bioText: { lineHeight: 22 },
  badgesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  recentList: { gap: spacing.sm },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 64,
  },
  recentEmoji: { fontSize: 22, lineHeight: 28, width: 32 },
  recentTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
  inviteList: { gap: spacing.md, paddingBottom: spacing.md },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 64,
  },
  inviteRowActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  inviteEmoji: { fontSize: 22, lineHeight: 28, width: 32 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
});
