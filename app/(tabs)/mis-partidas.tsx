import { useRouter } from 'expo-router';
import {
  ClockCounterClockwise,
  Flag,
  PencilSimple,
  Play,
  Plus,
  ProhibitInset,
  Star,
  WifiSlash,
} from 'phosphor-react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { type DimensionValue, RefreshControl, ScrollView, StyleSheet, Text as RNText, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { Divider } from '@/components/ui/Divider';
import { EmptyState } from '@/components/ui/EmptyState';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Text } from '@/components/ui/Text';
import { MatchCard } from '@/features/match/MatchCard';
import { useColors } from '@/hooks/useColors';
import { useMyMatches, useStartMatch, useEndMatch } from '@/hooks/useMatches';
import { useMyGivenRatings } from '@/hooks/useProfiles';
import { formatMatchTime, labelModality, labelSport } from '@/lib/format';
import { useSession } from '@/store/session';
import { radius, spacing } from '@/theme';
import type { Match, Player } from '@/types/domain';
import type { ColorPalette } from '@/theme/palettes';

type Tab = 'proximas' | 'activas' | 'calificar';

const OPTIONS: { value: Tab; label: string }[] = [
  { value: 'proximas', label: 'Próximas' },
  { value: 'activas', label: 'Activas' },
  { value: 'calificar', label: 'Calificar' },
];

const SPORT_EMOJIS: Record<string, string> = {
  futbol: '⚽',
  basket: '🏀',
  tenis: '🎾',
  padel: '🏓',
  beachTennis: '🏖️',
};

function SkeletonPulse({
  width,
  height,
  borderRadius: br,
  bgColor,
  borderColor,
}: {
  width: DimensionValue;
  height: number;
  borderRadius: number;
  bgColor: string;
  borderColor: string;
}) {
  const opacity = useSharedValue(0.3);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(1, { duration: 800 }), withTiming(0.3, { duration: 800 })),
      -1,
      false,
    );
    return () => cancelAnimation(opacity);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const aStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <View style={{ width, height }}>
      <Animated.View
        style={[{ flex: 1, borderRadius: br, backgroundColor: bgColor, borderWidth: 1, borderColor }, aStyle]}
      />
    </View>
  );
}

