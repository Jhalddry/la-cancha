import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChatCircle,
  Check,
  CheckCircle,
  DotsThreeVertical,
  Flag,
  MapPin,
  Prohibit,
  SoccerBall,
  UserPlus,
} from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput as RNTextInput, View } from 'react-native';

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
import { useColors } from '@/hooks/useColors';
import { formatMatchTime, labelModality, labelPosition, labelSport } from '@/lib/format';
import { fonts, radius, spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';
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
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const all = [...mockPlayers, mockCurrentUser];
  const player = all.find((p) => p.id === id) ?? mockPlayers[0];

  const [inviteOpen, setInviteOpen] = useState(false);
  const [invitedMatchId, setInvitedMatchId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportDoneOpen, setReportDoneOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockDoneOpen, setBlockDoneOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [reportDetail, setReportDetail] = useState('');

  const REPORT_REASONS = [
    'Comportamiento tóxico',
    'Impuntualidad',
    'Abandonó la partida',
    'Nivel no acorde al declarado',
    'No pagó',
    'Otro',
  ];

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
          <PressableScale
            style={s.menuBtn}
            scaleTo={0.9}
            onPress={() => setMenuOpen(true)}
          >
            <DotsThreeVertical size={22} color={c.textPrimary} weight="bold" />
          </PressableScale>
        }
      />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={s.hero}>
          <Avatar name={player.name} uri={player.avatarUrl} size={88} />
          <Text variant="h2" color="textPrimary" style={s.heroName}>
            {player.name}
          </Text>
          {player.username ? (
            <Text variant="body" color="textTertiary">
              @{player.username}
            </Text>
          ) : null}

          <View style={s.heroMeta}>
            <View style={s.skillBadge}>
              <Stars level={player.skillLevel} size={13} />
              <Text variant="caption" color="textSecondary">
                {SKILL_LABEL[player.skillLevel]}
              </Text>
            </View>
            {player.verified ? (
              <View style={s.verifiedBadge}>
                <CheckCircle size={13} color={c.primary} weight="fill" />
                <Text variant="caption" color="primary">
                  Verificado
                </Text>
              </View>
            ) : null}
          </View>

          <View style={s.locationRow}>
            <MapPin size={12} color={c.textTertiary} weight="fill" />
            <Text variant="small" color="textTertiary">
              Caracas, Venezuela
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={s.statsCard}>
          <StatBlock label="Partidas" value={String(player.matchesPlayed ?? 0)} />
          <View style={s.statDivider} />
          <StatBlock label="Organizadas" value={String(player.matchesOrganized ?? 0)} />
          <View style={s.statDivider} />
          <StatBlock label="Asistencia" value={`${player.attendancePct ?? 100}%`} />
          <View style={s.statDivider} />
          <StatBlock
            label="Reputación"
            value={player.reputation?.toFixed(1) ?? '—'}
            accent
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
        {player.positions.length > 0 ? (
          <View style={s.section}>
            <Text variant="caption" color="textSecondary" style={s.sectionLabel}>
              Posiciones
            </Text>
            <View style={s.chipsWrap}>
              {player.positions.map((p) => (
                <Chip key={p} label={labelPosition(p)} selected />
              ))}
            </View>
          </View>
        ) : null}

        {/* Bio */}
        {player.bio ? (
          <View style={s.section}>
            <Text variant="caption" color="textSecondary" style={s.sectionLabel}>
              Sobre mí
            </Text>
            <Text variant="body" color="textPrimary" style={s.bioText}>
              {player.bio}
            </Text>
          </View>
        ) : null}

        {/* Badges */}
        {player.badges && player.badges.length > 0 ? (
          <View style={s.section}>
            <Text variant="caption" color="textSecondary" style={s.sectionLabel}>
              Insignias
            </Text>
            <View style={s.badgesWrap}>
              {player.badges.map((b) => (
                <View key={b} style={s.badgeChip}>
                  <CheckCircle size={13} color={c.primary} weight="fill" />
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
          <View style={s.section}>
            <View style={s.sectionHead}>
              <Text variant="caption" color="textSecondary">
                Partidos recientes
              </Text>
              <PressableScale scaleTo={0.95} onPress={() => router.push('/historial')}>
                <Text variant="caption" color="primary">
                  Ver todos
                </Text>
              </PressableScale>
            </View>
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

      <View style={s.footer}>
        <Button
          label="Enviar mensaje"
          variant="secondary"
          onPress={() => router.push(`/chat/${player.id}`)}
          leading={<ChatCircle size={18} color={c.textPrimary} weight="fill" />}
        />
        <Button
          label="Invitar a jugar"
          onPress={() => setInviteOpen(true)}
          leading={<UserPlus size={18} color={c.bg} weight="fill" />}
        />
      </View>

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
              <Text variant="bodyMedium" color="alert">
                Reportar jugador
              </Text>
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
              <Text variant="bodyMedium" color="alert">
                Bloquear
              </Text>
              <Text variant="small" color="textSecondary">
                No verás más partidas ni mensajes de este jugador
              </Text>
            </View>
          </PressableScale>
        </View>
      </Sheet>

      <Sheet
        visible={reportOpen}
        onClose={closeReport}
        title={`Reportar a ${player.name}`}
      >
        <View style={s.reportBody}>
            <Text variant="caption" color="textSecondary">
              Motivo del reporte
            </Text>
            <View style={s.reasonList}>
              {REPORT_REASONS.map((r) => {
                const selected = reportReason === r;
                return (
                  <PressableScale
                    key={r}
                    scaleTo={0.98}
                    onPress={() => setReportReason(r)}
                    style={[
                      s.reasonRow,
                      selected ? s.reasonRowActive : null,
                    ]}
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
              <Button
                label="Cancelar"
                variant="secondary"
                onPress={closeReport}
                style={{ flex: 1 }}
              />
              <Button
                label="Enviar reporte"
                disabled={!reportReason}
                onPress={submitReport}
                style={{ flex: 1 }}
              />
            </View>
          </View>
      </Sheet>

      <Sheet
        visible={blockOpen}
        onClose={() => setBlockOpen(false)}
        title={`Bloquear a ${player.name}?`}
      >
        <View style={s.blockBody}>
          <View style={s.blockIconWrap}>
            <Prohibit size={48} color={c.alert} weight="bold" />
          </View>
          <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
            {player.name} no podrá unirse a tus partidas, enviarte mensajes ni verá tu perfil. Puedes desbloquearlo desde ajustes.
          </Text>
          <View style={s.blockActions}>
            <Button
              label="Cancelar"
              variant="secondary"
              onPress={() => setBlockOpen(false)}
              style={{ flex: 1 }}
            />
            <Button
              label="Bloquear"
              onPress={submitBlock}
              style={{ flex: 1, backgroundColor: c.alert }}
            />
          </View>
        </View>
      </Sheet>

      <Sheet visible={reportDoneOpen} onClose={() => setReportDoneOpen(false)}>
        <View style={s.doneBody}>
          <View style={[s.doneIcon, { backgroundColor: c.primarySoft }]}>
            <Check size={36} color={c.primary} weight="bold" />
          </View>
          <Text variant="h3" color="textPrimary">
            Reporte enviado
          </Text>
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
          <Text variant="h3" color="textPrimary">
            Jugador bloqueado
          </Text>
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
                style={[
                  s.inviteRow,
                  invitedMatchId === m.id ? s.inviteRowActive : null,
                ]}
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
                setInviteOpen(false);
                setInvitedMatchId(null);
                Alert.alert(
                  'Invitación enviada',
                  `${player.name} recibirá tu invitación a la partida.`,
                );
              }}
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
    <View style={staticStyles.statBlock}>
      <Text variant="h2" color={accent ? 'primary' : 'textPrimary'}>
        {value}
      </Text>
      <Text variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>
        {label}
      </Text>
    </View>
  );
}

const staticStyles = StyleSheet.create({
  statBlock: { flex: 1, alignItems: 'center', gap: 2 },
});

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    scroll: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: 200,
      gap: spacing.xl,
    },
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
    hero: { alignItems: 'center', gap: spacing.sm },
    heroName: { marginTop: spacing.sm },
    heroMeta: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' },
    skillBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      backgroundColor: c.surface,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: c.border,
    },
    verifiedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      backgroundColor: c.primarySoft,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: c.primary,
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
    sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
    recentTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
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
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: c.alert,
    },
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
    reportActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    blockBody: { gap: spacing.lg, alignItems: 'center', paddingBottom: spacing.md },
    blockIconWrap: {
      width: 80,
      height: 80,
      borderRadius: radius.full,
      backgroundColor: `${c.alert}22`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    blockActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      width: '100%',
    },
    doneBody: {
      alignItems: 'center',
      gap: spacing.md,
      paddingBottom: spacing.md,
    },
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
