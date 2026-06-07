import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  CalendarBlank,
  ChatCircle,
  CheckCircle,
  Clock,
  CreditCard,
  MapPin,
  PencilSimple,
  Person,
  ShareNetwork,
  ShieldCheck,
  Trophy,
  UsersThree,
  WarningCircle,
  WhatsappLogo,
  X,
  XCircle,
} from 'phosphor-react-native';
import { useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Modal, ScrollView, Share, StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { Avatar } from '@/components/ui/Avatar';
import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { Divider } from '@/components/ui/Divider';
import { IconCircle } from '@/components/ui/IconCircle';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { Stars } from '@/components/ui/Stars';
import { Text } from '@/components/ui/Text';
import { MatchTypeBadge } from '@/features/match/MatchTypeBadge';
import { PlayerPositions } from '@/components/feature/PlayerPositions';
import { matchTypeMeta } from '@/features/match/matchTypeMeta';
import { useColors } from '@/hooks/useColors';
import { useMatch, useLeaveMatch, useMyParticipantStatus, usePendingParticipants, useApproveParticipant, useRejectParticipant, useInviteToMatch } from '@/hooks/useMatches';
import { useProfile } from '@/hooks/useProfiles';
import { useSession } from '@/store/session';
import {
  formatMatchTime,
  formatPrice,
  labelModality,
  labelPayment,
  labelPosition,
  labelSkill,
} from '@/lib/format';
import type { MatchParticipant, Match } from '@/types/domain';
import { radius, spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';
import type { Sport } from '@/types/domain';

const SPORT_EMOJI: Record<Sport, string> = {
  futbol: '⚽',
  basket: '🏀',
  tenis: '🎾',
  padel: '🏓',
  beachTennis: '🏖️',
};

export default function MatchDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useSession((st) => st.user?.id);
  const isAdmin = useSession((st) => st.user?.isAdmin ?? false);
  const { data: match, isLoading } = useMatch(id);
  const { mutate: leaveMatch, isPending: isLeaving } = useLeaveMatch();
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const [mapOpen, setMapOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<MatchParticipant | null>(null);

  const isOrganizer = match?.organizer.id === userId;
  const { data: organizerProfile } = useProfile(match?.organizer.id);
  const { data: myStatus } = useMyParticipantStatus(!isOrganizer ? id : undefined);
  const { data: pendingParticipants } = usePendingParticipants(id, !!isOrganizer && !match?.endedAt);
  const { mutate: approveParticipant, isPending: isApproving } = useApproveParticipant();
  const { mutate: rejectParticipant, isPending: isRejecting } = useRejectParticipant();

  if (isLoading || !match) {
    return (
      <Screen edges={['top']}>
        <BackHeader title="" transparent />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.primary} size="large" />
        </View>
      </Screen>
    );
  }

  const typeMeta = matchTypeMeta[match.type];
  const joined = match.joinedPlayers.some((p) => p.id === userId);

  const handleLeave = () => setLeaveConfirmOpen(true);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `¡Únete a esta partida de ${labelModality(match.modality)} en ${match.location.name}! ${formatMatchTime(match.startsAt)} · ${formatPrice(match.pricePerHour, match.currency)}/h\n\nLa Cancha: lacancha.app/match/${match.id}`,
      });
    } catch {
      // user cancelled
    }
  };

  return (
    <Screen edges={['top']}>
      <BackHeader
        title=""
        transparent
        trailing={
          <View style={s.headerActions}>
            {isOrganizer && !match.endedAt ? (
              <PressableScale
                style={s.headerBtn}
                scaleTo={0.9}
                onPress={() => router.push(`/editar/${match.id}`)}
              >
                <PencilSimple size={18} color={c.primary} weight="fill" />
              </PressableScale>
            ) : null}
            {(isOrganizer || joined) && !match.endedAt ? (
              <PressableScale
                style={s.headerBtn}
                scaleTo={0.9}
                onPress={() => router.push(`/chat/${match.id}`)}
              >
                <ChatCircle size={18} color={c.textPrimary} weight="regular" />
              </PressableScale>
            ) : null}
            <PressableScale style={s.headerBtn} scaleTo={0.9} onPress={handleShare}>
              <ShareNetwork size={18} color={c.textPrimary} weight="regular" />
            </PressableScale>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ──────────────────────────────────────── */}
        <View style={s.hero}>
          <View style={s.heroLeft}>
            <Text style={s.heroEmoji}>{SPORT_EMOJI[match.sport]}</Text>
            <View style={{ gap: 2 }}>
              {match.endedAt ? (
                <Text variant="h1" color="textSecondary">Partida finalizada</Text>
              ) : match.startedAt ? (
                <Text variant="h1" style={{ color: c.seria }}>🟢 En curso</Text>
              ) : (
                <Text variant="h1" color="textPrimary">
                  Faltan {match.missingCount}{' '}
                  {match.missingCount === 1 ? 'jugador' : 'jugadores'}
                </Text>
              )}
              <View style={s.heroMeta}>
                <Text variant="body" color="textSecondary">
                  {labelModality(match.modality)}
                </Text>
                <Text variant="body" color="textTertiary"> · </Text>
                <MatchTypeBadge type={match.type} size="sm" />
              </View>
            </View>
          </View>
          <View style={s.priceTag}>
            <Text variant="h2" color="primary">
              {formatPrice(match.pricePerHour, match.currency)}/h
            </Text>
            <Text variant="caption" color="textTertiary" style={{ textAlign: 'right' }}>
              Por hora
            </Text>
          </View>
        </View>

        {/* ── Info card (date / location / type / level) ─ */}
        <Card padded={false}>
          <DetailRow
            icon={<CalendarBlank size={18} color={c.primary} weight="fill" />}
            label={formatMatchTime(match.startsAt)}
            sub={`${match.durationMin} minutos`}
          />
          <Divider inset />
          <DetailRow
            icon={<MapPin size={18} color={c.primary} weight="fill" />}
            label={match.location.name}
            sub={match.location.address}
            trailing={
              match.location.lat && match.location.lng ? (
                <PressableScale scaleTo={0.9} onPress={() => setMapOpen(true)}>
                  <Text variant="smallMedium" color="primary">
                    Ver mapa
                  </Text>
                </PressableScale>
              ) : undefined
            }
          />
          <Divider inset />
          <DetailRow
            icon={<Text style={{ fontSize: 16, lineHeight: 22 }}>{typeMeta.emoji}</Text>}
            label="Tipo de partida"
            trailing={<MatchTypeBadge type={match.type} />}
          />
          <Divider inset />
          <DetailRow
            icon={<Trophy size={18} color={c.primary} weight="fill" />}
            label="Nivel requerido"
            trailing={
              <View style={s.levelRow}>
                <Stars level={match.skillLevel} size={13} />
                <Text variant="small" color="textSecondary">
                  {labelSkill(match.skillLevel)}
                </Text>
              </View>
            }
          />
        </Card>

        {/* ── Positions ─────────────────────────────────── */}
        <Section
          title="Posiciones buscadas"
          icon={<UsersThree size={15} color={c.textTertiary} weight="regular" />}
        >
          <PlayerPositions sports={[match.sport]} positions={match.missingPositions} />
        </Section>

        {/* ── Payment ───────────────────────────────────── */}
        <Section
          title="Formas de pago"
          icon={<CreditCard size={15} color={c.textTertiary} weight="regular" />}
        >
          <Card>
            <View style={s.payRow}>
              {match.paymentMethods.map((m) => (
                <Text key={m} variant="bodyMedium" color="textPrimary">
                  {labelPayment(m)}
                </Text>
              ))}
            </View>
          </Card>
        </Section>

        {/* ── Requirements ──────────────────────────────── */}
        {match.requirements.length > 0 ? (
          <Section
            title="Sobre la partida"
            icon={<ShieldCheck size={15} color={c.textTertiary} weight="regular" />}
          >
            <Card padded={false}>
              {match.requirements.map((r, i) => (
                <View key={r}>
                  <View style={s.reqRow}>
                    <ShieldCheck size={16} color={c.primary} weight="fill" />
                    <Text variant="body" color="textPrimary" style={{ flex: 1 }}>
                      {r}
                    </Text>
                  </View>
                  {i < match.requirements.length - 1 ? <Divider inset /> : null}
                </View>
              ))}
            </Card>
          </Section>
        ) : null}

        {/* ── Organizer ─────────────────────────────────── */}
        <Section title="Organizador">
          <Card onPress={() => router.push(`/perfil/${match.organizer.id}`)}>
            <View style={s.organizerRow}>
              <Avatar name={match.organizer.name} uri={match.organizer.avatarUrl} size={46} />
              <View style={{ flex: 1, gap: 2 }}>
                <View style={s.orgNameRow}>
                  <Text variant="bodySemibold" color="textPrimary">
                    {match.organizer.name}
                  </Text>
                  {match.organizer.verified ? (
                    <CheckCircle size={14} color={c.primary} weight="fill" />
                  ) : null}
                </View>
                <View style={s.repRow}>
                  {((organizerProfile ?? match.organizer).reputation ?? 0) > 0 ? (
                    <Stars
                      level={Math.max(1, Math.round((organizerProfile ?? match.organizer).reputation!)) as 1 | 2 | 3 | 4 | 5}
                      size={12}
                    />
                  ) : null}
                  <Text variant="small" color="textSecondary">
                    {(organizerProfile ?? match.organizer).reputation?.toFixed(1) ?? '—'} · Organizador
                  </Text>
                </View>
              </View>
              <IconCircle size={40} bg={c.primarySoft} border={c.primary}>
                <WhatsappLogo size={20} color={c.primary} weight="fill" />
              </IconCircle>
            </View>
          </Card>
        </Section>

        {/* ── Pending participants (organizer only) ────── */}
        {isOrganizer && !match.endedAt ? (
          <Section
            title={
              pendingParticipants && pendingParticipants.length > 0
                ? `${pendingParticipants.length} solicitud${pendingParticipants.length !== 1 ? 'es' : ''} pendiente${pendingParticipants.length !== 1 ? 's' : ''}`
                : 'Solicitudes de jugadores'
            }
            icon={<UsersThree size={15} color={c.seria} weight="regular" />}
          >
            {pendingParticipants && pendingParticipants.length > 0 ? (
            <Card padded={false}>
              {pendingParticipants.map((p, i) => (
                <View key={p.id}>
                  <PressableScale scaleTo={0.98} onPress={() => setSelectedParticipant(p)} style={staticStyles.participantRow}>
                    <Avatar name={p.name} uri={p.avatarUrl} size={42} />
                    <View style={{ flex: 1, gap: 3 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                        <Text variant="bodyMedium" color="textPrimary">{p.name}</Text>
                        {p.verified ? <CheckCircle size={13} color={c.primary} weight="fill" /> : null}
                      </View>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, alignItems: 'center' }}>
                        {(() => {
                          const missingSet = new Set(match.missingPositions.map((mp) => mp.toString()));
                          const positions = p.positions.slice(0, 2);
                          const hasMatch = positions.some((pos) => missingSet.has(pos) || pos === 'cualquiera');
                          const outOfPos = positions.length > 0 && !hasMatch;
                          return positions.map((pos) => {
                            const fits = missingSet.has(pos) || pos === 'cualquiera';
                            return (
                              <View key={pos} style={[staticStyles.pill, {
                                backgroundColor: fits ? `${c.primary}18` : outOfPos ? `${c.seria}15` : c.surface,
                                borderColor: fits ? `${c.primary}55` : outOfPos ? `${c.seria}55` : c.border,
                              }]}>
                                {fits
                                  ? <CheckCircle size={10} color={c.primary} weight="fill" />
                                  : outOfPos
                                    ? <WarningCircle size={10} color={c.seria} weight="fill" />
                                    : <Person size={10} color={c.textTertiary} weight="fill" />
                                }
                                <Text variant="caption" style={{ color: fits ? c.primary : outOfPos ? c.seria : c.textSecondary }}>
                                  {labelPosition(pos)}
                                </Text>
                              </View>
                            );
                          });
                        })()}
                        {p.paymentMethod ? (
                          <View style={[staticStyles.pill, staticStyles.pillNeutral(c)]}>
                            <Text variant="caption" color="textSecondary">{labelPayment(p.paymentMethod)}</Text>
                          </View>
                        ) : null}
                      </View>
                      {match.requirements.length > 0 ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                          {(() => {
                            const allMet = match.requirements.every((r) => p.checkedRequirements?.includes(r) ?? false);
                            const someMet = match.requirements.some((r) => p.checkedRequirements?.includes(r) ?? false);
                            if (allMet) return (
                              <>
                                <CheckCircle size={12} color={c.primary} weight="fill" />
                                <Text variant="caption" color="primary">Todos los requisitos</Text>
                              </>
                            );
                            if (someMet) return (
                              <>
                                <WarningCircle size={12} color={c.seria} weight="fill" />
                                <Text variant="caption" style={{ color: c.seria }}>Requisitos parciales</Text>
                              </>
                            );
                            return (
                              <>
                                <XCircle size={12} color={c.seria} weight="fill" />
                                <Text variant="caption" style={{ color: c.seria }}>Sin requisitos</Text>
                              </>
                            );
                          })()}
                        </View>
                      ) : null}
                    </View>
                    <View style={staticStyles.pendingChevron}>
                      <Text variant="caption" color="textTertiary">Ver →</Text>
                    </View>
                  </PressableScale>
                  {i < pendingParticipants.length - 1 ? <Divider inset /> : null}
                </View>
              ))}
            </Card>
            ) : (
              <Card>
                <Text variant="small" color="textTertiary" style={{ textAlign: 'center' }}>
                  Sin solicitudes pendientes
                </Text>
              </Card>
            )}
          </Section>
        ) : null}

        {/* ── Joined players ────────────────────────────── */}
        {match.joinedPlayers.length > 0 ? (
          <Section title={`${match.joinedPlayers.length} jugador${match.joinedPlayers.length !== 1 ? 'es' : ''} confirmado${match.joinedPlayers.length !== 1 ? 's' : ''}`}>
            {isOrganizer ? (
              <Card padded={false}>
                {match.joinedPlayers.map((p, i) => (
                  <View key={p.id}>
                    <ParticipantRow
                      player={p}
                      showPayment
                      c={c}
                      onPress={() => setSelectedParticipant(p)}
                    />
                    {i < match.joinedPlayers.length - 1 ? <Divider inset /> : null}
                  </View>
                ))}
              </Card>
            ) : (
              <Card>
                <View style={s.avatarsRow}>
                  {match.joinedPlayers.map((p) => (
                    <PressableScale
                      key={p.id}
                      scaleTo={0.9}
                      onPress={() => router.push(`/perfil/${p.id}`)}
                      style={s.avatarItem}
                    >
                      <Avatar name={p.name} uri={p.avatarUrl} size={40} />
                      <Text variant="caption" color="textSecondary" numberOfLines={1} style={s.avatarName}>
                        {p.name.split(' ')[0]}
                      </Text>
                    </PressableScale>
                  ))}
                </View>
              </Card>
            )}
          </Section>
        ) : null}
      </ScrollView>

      {/* ── Sticky footer ─────────────────────────────── */}
      {!isOrganizer && !match.endedAt && !isAdmin ? (
        <View style={s.footer}>
          {myStatus === 'joined' || joined ? (
            <>
              <View style={s.joinedBadge}>
                <CheckCircle size={18} color={c.primary} weight="fill" />
                <Text variant="bodyMedium" color="primary">
                  Ya estás unido a esta partida
                </Text>
              </View>
              <Button
                label={isLeaving ? 'Saliendo…' : 'Salirme de la partida'}
                variant="secondary"
                disabled={isLeaving}
                onPress={handleLeave}
              />
            </>
          ) : myStatus === 'pending' ? (
            <View style={s.joinedBadge}>
              <Clock size={18} color={c.textSecondary} weight="fill" />
              <Text variant="bodyMedium" color="textSecondary">
                Solicitud enviada — en espera de aprobación
              </Text>
            </View>
          ) : myStatus === 'rejected' ? (
            <View style={s.joinedBadge}>
              <XCircle size={18} color={c.seria} weight="fill" />
              <Text variant="bodyMedium" style={{ color: c.seria }}>
                Tu solicitud no fue aceptada
              </Text>
            </View>
          ) : (
            <>
              <Button
                label="Quiero unirme"
                onPress={() => router.push(`/unirse/${match.id}`)}
              />
              <Text variant="small" color="textTertiary" style={s.footerNote}>
                El pago se coordina con el organizador
              </Text>
            </>
          )}
        </View>
      ) : null}

      {/* ── Leave confirm ─────────────────────────────── */}
      <ConfirmSheet
        visible={leaveConfirmOpen}
        onClose={() => setLeaveConfirmOpen(false)}
        title="Salirse de la partida"
        description="¿Seguro que quieres salirte? El organizador será notificado."
        confirmLabel="Salirme"
        onConfirm={() => leaveMatch(match!.id, { onSuccess: () => router.back() })}
      />

      {/* ── Join request detail ────────────────────────── */}
      <Sheet
        visible={selectedParticipant !== null}
        onClose={() => setSelectedParticipant(null)}
        title={selectedParticipant && pendingParticipants?.some((pp) => pp.id === selectedParticipant.id) ? 'Solicitud de unión' : 'Jugador confirmado'}
      >
        {selectedParticipant ? (
          <ParticipantDetail
            participant={selectedParticipant}
            match={match}
            isPending={!!pendingParticipants?.some((pp) => pp.id === selectedParticipant.id)}
            isApproving={isApproving}
            isRejecting={isRejecting}
            c={c}
            onApprove={() => {
              approveParticipant({ matchId: match!.id, profileId: selectedParticipant.id });
              setSelectedParticipant(null);
            }}
            onReject={() => {
              rejectParticipant({ matchId: match!.id, profileId: selectedParticipant.id });
              setSelectedParticipant(null);
            }}
            onViewProfile={() => {
              setSelectedParticipant(null);
              setTimeout(() => router.push(`/perfil/${selectedParticipant.id}`), 250);
            }}
          />
        ) : null}
      </Sheet>

      {/* ── Map modal ─────────────────────────────────── */}
      {match.location.lat && match.location.lng ? (
        <Modal
          visible={mapOpen}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setMapOpen(false)}
        >
          <View style={s.mapModal}>
            <View style={s.mapHeader}>
              <Text variant="bodySemibold" color="textPrimary" style={{ flex: 1 }}>
                {match.location.name}
              </Text>
              <PressableScale scaleTo={0.9} onPress={() => setMapOpen(false)}>
                <X size={22} color={c.textPrimary} weight="bold" />
              </PressableScale>
            </View>
            {match.location.address ? (
              <Text variant="small" color="textSecondary" style={s.mapAddress}>
                {match.location.address}
              </Text>
            ) : null}
            <MapView
              style={s.map}
              initialRegion={{
                latitude: match.location.lat,
                longitude: match.location.lng,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
            >
              <Marker
                coordinate={{ latitude: match.location.lat, longitude: match.location.lng }}
                title={match.location.name}
                description={match.location.address}
              />
            </MapView>
          </View>
        </Modal>
      ) : null}
    </Screen>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DetailRow({
  icon,
  label,
  sub,
  trailing,
}: {
  icon: ReactNode;
  label: string;
  sub?: string;
  trailing?: ReactNode;
}) {
  return (
    <View style={staticStyles.detailRow}>
      <View style={staticStyles.detailIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium" color="textPrimary">
          {label}
        </Text>
        {sub ? (
          <Text variant="small" color="textSecondary">
            {sub}
          </Text>
        ) : null}
      </View>
      {trailing ? <View>{trailing}</View> : null}
    </View>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={staticStyles.section}>
      <View style={staticStyles.sectionHead}>
        {icon ?? null}
        <Text variant="caption" color="textSecondary">
          {title.toUpperCase()}
        </Text>
      </View>
      {children}
    </View>
  );
}

function ParticipantRow({
  player,
  showPayment,
  c,
  onPress,
}: {
  player: MatchParticipant;
  showPayment?: boolean;
  c: ColorPalette;
  onPress: () => void;
}) {
  const positions = player.positions.slice(0, 2);
  return (
    <PressableScale scaleTo={0.98} onPress={onPress} style={staticStyles.participantRow}>
      <Avatar name={player.name} uri={player.avatarUrl} size={40} />
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Text variant="bodyMedium" color="textPrimary">{player.name}</Text>
          {player.verified ? <CheckCircle size={13} color={c.primary} weight="fill" /> : null}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {positions.map((pos) => (
            <View key={pos} style={[staticStyles.pill, staticStyles.pillNeutral(c)]}>
              <Person size={10} color={c.textTertiary} weight="fill" />
              <Text variant="caption" color="textSecondary">{labelPosition(pos)}</Text>
            </View>
          ))}
          {showPayment && player.paymentMethod ? (
            <View key="pay" style={[staticStyles.pill, staticStyles.pillNeutral(c)]}>
              <Text variant="caption" color="textSecondary">{labelPayment(player.paymentMethod)}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </PressableScale>
  );
}

const staticStyles = {
  ...StyleSheet.create({
    section: { gap: spacing.sm },
    sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    detailIcon: { width: 22, alignItems: 'center' },
    participantRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    pill: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radius.full,
      borderWidth: 1,
    },
    pendingChevron: {
      paddingLeft: spacing.xs,
    },
    detailIconCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
  }),
  pillNeutral: (c: ColorPalette) => ({
    backgroundColor: c.surface,
    borderColor: c.border,
  }),
};

// ─── Participant detail sheet content ────────────────────────────────────────

const SKILL_LABEL_MAP: Record<number, string> = {
  1: 'Principiante', 2: 'Básico', 3: 'Intermedio', 4: 'Avanzado', 5: 'Competitivo',
};

function ParticipantDetail({
  participant,
  match,
  isPending,
  isApproving,
  isRejecting,
  c,
  onApprove,
  onReject,
  onViewProfile,
}: {
  participant: MatchParticipant;
  match: Match;
  isPending: boolean;
  isApproving: boolean;
  isRejecting: boolean;
  c: ColorPalette;
  onApprove: () => void;
  onReject: () => void;
  onViewProfile: () => void;
}) {
  const { data: fullProfile } = useProfile(participant.id);
  const profile = fullProfile ?? participant;

  const positionSet = new Set(match.missingPositions.map((p) => p.toString()));
  const participantPositions = profile.positions ?? [];
  const isOutOfPosition = participantPositions.length > 0 &&
    !participantPositions.some((p) => positionSet.has(p) || p === 'cualquiera');
  const levelDiff = profile.skillLevel - match.skillLevel;
  const levelWarning = Math.abs(levelDiff) > 1;

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
      <View style={{ gap: spacing.lg, paddingBottom: spacing.xl }}>

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Avatar name={profile.name} uri={profile.avatarUrl} size={56} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' }}>
              <Text variant="h3" color="textPrimary">{profile.name}</Text>
              {profile.verified ? <CheckCircle size={15} color={c.primary} weight="fill" /> : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 }}>
              {(profile.reputation ?? 0) > 0 ? (
                <Stars level={profile.reputation ?? 0} size={11} />
              ) : null}
              <Text variant="small" color="textSecondary">
                {profile.reputation?.toFixed(1) ?? '—'} · {profile.matchesPlayed ?? 0} partidas
              </Text>
            </View>
            {profile.city ? (
              <Text variant="caption" color="textTertiary">{profile.city}</Text>
            ) : null}
          </View>
        </View>

        {/* Warnings */}
        {isOutOfPosition ? (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            padding: spacing.md,
            backgroundColor: `${c.seria}18`,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: `${c.seria}44`,
          }}>
            <WarningCircle size={16} color={c.seria} weight="fill" />
            <Text variant="smallMedium" style={{ color: c.seria, flex: 1 }}>
              Fuera de posición — no coincide con las requeridas
            </Text>
          </View>
        ) : null}
        {levelWarning ? (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            padding: spacing.md,
            backgroundColor: `${c.seria}18`,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: `${c.seria}44`,
          }}>
            <WarningCircle size={16} color={c.seria} weight="fill" />
            <Text variant="smallMedium" style={{ color: c.seria, flex: 1 }}>
              Nivel {levelDiff > 0 ? 'superior' : 'inferior'} al requerido ({SKILL_LABEL_MAP[match.skillLevel]})
            </Text>
          </View>
        ) : null}

        {/* Positions */}
        {profile.sports.length > 0 ? (
          <View style={{ gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Person size={13} color={c.textTertiary} weight="fill" />
              <Text variant="caption" color="textSecondary">POSICIÓN</Text>
            </View>
            <PlayerPositions
              sports={profile.sports}
              positions={participantPositions}
              matchPositions={positionSet}
            />
          </View>
        ) : null}

        {/* Payment */}
        {participant.paymentMethod ? (
          <View style={{ gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <CreditCard size={13} color={c.textTertiary} weight="fill" />
              <Text variant="caption" color="textSecondary">MÉTODO DE PAGO</Text>
            </View>
            <View style={[staticStyles.pill, staticStyles.pillNeutral(c), { alignSelf: 'flex-start' }]}>
              <Text variant="bodyMedium" color="textPrimary">{labelPayment(participant.paymentMethod)}</Text>
            </View>
          </View>
        ) : null}

        {/* Required requisites */}
        {match.requirements.length > 0 ? (
          <View style={{ gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <ShieldCheck size={13} color={c.textTertiary} weight="fill" />
              <Text variant="caption" color="textSecondary">REQUISITOS OBLIGATORIOS</Text>
            </View>
            <View style={{ gap: spacing.xs }}>
              {match.requirements.map((req) => {
                const has = participant.checkedRequirements?.includes(req) ?? false;
                return (
                  <View key={req} style={{
                    flexDirection: 'row',
                    alignSelf: 'flex-start',
                    alignItems: 'center',
                    gap: spacing.sm,
                    paddingVertical: spacing.xs,
                    paddingHorizontal: spacing.sm,
                    backgroundColor: has ? `${c.primary}12` : `${c.seria}12`,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: has ? `${c.primary}33` : `${c.seria}33`,
                  }}>
                    {has ? (
                      <CheckCircle size={13} color={c.primary} weight="fill" />
                    ) : (
                      <XCircle size={13} color={c.seria} weight="fill" />
                    )}
                    <Text variant="small" style={{ color: has ? c.primary : c.seria }}>{req}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Optional requisites */}
        {(match.optionalRequirements ?? []).length > 0 ? (
          <View style={{ gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <ShieldCheck size={13} color={c.textTertiary} weight="regular" />
              <Text variant="caption" color="textSecondary">REQUISITOS OPCIONALES</Text>
            </View>
            <View style={{ gap: spacing.xs }}>
              {(match.optionalRequirements ?? []).map((req) => {
                const has = participant.checkedRequirements?.includes(req) ?? false;
                return (
                  <View key={req} style={{
                    flexDirection: 'row',
                    alignSelf: 'flex-start',
                    alignItems: 'center',
                    gap: spacing.sm,
                    paddingVertical: spacing.xs,
                    paddingHorizontal: spacing.sm,
                    backgroundColor: has ? `${c.primary}0C` : c.surface,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: has ? `${c.primary}33` : c.border,
                  }}>
                    {has ? (
                      <CheckCircle size={13} color={c.primary} weight="fill" />
                    ) : (
                      <XCircle size={13} color={c.textTertiary} weight="fill" />
                    )}
                    <Text variant="small" style={{ color: has ? c.primary : c.textSecondary }}>{req}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Actions */}
        <Button
          label="Ver perfil completo"
          variant="secondary"
          onPress={onViewProfile}
        />
        {isPending ? (
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button
              label={isRejecting ? 'Rechazando…' : 'Rechazar'}
              variant="secondary"
              disabled={isRejecting || isApproving}
              style={{ flex: 1 }}
              onPress={onReject}
            />
            <Button
              label={isApproving ? 'Aprobando…' : 'Aprobar'}
              disabled={isApproving || isRejecting}
              style={{ flex: 1 }}
              onPress={onApprove}
            />
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    scroll: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xs,
      paddingBottom: 140,
      gap: spacing.xl,
    },
    headerActions: { flexDirection: 'row', gap: spacing.sm },
    headerBtn: {
      width: 38,
      height: 38,
      borderRadius: radius.full,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Hero
    hero: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: spacing.md,
      paddingTop: spacing.sm,
    },
    heroLeft: { flex: 1, gap: spacing.sm },
    heroEmoji: { fontSize: 36, lineHeight: 44 },
    heroMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    priceTag: { alignItems: 'flex-end', paddingTop: spacing.xs },
    // Level
    levelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    // Chips
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    // Payment
    payRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    // Requirements
    reqRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    // Organizer
    organizerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    orgNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    repRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    // Players
    avatarsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    avatarItem: { alignItems: 'center', gap: spacing.xs },
    avatarName: { maxWidth: 52 },
    // Footer
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
      gap: spacing.xs,
    },
    footerNote: { textAlign: 'center' },
    joinedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      backgroundColor: c.primarySoft,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.primary,
    },
    // Map modal
    mapModal: {
      flex: 1,
      backgroundColor: c.bg,
    },
    mapHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
      gap: spacing.md,
    },
    mapAddress: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
    },
    map: { flex: 1 },
  });
}
