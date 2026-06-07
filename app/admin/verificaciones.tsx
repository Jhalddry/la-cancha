import { useRouter } from 'expo-router';
import { ArrowRight, SealCheck, XCircle } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Stars } from '@/components/ui/Stars';
import { Text } from '@/components/ui/Text';
import { useColors } from '@/hooks/useColors';
import {
  useApproveVerification,
  useRejectVerification,
  useVerificationRequests,
} from '@/hooks/useProfiles';
import { labelSport } from '@/lib/format';
import { useSession } from '@/store/session';
import { radius, spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';
import type { Player } from '@/types/domain';

export default function AdminVerificacionesScreen() {
  const router = useRouter();
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const user = useSession((st) => st.user);

  const { data: requests, isLoading } = useVerificationRequests();
  const { mutate: approve } = useApproveVerification();
  const { mutate: reject } = useRejectVerification();

  const [confirmApprove, setConfirmApprove] = useState<Player | null>(null);
  const [confirmReject, setConfirmReject] = useState<Player | null>(null);

  if (!user?.isAdmin) {
    return (
      <Screen edges={['top']}>
        <BackHeader title="Administración" onBack={() => router.back()} />
        <View style={s.center}>
          <Text variant="body" color="textSecondary">Sin acceso.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <BackHeader
        title="Solicitudes de verificación"
        onBack={() => router.back()}
        trailing={
          requests && requests.length > 0 ? (
            <View style={s.badge}>
              <Text variant="caption" color="textPrimary">{requests.length}</Text>
            </View>
          ) : undefined
        }
      />

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator color={c.primary} size="large" />
        </View>
      ) : !requests || requests.length === 0 ? (
        <EmptyState
          icon={<SealCheck size={40} color={c.primary} weight="fill" />}
          title="Sin solicitudes pendientes"
          description="Cuando un jugador solicite verificación aparecerá aquí."
        />
      ) : (
        <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
          {requests.map((player) => (
            <Card key={player.id} padded={false}>
              {/* ── Header ─────────────────────────────────────── */}
              <View style={s.cardHead}>
                <Avatar name={player.name} uri={player.avatarUrl} size={60} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text variant="h3" color="textPrimary">{player.name}</Text>
                  {player.username ? (
                    <Text variant="small" color="textTertiary">@{player.username}</Text>
                  ) : null}
                  {player.city ? (
                    <Text variant="caption" color="textSecondary">{player.city}, Venezuela</Text>
                  ) : null}
                  {/* Reputation inline */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                    <Stars level={player.reputation ?? 0} size={11} />
                    <Text variant="caption" color="textTertiary">
                      {player.reputation != null ? player.reputation.toFixed(1) : '—'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* ── Stats ──────────────────────────────────────── */}
              <View style={[s.statsRow, { borderColor: c.border }]}>
                <StatItem label="Partidas" value={String(player.matchesPlayed ?? 0)} />
                <View style={[s.statSep, { backgroundColor: c.border }]} />
                <StatItem label="Organizadas" value={String(player.matchesOrganized ?? 0)} />
                <View style={[s.statSep, { backgroundColor: c.border }]} />
                <StatItem
                  label="Asistencia"
                  value={player.attendancePct != null ? `${player.attendancePct}%` : '—'}
                />
              </View>

              {/* ── Sports ─────────────────────────────────────── */}
              {player.sports.length > 0 ? (
                <View style={s.metaRow}>
                  <Text variant="caption" color="textTertiary">Deportes: </Text>
                  <Text variant="caption" color="textPrimary">
                    {player.sports.map(labelSport).join(', ')}
                  </Text>
                </View>
              ) : null}

              {/* ── Bio ────────────────────────────────────────── */}
              <View style={s.bioWrap}>
                {player.bio ? (
                  <Text variant="small" color="textSecondary" numberOfLines={3}>
                    {player.bio}
                  </Text>
                ) : (
                  <Text variant="small" color="textTertiary" style={{ fontStyle: 'italic' }}>
                    Sin bio
                  </Text>
                )}
              </View>

              {/* ── Ver perfil link ─────────────────────────────── */}
              <PressableScale
                scaleTo={0.97}
                onPress={() => router.push(`/perfil/${player.id}`)}
                style={[s.viewProfileRow, { borderColor: c.border }]}
              >
                <Text variant="smallMedium" color="primary">Ver perfil completo</Text>
                <ArrowRight size={14} color={c.primary} weight="bold" />
              </PressableScale>

              {/* ── Action buttons ─────────────────────────────── */}
              <View style={[s.actionRow, { borderColor: c.border }]}>
                <Pressable
                  style={[s.actionBtn, { backgroundColor: `${c.alert}18`, borderColor: `${c.alert}55` }]}
                  onPress={() => setConfirmReject(player)}
                >
                  <XCircle size={18} color={c.alert} weight="fill" />
                  <Text variant="bodySemibold" style={{ color: c.alert }}>Rechazar</Text>
                </Pressable>

                <Pressable
                  style={[s.actionBtn, { backgroundColor: c.primary, borderColor: c.primary }]}
                  onPress={() => setConfirmApprove(player)}
                >
                  <SealCheck size={18} color={c.textOnPrimary} weight="fill" />
                  <Text variant="bodySemibold" style={{ color: c.textOnPrimary }}>Verificar</Text>
                </Pressable>
              </View>
            </Card>
          ))}
        </ScrollView>
      )}

      <ConfirmSheet
        visible={confirmApprove !== null}
        onClose={() => setConfirmApprove(null)}
        title={`Verificar a ${confirmApprove?.name ?? ''}`}
        description="Se otorgará la insignia verificada. Aparecerá en su perfil de forma permanente."
        confirmLabel="Verificar"
        confirmColor={c.primary}
        onConfirm={() => {
          if (!confirmApprove) return;
          approve(confirmApprove.id);
          setConfirmApprove(null);
        }}
      />

      <ConfirmSheet
        visible={confirmReject !== null}
        onClose={() => setConfirmReject(null)}
        title={`Rechazar solicitud de ${confirmReject?.name ?? ''}`}
        description="La solicitud será descartada. El jugador podrá volver a solicitarla en el futuro."
        confirmLabel="Rechazar"
        confirmColor={c.alert}
        onConfirm={() => {
          if (!confirmReject) return;
          reject(confirmReject.id);
          setConfirmReject(null);
        }}
      />
    </Screen>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Text variant="bodySemibold" color="textPrimary">{value}</Text>
      <Text variant="caption" color="textSecondary">{label}</Text>
    </View>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    badge: {
      minWidth: 22,
      height: 22,
      borderRadius: radius.full,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xs,
    },
    list: {
      padding: spacing.lg,
      paddingBottom: spacing.huge,
      gap: spacing.lg,
    },
    cardHead: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      padding: spacing.lg,
    },
    statsRow: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderBottomWidth: 1,
      paddingVertical: spacing.md,
    },
    statSep: { width: 1, marginVertical: spacing.xs },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
    },
    bioWrap: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
    },
    viewProfileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.md,
      borderTopWidth: 1,
    },
    actionRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      padding: spacing.md,
      borderTopWidth: 1,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
    },
  });
}
