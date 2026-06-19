import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  CalendarCheck,
  ChatCircle,
  Check,
  CheckCircle,
  Crown,
  DotsThreeVertical,
  Flag,
  MapPin,
  Prohibit,
  SealCheck,
  ShareNetwork,
  Shield,
  ShieldStar,
  SoccerBall,
  Star,
  Trophy,
  UserPlus,
  WarningCircle,
} from 'phosphor-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TextInput as RNTextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { Avatar } from '@/components/ui/Avatar';
import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { Stars } from '@/components/ui/Stars';
import { Text } from '@/components/ui/Text';
import { MatchTypeBadge } from '@/features/match/MatchTypeBadge';
import { PlayerShareCard } from '@/features/match/PlayerShareCard';
import { PlayerPositions } from '@/components/feature/PlayerPositions';
import { useColors } from '@/hooks/useColors';
import { useInviteToMatch, useMatches, useMyMatches, usePlayerJoinedMatches, usePlayerOrganizedMatches } from '@/hooks/useMatches';
import { useProfile, usePlayerRatings, useVerifyPlayer } from '@/hooks/useProfiles';
import { formatMatchTime, labelModality, labelPosition, labelSport } from '@/lib/format';
import { useSession } from '@/store/session';
import { fonts, radius, spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';
import type { Sport } from '@/types/domain';

const VERIFIED_BLUE = '#1D9BF0';

const BADGE_META: Record<string, {
  color: string;
  icon: (size: number) => React.ReactNode;
  description: string;
  requirement: string;
}> = {
  'Debut':              {
    color: '#22C55E',
    icon: (n) => <SoccerBall size={n} color="#22C55E" weight="fill" />,
    description: 'Diste el primer paso. Completaste tu primera partida en La Cancha.',
    requirement: 'Únete y completa 1 partida.',
  },
  'Veterano':           {
    color: '#3B82F6',
    icon: (n) => <Shield size={n} color="#3B82F6" weight="fill" />,
    description: 'Jugador experimentado con historial probado en la cancha.',
    requirement: '10 partidas jugadas.',
  },
  'Veterano Elite':     {
    color: '#8B5CF6',
    icon: (n) => <ShieldStar size={n} color="#8B5CF6" weight="fill" />,
    description: 'Uno de los jugadores más activos de la plataforma. Nivel de élite.',
    requirement: '50 partidas jugadas.',
  },
  'Primera caimanera':  {
    color: '#F97316',
    icon: (n) => <Flag size={n} color="#F97316" weight="fill" />,
    description: 'Armaste tu primera caimanera. El barrio ya sabe quién convoca.',
    requirement: 'Organiza 1 partida.',
  },
  'Organizador':        {
    color: '#F59E0B',
    icon: (n) => <Crown size={n} color="#F59E0B" weight="fill" />,
    description: 'Organizador habitual que mantiene el juego vivo en la comunidad.',
    requirement: '5 partidas organizadas.',
  },
  'Organizador Elite':  {
    color: '#FF6B35',
    icon: (n) => <Trophy size={n} color="#FF6B35" weight="fill" />,
    description: 'Organizador de élite. Pilar de la comunidad con decenas de partidas.',
    requirement: '20 partidas organizadas.',
  },
  'Asistente Perfecto': {
    color: '#14B8A6',
    icon: (n) => <CalendarCheck size={n} color="#14B8A6" weight="fill" />,
    description: 'Siempre aparece cuando dice que va a jugar. Totalmente confiable.',
    requirement: '90% o más de asistencia con al menos 5 partidas jugadas.',
  },
  'Estrella':           {
    color: '#FFD93D',
    icon: (n) => <Star size={n} color="#FFD93D" weight="fill" />,
    description: 'Jugador muy bien valorado. La comunidad lo reconoce como referente.',
    requirement: '4.5+ estrellas de reputación con al menos 10 partidas.',
  },
};

const POSITIVE_TAGS = new Set([
  'Puntual', 'Fair Play', 'Buena actitud', 'Organizado', 'Nivel acorde', 'Buen compañero',
]);

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

const REPORT_REASONS = [
  'Comportamiento tóxico',
  'Impuntualidad',
  'Abandonó la partida',
  'Nivel no acorde al declarado',
  'No pagó',
  'Otro',
];

export default function PlayerProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useSession((st) => st.user?.id);
  const currentUser = useSession((st) => st.user);
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const { mutate: inviteToMatchMutate } = useInviteToMatch();
  const { mutate: verifyPlayer } = useVerifyPlayer();

  const { data: player, isLoading } = useProfile(id);
  const { data: playerRatings, isLoading: ratingsLoading } = usePlayerRatings(id);

  // Computed reputation from actual review data — overrides stale profile value
  const computedRep = useMemo(() => {
    if (!playerRatings || playerRatings.length === 0) return player?.reputation ?? null;
    return (
      Math.round(
        (playerRatings.reduce((s, r) => s + r.stars, 0) / playerRatings.length) * 10,
      ) / 10
    );
  }, [playerRatings, player?.reputation]);

  // Attendance derived from ratings tags
  const computedAttendance = useMemo(() => {
    if (!playerRatings || playerRatings.length === 0) return null;
    const attended = playerRatings.filter((r) => r.tags.includes('Asistió')).length;
    const missed = playerRatings.filter((r) => r.tags.includes('No asistió')).length;
    const total = attended + missed;
    if (total === 0) return null;
    return Math.round((attended / total) * 100);
  }, [playerRatings]);

  // Recent matches organised by this player
  const { data: organizedMatches } = useMatches(
    id ? { upcomingOnly: false } : {},
  );
  const recentMatches = useMemo(
    () =>
      (organizedMatches ?? [])
        .filter((m) => m.organizer.id === id)
        .slice(0, 3),
    [organizedMatches, id],
  );

  // Current user's upcoming created matches (for invite sheet)
  const { data: myMatches } = useMyMatches();
  const myUpcomingMatches = useMemo(
    () =>
      (myMatches?.created ?? []).filter(
        (m) => !m.startedAt && !m.endedAt && new Date(m.startsAt).getTime() > Date.now(),
      ),
    [myMatches],
  );

  const [partidasOpen, setPartidasOpen] = useState(false);
  const [organizadasOpen, setOrganizadasOpen] = useState(false);
  const [reputacionOpen, setReputacionOpen] = useState(false);

  const { data: joinedMatches = [], isLoading: joinedLoading } = usePlayerJoinedMatches(id, partidasOpen);
  const { data: organizedMatchesFull = [], isLoading: organizedLoading } = usePlayerOrganizedMatches(id, organizadasOpen);

  const [selectedBadge, setSelectedBadge] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invitedMatchId, setInvitedMatchId] = useState<string | null>(null);
  const [inviteConfirmOpen, setInviteConfirmOpen] = useState<{ matchId: string } | null>(null);
  const [messageLoading, setMessageLoading] = useState(false);
  const [noSharedMatch, setNoSharedMatch] = useState(false);

  const handleSendMessage = async () => {
    if (!id || !userId) return;
    setMessageLoading(true);
    try {
      const { fetchSharedMatchId } = await import('@/lib/chatApi');
      const matchId = await fetchSharedMatchId(userId, id);
      if (!matchId) {
        setNoSharedMatch(true);
      } else {
        router.push(`/chat/${matchId}`);
      }
    } finally {
      setMessageLoading(false);
    }
  };
  const shareCardRef = useRef<View>(null);

  const handleShare = async () => {
    try {
      const available = await Sharing.isAvailableAsync();
      if (available && shareCardRef.current) {
        const uri = await captureRef(shareCardRef, { format: 'png', quality: 0.95, result: 'tmpfile' });
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Compartir perfil' });
      }
    } catch {
      // user cancelled or capture failed
    }
  };

  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportDoneOpen, setReportDoneOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockDoneOpen, setBlockDoneOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [reportDetail, setReportDetail] = useState('');

  const closeReport = () => {
    setReportOpen(false);
    setReportReason(null);
    setReportDetail('');
  };

  const submitReport = () => {
    closeReport();
    setTimeout(() => setReportDoneOpen(true), 250);
  };

  const submitBlock = () => {
    setBlockOpen(false);
    setTimeout(() => setBlockDoneOpen(true), 250);
  };

  if (isLoading || !player) {
    return (
      <Screen edges={['top']}>
        <BackHeader title="" transparent />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.primary} size="large" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <BackHeader
        title=""
        transparent
        trailing={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <PressableScale style={s.menuBtn} scaleTo={0.9} onPress={handleShare}>
              <ShareNetwork size={20} color={c.textPrimary} weight="regular" />
            </PressableScale>
            {id !== userId ? (
              <PressableScale
                style={s.menuBtn}
                scaleTo={0.9}
                onPress={() => setMenuOpen(true)}
              >
                <DotsThreeVertical size={22} color={c.textPrimary} weight="bold" />
              </PressableScale>
            ) : null}
          </View>
        }
      />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={s.hero}>
          <View style={{ position: 'relative' }}>
            <Avatar name={player.name} uri={player.avatarUrl} size={96} />
            {player.verified ? (
              <View style={s.avatarVerifiedBadge}>
                <SealCheck size={22} color={VERIFIED_BLUE} weight="fill" />
              </View>
            ) : null}
          </View>

          <View style={s.heroText}>
            <Text variant="h2" color="textPrimary" style={{ textAlign: 'center' }}>
              {player.name}
            </Text>
            {player.username ? (
              <Text variant="body" color="textTertiary">
                @{player.username}
              </Text>
            ) : null}
          </View>

          {/* Badges row: skill (dots, not stars) + verified */}
          <View style={s.heroMeta}>
            <View style={s.skillBadge}>
              <SkillDots level={player.skillLevel} c={c} />
              <Text variant="caption" color="textSecondary">
                Nivel · {SKILL_LABEL[player.skillLevel]}
              </Text>
            </View>
          </View>

          {player.city ? (
            <View style={s.locationRow}>
              <MapPin size={12} color={c.textTertiary} weight="fill" />
              <Text variant="small" color="textTertiary">
                {player.city}, Venezuela
              </Text>
            </View>
          ) : null}
        </View>

        {/* Stats */}
        <View style={s.statsCard}>
          <StatBlock
            label="Partidas"
            value={String(player.matchesPlayed ?? 0)}
            onPress={() => setPartidasOpen(true)}
          />
          <View style={s.statDivider} />
          <StatBlock
            label="Organizadas"
            value={String(player.matchesOrganized ?? 0)}
            onPress={() => setOrganizadasOpen(true)}
          />
          <View style={s.statDivider} />
          <StatBlock
            label="Asistencia"
            value={computedAttendance != null ? `${computedAttendance}%` : '—'}
          />
          <View style={s.statDivider} />
          <StatBlock
            label="Reputación"
            value={computedRep != null ? computedRep.toFixed(1) : '—'}
            accent
            stars={computedRep ?? undefined}
            onPress={() => setReputacionOpen(true)}
          />
        </View>

        {/* Sports */}
        {player.sports.length > 0 ? (
          <View style={s.section}>
            <Text variant="caption" color="textSecondary" style={s.sectionLabel}>
              Deportes favoritos
            </Text>
            <View style={s.sportsRow}>
              {player.sports.map((sp) => (
                <View key={sp} style={s.sportItem}>
                  <View style={s.sportCircle}>
                    <Text style={s.sportEmoji}>{SPORT_EMOJIS[sp]}</Text>
                  </View>
                  <Text variant="caption" color="textSecondary">
                    {labelSport(sp)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Positions */}
        {player.sports.length > 0 ? (
          <View style={s.section}>
            <Text variant="caption" color="textSecondary" style={s.sectionLabel}>
              Posiciones
            </Text>
            <PlayerPositions sports={player.sports} positions={player.positions} />
          </View>
        ) : null}

        {/* Bio */}
        {player.bio ? (
          <View style={s.section}>
            <Text variant="caption" color="textSecondary" style={s.sectionLabel}>
              Sobre mí
            </Text>
            <Card>
              <Text variant="body" color="textPrimary" style={s.bioText}>
                {player.bio}
              </Text>
            </Card>
          </View>
        ) : null}

        {/* Badges */}
        {player.badges && player.badges.length > 0 ? (
          <View style={s.section}>
            <Text variant="caption" color="textSecondary" style={s.sectionLabel}>
              Insignias
            </Text>
            <View style={s.badgesWrap}>
              {player.badges.map((b, i) => (
                <ShimmerBadge key={b} label={b} delay={i * 300} onPress={() => setSelectedBadge(b)} />
              ))}
            </View>
          </View>
        ) : null}

        {/* Recent matches organised by this player */}
        {recentMatches.length > 0 ? (
          <View style={s.section}>
            <Text variant="caption" color="textSecondary" style={s.sectionLabel}>
              Partidos recientes
            </Text>
            <View style={s.recentList}>
              {recentMatches.map((m) => (
                <PressableScale
                  key={m.id}
                  style={s.recentCard}
                  scaleTo={0.97}
                  onPress={() => router.push(`/match/${m.id}`)}
                >
                  <Text style={s.recentEmoji}>{SPORT_EMOJIS[m.sport]}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={s.recentTop}>
                      <Text variant="bodyMedium" color="textPrimary">
                        {labelModality(m.modality)}
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
        {/* Reseñas */}
        {!ratingsLoading ? (
          <View style={s.section}>
            {/* Header */}
            <View style={s.reviewsHeader}>
              <View>
                <Text variant="caption" color="textSecondary">
                  RESEÑAS{playerRatings && playerRatings.length > 0 ? ` (${playerRatings.length})` : ''}
                </Text>
              </View>
              {computedRep != null ? (
                <PressableScale scaleTo={0.95} onPress={() => setReputacionOpen(true)}>
                  <View style={s.reviewsRating}>
                    <Star size={13} color={c.seria} weight="fill" />
                    <Text variant="bodySemibold" color="primary">{computedRep.toFixed(1)}</Text>
                    <Text variant="caption" color="textTertiary">
                      ({playerRatings?.length ?? 0} reseñas)
                    </Text>
                  </View>
                </PressableScale>
              ) : null}
            </View>

            {playerRatings && playerRatings.length > 0 ? (
              <View style={s.reviewList}>
                {/* Summary bars */}
                <ReviewSummaryBars ratings={playerRatings} c={c} s={s} />

                {/* Review cards */}
                {playerRatings.slice(0, 3).map((r, i) => (
                  <ReviewCard
                    key={r.id}
                    r={r}
                    isLast={i === Math.min(playerRatings.length, 3) - 1}
                    c={c}
                    s={s}
                  />
                ))}

                {playerRatings.length > 3 ? (
                  <PressableScale scaleTo={0.97} onPress={() => setReputacionOpen(true)}>
                    <Text variant="smallMedium" color="primary" style={{ textAlign: 'center', paddingVertical: spacing.xs }}>
                      Ver todas las reseñas →
                    </Text>
                  </PressableScale>
                ) : null}
              </View>
            ) : (
              <Card>
                <Text variant="small" color="textTertiary" style={{ textAlign: 'center' }}>
                  Sin reseñas aún
                </Text>
              </Card>
            )}
          </View>
        ) : null}
      </ScrollView>

      {/* Footer — only show when viewing another user's profile */}
      {id !== userId ? (
        <View style={s.footer}>
          <Button
            label={messageLoading ? 'Buscando…' : 'Enviar mensaje'}
            variant="secondary"
            onPress={handleSendMessage}
            disabled={messageLoading}
            leading={<ChatCircle size={18} color={c.textPrimary} weight="fill" />}
          />
          <Button
            label="Invitar a jugar"
            onPress={() => setInviteOpen(true)}
            leading={<UserPlus size={18} color={c.bg} weight="fill" />}
          />
        </View>
      ) : null}

      {/* ── Sheets ── */}

      <Sheet visible={noSharedMatch} onClose={() => setNoSharedMatch(false)}>
        <View style={s.doneBody}>
          <View style={[s.doneIcon, { backgroundColor: c.surface }]}>
            <ChatCircle size={36} color={c.textTertiary} weight="regular" />
          </View>
          <Text variant="h3" color="textPrimary">Sin partida compartida</Text>
          <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
            Solo puedes chatear con jugadores con quienes hayas compartido una partida.
          </Text>
          <Button label="Entendido" onPress={() => setNoSharedMatch(false)} />
        </View>
      </Sheet>

      <Sheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={`Opciones de ${player.name}`}
      >
        <View style={s.menuList}>
          <PressableScale
            style={s.menuRow}
            scaleTo={0.98}
            onPress={() => {
              setMenuOpen(false);
              setTimeout(() => setReportOpen(true), 250);
            }}
          >
            <View style={[s.menuIcon, { backgroundColor: `${c.alert}22` }]}>
              <Flag size={18} color={c.alert} weight="fill" />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium" color="alert">Reportar jugador</Text>
              <Text variant="small" color="textSecondary">
                Avísanos si vive comportamiento indebido
              </Text>
            </View>
          </PressableScale>

          <PressableScale
            style={s.menuRow}
            scaleTo={0.98}
            onPress={() => {
              setMenuOpen(false);
              setTimeout(() => setBlockOpen(true), 250);
            }}
          >
            <View style={[s.menuIcon, { backgroundColor: `${c.alert}22` }]}>
              <Prohibit size={18} color={c.alert} weight="bold" />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium" color="alert">Bloquear</Text>
              <Text variant="small" color="textSecondary">
                No verás más partidas ni mensajes de este jugador
              </Text>
            </View>
          </PressableScale>
        </View>
      </Sheet>

      <Sheet visible={reportOpen} onClose={closeReport} title={`Reportar a ${player.name}`}>
        <View style={s.reportBody}>
          <Text variant="caption" color="textSecondary">Motivo del reporte</Text>
          <View style={s.reasonList}>
            {REPORT_REASONS.map((r) => {
              const selected = reportReason === r;
              return (
                <PressableScale
                  key={r}
                  scaleTo={0.98}
                  onPress={() => setReportReason(r)}
                  style={[s.reasonRow, selected ? s.reasonRowActive : null]}
                >
                  <View style={[s.radio, selected ? s.radioOn : null]}>
                    {selected ? <View style={s.radioDot} /> : null}
                  </View>
                  <Text
                    variant="bodyMedium"
                    color={selected ? 'alert' : 'textPrimary'}
                    style={{ flex: 1 }}
                  >
                    {r}
                  </Text>
                </PressableScale>
              );
            })}
          </View>

          <Text variant="caption" color="textSecondary" style={{ marginTop: spacing.sm }}>
            Detalles adicionales (opcional)
          </Text>
          <View style={s.textareaWrap}>
            <RNTextInput
              style={s.textarea}
              placeholder="Describe lo que ocurrió..."
              placeholderTextColor={c.textTertiary}
              multiline
              numberOfLines={3}
              value={reportDetail}
              onChangeText={(v) => setReportDetail(v.slice(0, 240))}
              textAlignVertical="top"
            />
            <Text variant="caption" color="textTertiary" style={{ alignSelf: 'flex-end' }}>
              {reportDetail.length}/240
            </Text>
          </View>

          <View style={s.reportActions}>
            <Button label="Cancelar" variant="secondary" onPress={closeReport} style={{ flex: 1 }} />
            <Button
              label="Enviar reporte"
              disabled={!reportReason}
              onPress={submitReport}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </Sheet>

      <Sheet visible={blockOpen} onClose={() => setBlockOpen(false)} title={`Bloquear a ${player.name}?`}>
        <View style={s.blockBody}>
          <View style={s.blockIconWrap}>
            <Prohibit size={48} color={c.alert} weight="bold" />
          </View>
          <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
            {player.name} no podrá unirse a tus partidas, enviarte mensajes ni verá tu perfil.
            Puedes desbloquearlo desde ajustes.
          </Text>
          <View style={s.blockActions}>
            <Button label="Cancelar" variant="secondary" onPress={() => setBlockOpen(false)} style={{ flex: 1 }} />
            <Button label="Bloquear" onPress={submitBlock} style={{ flex: 1, backgroundColor: c.alert }} />
          </View>
        </View>
      </Sheet>

      <Sheet visible={reportDoneOpen} onClose={() => setReportDoneOpen(false)}>
        <View style={s.doneBody}>
          <View style={[s.doneIcon, { backgroundColor: c.primarySoft }]}>
            <Check size={36} color={c.primary} weight="bold" />
          </View>
          <Text variant="h3" color="textPrimary">Reporte enviado</Text>
          <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
            Revisaremos el comportamiento de {player.name} en las próximas 24h.
          </Text>
          <Button label="Entendido" onPress={() => setReportDoneOpen(false)} />
        </View>
      </Sheet>

      <Sheet visible={blockDoneOpen} onClose={() => setBlockDoneOpen(false)}>
        <View style={s.doneBody}>
          <View style={[s.doneIcon, { backgroundColor: `${c.alert}22` }]}>
            <Prohibit size={36} color={c.alert} weight="bold" />
          </View>
          <Text variant="h3" color="textPrimary">Jugador bloqueado</Text>
          <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
            {player.name} ya no podrá unirse a tus partidas ni enviarte mensajes.
          </Text>
          <Button label="Entendido" onPress={() => setBlockDoneOpen(false)} />
        </View>
      </Sheet>

      <Sheet
        visible={inviteOpen}
        onClose={() => { setInviteOpen(false); setInvitedMatchId(null); }}
        title={`Invitar a ${player.name}`}
      >
        {myUpcomingMatches.length === 0 ? (
          <EmptyState
            icon={<SoccerBall size={32} color={c.primary} weight="fill" />}
            title="Sin partidas activas"
            description="Crea una partida primero para poder invitar jugadores."
          />
        ) : (
          <View style={s.inviteList}>
            {myUpcomingMatches.map((m) => (
              <PressableScale
                key={m.id}
                style={[s.inviteRow, invitedMatchId === m.id ? s.inviteRowActive : null]}
                scaleTo={0.98}
                onPress={() => setInvitedMatchId(m.id)}
              >
                <Text style={s.inviteEmoji}>{SPORT_EMOJIS[m.sport]}</Text>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium" color="textPrimary">
                    {labelModality(m.modality)}
                  </Text>
                  <Text variant="small" color="textSecondary">
                    {m.location.name} · {formatMatchTime(m.startsAt)}
                  </Text>
                </View>
                {invitedMatchId === m.id ? (
                  <CheckCircle size={20} color={c.primary} weight="fill" />
                ) : null}
              </PressableScale>
            ))}
            <Button
              label="Enviar invitación"
              disabled={!invitedMatchId}
              onPress={() => {
                if (!invitedMatchId) return;
                setInviteOpen(false);
                setTimeout(() => setInviteConfirmOpen({ matchId: invitedMatchId }), 300);
              }}
            />
          </View>
        )}
      </Sheet>
      {/* ── Partidas sheet ──────────────────────────── */}
      <Sheet
        visible={partidasOpen}
        onClose={() => setPartidasOpen(false)}
        title={`Partidas de ${player?.name ?? ''}`}
      >
        <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
          <View style={{ gap: spacing.xs, paddingBottom: spacing.xl }}>
            {joinedLoading ? (
              <ActivityIndicator color={c.primary} style={{ marginVertical: spacing.xl }} />
            ) : joinedMatches.length === 0 ? (
              <Text variant="body" color="textTertiary" style={{ textAlign: 'center', padding: spacing.lg }}>
                Sin partidas registradas
              </Text>
            ) : joinedMatches.map((m) => (
              <PressableScale
                key={m.id}
                style={s.sheetMatchRow}
                scaleTo={0.97}
                onPress={() => { setPartidasOpen(false); setTimeout(() => router.push(`/match/${m.id}`), 200); }}
              >
                <Text style={s.recentEmoji}>{SPORT_EMOJIS[m.sport] ?? '🏅'}</Text>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium" color="textPrimary">{labelModality(m.modality)}</Text>
                  <Text variant="small" color="textSecondary">{m.location.name} · {formatMatchTime(m.startsAt)}</Text>
                </View>
                <MatchTypeBadge type={m.type} />
              </PressableScale>
            ))}
          </View>
        </ScrollView>
      </Sheet>

      {/* ── Organizadas sheet ───────────────────────── */}
      <Sheet
        visible={organizadasOpen}
        onClose={() => setOrganizadasOpen(false)}
        title={`Partidas organizadas por ${player?.name ?? ''}`}
      >
        <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
          <View style={{ gap: spacing.xs, paddingBottom: spacing.xl }}>
            {organizedLoading ? (
              <ActivityIndicator color={c.primary} style={{ marginVertical: spacing.xl }} />
            ) : organizedMatchesFull.length === 0 ? (
              <Text variant="body" color="textTertiary" style={{ textAlign: 'center', padding: spacing.lg }}>
                Sin partidas organizadas
              </Text>
            ) : organizedMatchesFull.map((m) => (
              <PressableScale
                key={m.id}
                style={s.sheetMatchRow}
                scaleTo={0.97}
                onPress={() => { setOrganizadasOpen(false); setTimeout(() => router.push(`/match/${m.id}`), 200); }}
              >
                <Text style={s.recentEmoji}>{SPORT_EMOJIS[m.sport] ?? '🏅'}</Text>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium" color="textPrimary">{labelModality(m.modality)}</Text>
                  <Text variant="small" color="textSecondary">{m.location.name} · {formatMatchTime(m.startsAt)}</Text>
                </View>
                <MatchTypeBadge type={m.type} />
              </PressableScale>
            ))}
          </View>
        </ScrollView>
      </Sheet>

      {/* ── Reputación / todas las reseñas sheet ─────── */}
      <Sheet
        visible={reputacionOpen}
        onClose={() => setReputacionOpen(false)}
        title="Reseñas recibidas"
      >
        <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
          <View style={{ gap: spacing.sm, paddingBottom: spacing.xl }}>
            {!playerRatings || playerRatings.length === 0 ? (
              <Text variant="body" color="textTertiary" style={{ textAlign: 'center', padding: spacing.lg }}>
                Sin reseñas aún
              </Text>
            ) : (
              <>
                <ReviewSummaryBars ratings={playerRatings} c={c} s={s} />
                {playerRatings.map((r, i) => (
                  <ReviewCard
                    key={r.id}
                    r={r}
                    isLast={i === playerRatings.length - 1}
                    c={c}
                    s={s}
                  />
                ))}
              </>
            )}
          </View>
        </ScrollView>
      </Sheet>

      <ConfirmSheet
        visible={inviteConfirmOpen !== null}
        onClose={() => { setInviteConfirmOpen(null); setInvitedMatchId(null); }}
        title="Invitar a jugar"
        description={`¿Enviar invitación a ${player?.name ?? ''}? Recibirá una notificación con el enlace a la partida.`}
        confirmLabel="Enviar invitación"
        confirmColor={c.primary}
        onConfirm={() => {
          if (!inviteConfirmOpen) return;
          const m = myUpcomingMatches.find((match) => match.id === inviteConfirmOpen.matchId);
          if (!m || !player) return;
          inviteToMatchMutate({
            matchId: inviteConfirmOpen.matchId,
            inviteeId: player.id,
            organizerName: currentUser?.name ?? '',
            sport: m.sport,
            modality: m.modality,
          });
          setInvitedMatchId(null);
        }}
      />

      {/* Badge info sheet */}
      {selectedBadge ? (
        <Sheet visible={!!selectedBadge} onClose={() => setSelectedBadge(null)} title="Insignia">
          <View style={{ gap: spacing.lg, paddingBottom: spacing.md, alignItems: 'center' }}>
            {(() => {
              const meta = BADGE_META[selectedBadge] ?? {
                color: '#7BFF00',
                icon: (n: number) => <Star size={n} color="#7BFF00" weight="fill" />,
                description: '',
                requirement: '',
              };
              const { color, icon, description, requirement } = meta;
              return (
                <>
                  <View style={{
                    width: 80, height: 80, borderRadius: 40,
                    backgroundColor: `${color}18`,
                    borderWidth: 1.5, borderColor: `${color}70`,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {icon(40)}
                  </View>
                  <Text variant="h3" color="textPrimary" style={{ textAlign: 'center' }}>{selectedBadge}</Text>
                  <Text variant="body" color="textSecondary" style={{ textAlign: 'center', lineHeight: 22 }}>
                    {description}
                  </Text>
                  <View style={{
                    width: '100%',
                    backgroundColor: `${color}12`,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: `${color}30`,
                    padding: spacing.md,
                    gap: spacing.xs,
                  }}>
                    <Text variant="smallMedium" style={{ color }}>¿Cómo obtenerla?</Text>
                    <Text variant="body" color="textPrimary">{requirement}</Text>
                  </View>
                </>
              );
            })()}
          </View>
        </Sheet>
      ) : null}

      {/* Off-screen share card — rendered for captureRef, never visible to user */}
      <View ref={shareCardRef} style={s.offScreen} pointerEvents="none">
        <PlayerShareCard player={player} width={320} />
      </View>
    </Screen>
  );
}

function ShimmerBadge({ label, delay = 0, onPress }: { label: string; c?: ColorPalette; delay?: number; onPress?: () => void }) {
  const meta = BADGE_META[label] ?? {
    color: '#7BFF00',
    icon: (n: number) => <Star size={n} color="#7BFF00" weight="fill" />,
    description: '',
    requirement: '',
  };
  const { color, icon } = meta;
  const translateX = useSharedValue(-120);
  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(220, { duration: 2400 }),
      -1,
      false,
    );
    return () => cancelAnimation(translateX);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value + delay * -0.5 }],
  }));
  const s = badgeShimmerStyle;
  return (
    <PressableScale onPress={onPress ?? (() => {})} scaleTo={0.93}>
      <LinearGradient
        colors={[`${color}22`, `${color}50`, `${color}22`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.chip, { borderColor: `${color}80`, overflow: 'hidden' }]}
      >
        <Animated.View style={[StyleSheet.absoluteFill, shimmerStyle, { width: 80 }]} pointerEvents="none">
          <LinearGradient
            colors={['transparent', `${color}60`, 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
        {icon(13)}
        <Text variant="smallMedium" style={{ color }}>{label}</Text>
      </LinearGradient>
    </PressableScale>
  );
}

const badgeShimmerStyle = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
});

function AnimatedNumber({ value }: { value: string }) {
  const numericEnd = parseFloat(value.replace('%', ''));
  const isNum = !isNaN(numericEnd) && value !== '—';
  const [display, setDisplay] = useState(isNum ? '0' : value);

  useEffect(() => {
    if (!isNum) return;
    const duration = 800;
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * numericEnd;
      if (value.includes('%')) setDisplay(`${Math.round(current)}%`);
      else if (value.includes('.')) setDisplay(current.toFixed(1));
      else setDisplay(String(Math.round(current)));
      if (progress >= 1) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return display;
}

/** Skill level as filled/empty dots — visually distinct from star ratings */
function SkillDots({ level, c }: { level: number; c: ColorPalette }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <View
          key={n}
          style={{
            width: 7,
            height: 7,
            borderRadius: 3.5,
            backgroundColor: n <= level ? c.primary : c.border,
          }}
        />
      ))}
    </View>
  );
}

function StatBlock({
  label,
  value,
  accent,
  onPress,
  stars,
}: {
  label: string;
  value: string;
  accent?: boolean;
  onPress?: () => void;
  stars?: number;
}) {
  return (
    <TouchableOpacity
      style={[staticStyles.statBlock, onPress ? staticStyles.tappable : null]}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
    >
      <Text variant="h2" color={accent ? 'primary' : 'textPrimary'}>
        <AnimatedNumber value={value} />
      </Text>
      {stars != null ? (
        <Stars level={stars} size={11} />
      ) : null}
      <Text variant="caption" color={onPress ? 'primary' : 'textSecondary'} style={{ textAlign: 'center' }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const staticStyles = StyleSheet.create({
  statBlock: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: spacing.xs },
  tappable: { opacity: 1 },
});

// ─── Review sub-components ────────────────────────────────────────────────────

type StylesType = ReturnType<typeof makeStyles>;
type RatingRow = import('@/lib/ratingsApi').RatingRow;

const SUMMARY_ATTRS: { label: string; positive: string[]; negative: string[] }[] = [
  { label: 'Puntualidad',  positive: ['Puntual'],                        negative: ['Impuntual'] },
  { label: 'Fair Play',    positive: ['Fair Play'],                      negative: ['Tóxico', 'Abandonó'] },
  { label: 'Actitud',      positive: ['Buena actitud', 'Organizado'],    negative: ['Tóxico', 'Abandonó'] },
  { label: 'Compañerismo', positive: ['Buen compañero', 'Nivel acorde'], negative: ['Nivel no acorde'] },
];

function attrPct(ratings: RatingRow[], positive: string[], negative: string[]): number | null {
  let pos = 0, neg = 0;
  for (const r of ratings) {
    const hasPos = positive.some((t) => r.tags.includes(t));
    const hasNeg = negative.some((t) => r.tags.includes(t));
    if (hasPos) pos++;
    else if (hasNeg) neg++;
  }
  const total = pos + neg;
  if (total === 0) return null;
  return Math.round((pos / total) * 100);
}

function attrColor(pct: number | null, c: ColorPalette): string {
  if (pct == null) return c.border;
  if (pct >= 75) return c.primary;   // green — good
  if (pct >= 40) return c.seria;     // amber — fair
  return c.alert;                    // red — bad
}

function AnimatedBar({ pct, color, borderColor, s }: { pct: number | null; color: string; borderColor: string; s: StylesType }) {
  const fillWidth = useSharedValue(0);
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    if (trackWidth > 0 && pct != null) {
      fillWidth.value = withTiming((pct / 100) * trackWidth, { duration: 600 });
    }
  }, [trackWidth, pct, fillWidth]);

  const fillStyle = useAnimatedStyle(() => ({ width: fillWidth.value }));

  return (
    <View
      style={[s.summaryTrack, { backgroundColor: borderColor }]}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
    >
      {pct != null ? (
        <Animated.View style={[s.summaryFill, { backgroundColor: color }, fillStyle]} />
      ) : null}
    </View>
  );
}

function ReviewSummaryBars({
  ratings, c, s,
}: { ratings: RatingRow[]; c: ColorPalette; s: StylesType }) {
  if (ratings.length === 0) return null;
  return (
    <View style={s.summaryContainer}>
      {SUMMARY_ATTRS.map(({ label, positive, negative }) => {
        const pct = attrPct(ratings, positive, negative);
        const color = attrColor(pct, c);
        return (
          <View key={label} style={s.summaryRow}>
            <Text variant="caption" color="textSecondary" style={s.summaryLabel}>{label}</Text>
            <AnimatedBar pct={pct} color={color} borderColor={c.border} s={s} />
            <Text
              variant="caption"
              style={[s.summaryPct, { color: pct != null ? color : c.textTertiary }]}
            >
              {pct != null ? `${pct}%` : '—'}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function ReviewCard({
  r, isLast, c, s,
}: { r: RatingRow; isLast: boolean; c: ColorPalette; s: StylesType }) {
  return (
    <View style={[s.reviewCard, isLast && { borderBottomWidth: 0 }]}>
      {/* Header */}
      <View style={s.reviewTop}>
        <Avatar name={r.raterName} uri={r.raterAvatarUrl} size={36} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyMedium" color="textPrimary">{r.raterName}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Star size={11} color={c.seria} weight="fill" />
            <Text variant="caption" color="textSecondary">{r.stars}</Text>
          </View>
        </View>
        <Text variant="caption" color="textTertiary">
          {new Date(r.createdAt).toLocaleDateString('es-VE', { day: 'numeric', month: 'short' }).toUpperCase()}
        </Text>
      </View>

      {/* Comment — primary element */}
      {r.comment ? (
        <Text variant="small" color="textSecondary" style={s.reviewComment}>
          {r.comment}
        </Text>
      ) : null}

      {/* Tags — subtle, no color */}
      {r.tags.length > 0 ? (
        <View style={s.reviewTags}>
          {r.tags.map((t, tIdx) => {
            const pos = POSITIVE_TAGS.has(t);
            return (
              <View key={`${tIdx}-${t}`} style={s.reviewTag}>
                {pos
                  ? <Check size={10} color={c.textTertiary} weight="bold" />
                  : <WarningCircle size={10} color={c.textTertiary} weight="bold" />
                }
                <Text variant="caption" color="textTertiary">{t}</Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    scroll: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: 200,
      gap: spacing.xl,
    },
    offScreen: { position: 'absolute', left: -9999, top: 0 },
    menuBtn: {
      width: 40,
      height: 40,
      borderRadius: radius.full,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hero: { alignItems: 'center', gap: spacing.md },
    heroText: { alignItems: 'center', gap: 2 },
    heroMeta: {
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'center',
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    skillBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      backgroundColor: c.surface,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: c.border,
    },
    avatarVerifiedBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: c.bg,
      borderRadius: radius.full,
      padding: 2,
    },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statsCard: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: spacing.lg,
    },
    statDivider: { width: 1, backgroundColor: c.border, marginVertical: spacing.xs },
    section: { gap: spacing.sm },
    sectionLabel: { marginBottom: 2 },
    sectionHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sportsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
    sportItem: { alignItems: 'center', gap: spacing.xs, width: 56 },
    sportCircle: {
      width: 52,
      height: 52,
      borderRadius: radius.full,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
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
      backgroundColor: c.primarySoft,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: c.primary,
    },
    recentList: { gap: spacing.sm },
    recentCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      minHeight: 64,
    },
    recentEmoji: { fontSize: 22, lineHeight: 28, width: 32 },
    recentTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: 2,
    },
    reportBody: { gap: spacing.sm, paddingBottom: spacing.md },
    reasonList: { gap: spacing.xs },
    reasonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      backgroundColor: c.bg,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
    },
    reasonRowActive: {
      borderColor: c.alert,
      backgroundColor: `${c.alert}14`,
    },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioOn: { borderColor: c.alert },
    radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.alert },
    textareaWrap: {
      backgroundColor: c.bg,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing.md,
      gap: spacing.xs,
    },
    textarea: {
      color: c.textPrimary,
      fontFamily: fonts.regular,
      fontSize: 15,
      minHeight: 72,
      maxHeight: 72,
    },
    reportActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    blockBody: { gap: spacing.lg, alignItems: 'center', paddingBottom: spacing.md },
    blockIconWrap: {
      width: 80,
      height: 80,
      borderRadius: radius.full,
      backgroundColor: `${c.alert}22`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    blockActions: { flexDirection: 'row', gap: spacing.sm, width: '100%' },
    doneBody: { alignItems: 'center', gap: spacing.md, paddingBottom: spacing.md },
    doneIcon: {
      width: 72,
      height: 72,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
    },
    menuList: { gap: spacing.sm, paddingBottom: spacing.md },
    menuRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      backgroundColor: c.bg,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
    },
    menuIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ratingOverview: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    reviewsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    reviewsRating: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    reviewList: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
      gap: 0,
    },
    // Summary bars
    summaryContainer: {
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    summaryLabel: { width: 100 },
    summaryTrack: {
      flex: 1,
      height: 3,
      borderRadius: radius.full,
      overflow: 'hidden',
    },
    summaryFill: {
      height: 3,
      borderRadius: radius.full,
    },
    summaryPct: { width: 32, textAlign: 'right' },
    // Review card
    reviewCard: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      gap: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    reviewTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    reviewComment: {
      lineHeight: 20,
      fontStyle: 'italic',
    },
    reviewTags: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    reviewTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: `${c.textPrimary}06`,
    },
    commentText: { lineHeight: 18 },
    sheetMatchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.md,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
    },
    inviteList: { gap: spacing.md, paddingBottom: spacing.md },
    inviteRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      minHeight: 64,
    },
    inviteRowActive: { borderColor: c.primary, backgroundColor: c.primarySoft },
    inviteEmoji: { fontSize: 22, lineHeight: 28, width: 32 },
    footer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
      backgroundColor: c.bg,
      borderTopWidth: 1,
      borderTopColor: c.border,
      gap: spacing.sm,
    },
  });
}
