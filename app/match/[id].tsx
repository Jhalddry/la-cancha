import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  CalendarBlank,
  CheckCircle,
  CreditCard,
  MapPin,
  PencilSimple,
  ShareNetwork,
  ShieldCheck,
  Trophy,
  UsersThree,
  WhatsappLogo,
} from 'phosphor-react-native';
import { useMemo, type ReactNode } from 'react';
import { ScrollView, Share, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Divider } from '@/components/ui/Divider';
import { IconCircle } from '@/components/ui/IconCircle';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Stars } from '@/components/ui/Stars';
import { Text } from '@/components/ui/Text';
import { mockMatches } from '@/data/matches';
import { mockCurrentUser } from '@/data/players';
import { MatchTypeBadge } from '@/features/match/MatchTypeBadge';
import { matchTypeMeta } from '@/features/match/matchTypeMeta';
import { useColors } from '@/hooks/useColors';
import { useJoinedMatches } from '@/store/joinedMatches';
import { useMatchOverrides } from '@/store/matchOverrides';
import {
  formatMatchTime,
  formatPrice,
  labelModality,
  labelPayment,
  labelPosition,
  labelSkill,
} from '@/lib/format';
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
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const getMatch = useMatchOverrides((st) => st.getMatch);
  const hasJoined = useJoinedMatches((st) => st.hasJoined);
  const base = mockMatches.find((m) => m.id === id) ?? mockMatches[0];
  const match = getMatch(base);
  const typeMeta = matchTypeMeta[match.type];
  const isOrganizer = match.organizer.id === mockCurrentUser.id;
  const joined = hasJoined(match.id);

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
            {isOrganizer ? (
              <PressableScale
                style={s.headerBtn}
                scaleTo={0.9}
                onPress={() => router.push(`/editar/${match.id}`)}
              >
                <PencilSimple size={18} color={c.primary} weight="fill" />
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
              <Text variant="h1" color="textPrimary">
                Faltan {match.missingCount}{' '}
                {match.missingCount === 1 ? 'jugador' : 'jugadores'}
              </Text>
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
              <Text variant="smallMedium" color="primary">
                Mapa
              </Text>
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
          <View style={s.chips}>
            {match.missingPositions.map((p) => (
              <Chip key={p} label={labelPosition(p)} selected />
            ))}
          </View>
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
              <Avatar name={match.organizer.name} size={46} />
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
                  <Stars
                    level={Math.round(match.organizer.reputation ?? 0) as 1 | 2 | 3 | 4 | 5}
                    size={12}
                  />
                  <Text variant="small" color="textSecondary">
                    {match.organizer.reputation?.toFixed(1) ?? '—'} · Organizador
                  </Text>
                </View>
              </View>
              <IconCircle size={40} bg={c.primarySoft} border={c.primary}>
                <WhatsappLogo size={20} color={c.primary} weight="fill" />
              </IconCircle>
            </View>
          </Card>
        </Section>

        {/* ── Joined players ────────────────────────────── */}
        {match.joinedPlayers.length > 0 ? (
          <Section title={`${match.joinedPlayers.length} jugador${match.joinedPlayers.length !== 1 ? 'es' : ''} confirmado${match.joinedPlayers.length !== 1 ? 's' : ''}`}>
            <Card>
              <View style={s.avatarsRow}>
                {match.joinedPlayers.map((p) => (
                  <PressableScale
                    key={p.id}
                    scaleTo={0.9}
                    onPress={() => router.push(`/perfil/${p.id}`)}
                    style={s.avatarItem}
                  >
                    <Avatar name={p.name} size={40} />
                    <Text variant="caption" color="textSecondary" numberOfLines={1} style={s.avatarName}>
                      {p.name.split(' ')[0]}
                    </Text>
                  </PressableScale>
                ))}
              </View>
            </Card>
          </Section>
        ) : null}
      </ScrollView>

      {/* ── Sticky footer ─────────────────────────────── */}
      <View style={s.footer}>
        {joined ? (
          <View style={s.joinedBadge}>
            <CheckCircle size={18} color={c.primary} weight="fill" />
            <Text variant="bodyMedium" color="primary">
              Ya estás unido a esta partida
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

const staticStyles = StyleSheet.create({
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
});

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
  });
}