function LiveBadge() {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.5, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1,
      false,
    );
    return () => cancelAnimation(scale);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const dotStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Animated.View style={[{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#ef4444' }, dotStyle]} />
      <RNText style={{ color: '#ef4444', fontSize: 11, fontWeight: '700', letterSpacing: 0.8 }}>EN VIVO</RNText>
    </View>
  );
}

function formatCountdown(startsAt: string): string {
  const diff = new Date(startsAt).getTime() - Date.now();
  if (diff <= 0) return 'En curso';
  const totalMin = Math.floor(diff / 60_000);
  const h = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (h === 0) return `en ${min}min`;
  if (min === 0) return `en ${h}h`;
  return `en ${h}h ${min}min`;
}

function Countdown({ startsAt }: { startsAt: string }) {
  const [label, setLabel] = useState(() => formatCountdown(startsAt));
  useEffect(() => {
    const id = setInterval(() => setLabel(formatCountdown(startsAt)), 60_000);
    return () => clearInterval(id);
  }, [startsAt]);
  return (
    <Text variant="caption" color="textTertiary">{label}</Text>
  );
}

export default function MisPartidasScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('proximas');
  const userId = useSession((st) => st.user?.id);
  const {
    data: myMatches,
    isLoading: matchesLoading,
    isError: matchesError,
    refetch: refetchMatches,
    isRefetching: matchesRefreshing,
  } = useMyMatches();
  const { data: givenRatings = [], refetch: refetchGiven } = useMyGivenRatings(userId);

  // Tabs stay mounted — force refetch whenever this tab comes into focus
  useFocusEffect(
    useCallback(() => { void refetchGiven(); }, [refetchGiven]),
  );
  const { mutate: startMatch, isPending: isStarting } = useStartMatch();
  const { mutate: endMatch, isPending: isEnding } = useEndMatch();
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const [startConfirmMatchId, setStartConfirmMatchId] = useState<string | null>(null);
  const [endConfirmMatchId, setEndConfirmMatchId] = useState<string | null>(null);

  // Set of "matchId:rateeId" pairs already rated by current user
  const ratedSet = useMemo(
    () => new Set(givenRatings.map((r) => `${r.matchId}:${r.rateeId}`)),
    [givenRatings],
  );

  // Ended matches (from both past/joined and created) where user can rate
  const endedMatches = useMemo(() => {
    if (!myMatches) return [];
    const fromPast = (myMatches.past ?? []).filter((m) => m.endedAt);
    const fromCreated = (myMatches.created ?? []).filter((m) => m.endedAt);
    const seen = new Set<string>();
    const result: Match[] = [];
    for (const m of [...fromPast, ...fromCreated]) {
      if (!seen.has(m.id)) { seen.add(m.id); result.push(m); }
    }
    return result;
  }, [myMatches]);

  // Players still to rate in a given match
  const toRate = (m: Match): Player[] => {
    const candidates: Player[] = [
      ...(m.organizer.id !== userId ? [m.organizer] : []),
      ...m.joinedPlayers.filter((p) => p.id !== userId),
    ];
    return candidates.filter((p) => !ratedSet.has(`${m.id}:${p.id}`));
  };

  const proximasList = myMatches?.upcoming ?? [];
  const rejectedList = myMatches?.rejected ?? [];
  const activasList = (myMatches?.created ?? []).filter((m) => !m.endedAt);

  const emptyTitle = tab === 'calificar' ? 'Sin partidas por calificar' : tab === 'activas' ? 'Sin partidas activas' : 'Sin partidas próximas';
  const emptyDesc = {
    proximas: 'No te has unido a ninguna partida próxima.',
    activas: 'Crea una partida para empezar.',
    calificar: 'Cuando una partida finalice, verás aquí a los jugadores por calificar.',
  }[tab];

  const calificarList = endedMatches.filter((m) => toRate(m).length > 0);

  const showEmpty =
    (tab === 'proximas' && proximasList.length === 0 && rejectedList.length === 0) ||
    (tab === 'activas' && activasList.length === 0) ||
    (tab === 'calificar' && calificarList.length === 0);

  return (
    <Screen>
      <View style={s.head}>
        <Text variant="h2">Mis Partidas</Text>
        <PressableScale
          scaleTo={0.97}
          onPress={() => router.push('/historial')}
          style={s.historialBtn}
        >
          <ClockCounterClockwise size={15} color={c.textTertiary} weight="regular" />
          <Text variant="smallMedium" color="textTertiary">Historial</Text>
        </PressableScale>
      </View>

      <View style={s.tabsWrap}>
        <SegmentedTabs options={OPTIONS} value={tab} onChange={setTab} />
      </View>

      {matchesLoading && !myMatches ? (
        <View style={[s.scroll, { gap: spacing.md }]}>
          <SkeletonPulse width="100%" height={120} borderRadius={radius.lg} bgColor={c.surface} borderColor={c.border} />
          <SkeletonPulse width="100%" height={120} borderRadius={radius.lg} bgColor={c.surface} borderColor={c.border} />
          <SkeletonPulse width="100%" height={120} borderRadius={radius.lg} bgColor={c.surface} borderColor={c.border} />
        </View>
      ) : matchesError ? (
        <ScrollView
          contentContainerStyle={{ flex: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={matchesRefreshing}
              onRefresh={() => void refetchMatches()}
              tintColor={c.primary}
              colors={[c.primary]}
            />
          }
        >
          <EmptyState
            icon={<WifiSlash size={36} color={c.alert} weight="bold" />}
            title="Sin conexión"
            description="No se pudieron cargar tus partidas."
            action={
              <Button
                label="Reintentar"
                variant="secondary"
                fullWidth={false}
                style={{ marginTop: spacing.md }}
                onPress={() => void refetchMatches()}
              />
            }
          />
        </ScrollView>
      ) : showEmpty ? (
        <ScrollView
          contentContainerStyle={{ flex: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={matchesRefreshing}
              onRefresh={() => void refetchMatches()}
              tintColor={c.primary}
              colors={[c.primary]}
            />
          }
        >
          <EmptyState
            icon={<RNText style={{ fontSize: 36, lineHeight: 40, includeFontPadding: false } as object}>⚽</RNText>}
            title={emptyTitle}
            description={emptyDesc}
            action={
              tab === 'activas' ? (
                <Button
                  label="Crear partida"
                  onPress={() => router.push('/crear')}
                  fullWidth={false}
                  leading={<Plus size={18} color={c.bg} weight="bold" />}
                  style={{ marginTop: spacing.md }}
                />
              ) : undefined
            }
          />
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={matchesRefreshing}
              onRefresh={() => void refetchMatches()}
              tintColor={c.primary}
              colors={[c.primary]}
            />
          }
        >

          {/* ── Próximas ────────────────────────────────── */}
          {tab === 'proximas' ? (
            <>
              {proximasList.map((m) => (
                <View key={m.id} style={{ gap: spacing.xs }}>
                  <MatchCard
                    match={m}
                    onPress={() => router.push(`/match/${m.id}`)}
                  />
                  <View style={s.countdownRow}>
                    <Countdown startsAt={m.startsAt} />
                  </View>
                </View>
              ))}
              {rejectedList.length > 0 ? (
                <>
                  {proximasList.length > 0 ? (
                    <View style={s.rejectedHeader}>
                      <ProhibitInset size={14} color={c.textTertiary} weight="fill" />
                      <Text variant="caption" color="textTertiary">Solicitudes rechazadas</Text>
                    </View>
                  ) : null}
                  {rejectedList.map((m) => (
                    <View key={m.id} style={{ opacity: 0.45 }}>
                      <MatchCard
                        match={m}
                        onPress={() => router.push(`/match/${m.id}`)}
                      />
                      <View style={s.rejectedBadge}>
                        <ProhibitInset size={12} color={c.alert} weight="fill" />
                        <Text variant="smallMedium" color="alert">Solicitud no aceptada</Text>
                      </View>
                    </View>
                  ))}
                </>
              ) : null}
            </>
          ) : null}

          {/* ── Activas ─────────────────────────────────── */}
          {tab === 'activas'
            ? activasList.map((m) => (
                <View key={m.id} style={s.cardWrap}>
                  {m.startedAt && !m.endedAt ? (
                    <View style={s.liveBanner}>
                      <LiveBadge />
                    </View>
                  ) : null}
                  <MatchCard
                    match={m}
                    onPress={() => router.push(`/match/${m.id}`)}
                    cardStyle={{
                      borderBottomLeftRadius: 0,
                      borderBottomRightRadius: 0,
                      borderBottomWidth: 0,
                      ...(m.startedAt && !m.endedAt ? { borderTopLeftRadius: 0, borderTopRightRadius: 0 } : {}),
                    }}
                  />
                  {/* Action row */}
                  <View style={s.actionRow}>
                    <PressableScale
                      style={s.actionBtnSecondary}
                      scaleTo={0.97}
                      onPress={() => router.push(`/editar/${m.id}`)}
                    >
                      <PencilSimple size={16} color={c.textPrimary} weight="fill" />
                      <Text variant="bodyMedium" color="textPrimary">Editar partida</Text>
                    </PressableScale>

                    {!m.startedAt ? (
                      <PressableScale
                        style={[s.actionBtnPrimary, isStarting && { opacity: 0.6 }]}
                        scaleTo={0.97}
                        onPress={() => !isStarting && setStartConfirmMatchId(m.id)}
                      >
                        <Play size={16} color={c.textOnPrimary} weight="fill" />
                        <Text variant="bodyMedium" style={{ color: c.textOnPrimary }}>
                          {isStarting ? 'Iniciando…' : 'Iniciar partida'}
                        </Text>
                      </PressableScale>
                    ) : null}

                    {m.startedAt && !m.endedAt ? (
                      <PressableScale
                        style={[s.actionBtnSeria, isEnding && { opacity: 0.6 }]}
                        scaleTo={0.97}
                        onPress={() => !isEnding && setEndConfirmMatchId(m.id)}
                      >
                        <Flag size={16} color="#fff" weight="fill" />
                        <Text variant="bodyMedium" style={{ color: '#fff' }}>
                          {isEnding ? 'Finalizando…' : 'Finalizar partida'}
                        </Text>
                      </PressableScale>
                    ) : null}
                  </View>
                </View>
              ))
            : null}

          {/* ── Calificar ───────────────────────────────── */}
          {tab === 'calificar'
            ? calificarList.map((m) => {
                const pending = toRate(m);
                return (
                  <View key={m.id} style={s.calificarGroup}>
                    {/* Match header row */}
                    <PressableScale
                      style={s.matchRow}
                      scaleTo={0.98}
                      onPress={() => router.push(`/match/${m.id}`)}
                    >
                      <Text style={s.emoji}>{SPORT_EMOJIS[m.sport] ?? '🏅'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text variant="bodySemibold" color="textPrimary">
                          {labelSport(m.sport)} · {labelModality(m.modality)}
                        </Text>
                        <Text variant="small" color="textSecondary">
                          {m.location.name} · {formatMatchTime(m.startsAt)}
                        </Text>
                      </View>
                      <Text variant="caption" color="textTertiary">
                        {pending.length} pendiente{pending.length !== 1 ? 's' : ''}
                      </Text>
                    </PressableScale>

                    {/* Player rows */}
                    <View style={s.playerList}>
                      {pending.map((p, i) => {
                        const isOrg = p.id === m.organizer.id;
                        return (
                          <View key={p.id}>
                            <PressableScale
                              scaleTo={0.97}
                              style={s.playerRow}
                              onPress={() => router.push(`/calificar/${p.id}?matchId=${m.id}${isOrg ? '&isOrganizer=true' : ''}`)}
                            >
                              <Avatar name={p.name} uri={p.avatarUrl} size={38} />
                              <View style={{ flex: 1 }}>
                                <Text variant="bodyMedium" color="textPrimary">{p.name}</Text>
                                <Text variant="caption" color="textTertiary">
                                  {isOrg ? 'Organizador' : 'Jugador'}
                                </Text>
                              </View>
                              <View style={s.rateBtn}>
                                <Star size={13} color={c.bg} weight="fill" />
                                <Text variant="smallMedium" style={{ color: c.bg }}>Calificar</Text>
                              </View>
                            </PressableScale>
                            {i < pending.length - 1 ? <Divider inset /> : null}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })
            : null}


        </ScrollView>
      )}

      <ConfirmSheet
        visible={startConfirmMatchId !== null}
        onClose={() => setStartConfirmMatchId(null)}
        title="Iniciar partida"
        description="¿Confirmas que quieres iniciar la partida ahora? Esta acción no se puede deshacer."
        confirmLabel="Iniciar"
        confirmColor={c.primary}
        onConfirm={() => {
          if (startConfirmMatchId) { startMatch(startConfirmMatchId); setStartConfirmMatchId(null); }
        }}
      />
      <ConfirmSheet
        visible={endConfirmMatchId !== null}
        onClose={() => setEndConfirmMatchId(null)}
        title="Finalizar partida"
        description="¿Confirmas que la partida terminó? Los jugadores podrán calificarse después."
        confirmLabel="Finalizar"
        confirmColor={c.seria}
        countdown={10}
        onConfirm={() => {
          if (endConfirmMatchId) { endMatch(endConfirmMatchId); setEndConfirmMatchId(null); }
        }}
      />
    </Screen>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    head: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    historialBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, opacity: 0.7 },
    tabsWrap: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    scroll: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: 160,
      gap: spacing.md,
    },
    cardWrap: { gap: 0 },
    actionRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderTopWidth: 1,
      borderTopColor: c.border,
      borderColor: c.border,
      borderBottomLeftRadius: radius.lg,
      borderBottomRightRadius: radius.lg,
    },
    actionBtnSecondary: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      backgroundColor: c.bg,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
    },
    actionBtnPrimary: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      backgroundColor: c.primary,
      borderRadius: radius.md,
    },
    actionBtnSeria: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      backgroundColor: c.seria,
      borderRadius: radius.md,
    },
    countdownRow: {
      paddingHorizontal: spacing.sm,
      alignItems: 'flex-end',
      marginTop: -spacing.xs,
    },
    liveBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xs + 1,
      backgroundColor: 'rgba(239, 68, 68, 0.10)',
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.35)',
      borderBottomWidth: 0,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
    },
    rejectedHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.xs,
    },
    rejectedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: -spacing.sm,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
    },
    // Calificar tab
    calificarGroup: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    matchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
    },
    emoji: { fontSize: 22, lineHeight: 28, width: 30, textAlign: 'center' },
    playerList: {
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    playerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    rateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: c.seria,
      borderRadius: radius.full,
    },
  });
}
