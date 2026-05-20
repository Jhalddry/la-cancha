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
  WhatsappLogo,
} from 'phosphor-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { BackHeader } from '@/components/ui/BackHeader';
import { Badge } from '@/components/ui/Badge';
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
import {
  formatMatchTime,
  formatPrice,
  labelModality,
  labelPayment,
  labelPosition,
  labelSkill,
} from '@/lib/format';
import { colors, radius, spacing } from '@/theme';

export default function MatchDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const match = mockMatches.find((m) => m.id === id) ?? mockMatches[0];
  const typeMeta = matchTypeMeta[match.type];
  const isOrganizer = match.organizer.id === mockCurrentUser.id;

  return (
    <Screen edges={['top']}>
      <BackHeader
        title={labelModality(match.modality)}
        transparent
        trailing={
          <View style={styles.headerActions}>
            {isOrganizer ? (
              <PressableScale
                style={styles.shareBtn}
                scaleTo={0.9}
                onPress={() => router.push(`/editar/${match.id}`)}
              >
                <PencilSimple size={20} color={colors.primary} weight="fill" />
              </PressableScale>
            ) : null}
            <PressableScale style={styles.shareBtn} scaleTo={0.9}>
              <ShareNetwork size={20} color={colors.textPrimary} weight="regular" />
            </PressableScale>
          </View>
        }
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headRow}>
          <Badge label={labelModality(match.modality)} tone="primary" />
        </View>
        <View style={styles.heroRow}>
          <Text variant="h1">
            Faltan {match.missingCount} {match.missingCount === 1 ? 'jugador' : 'jugadores'}
          </Text>
          <View style={styles.priceCol}>
            <Text variant="h2" color="primary">
              {formatPrice(match.pricePerHour, match.currency)}/h
            </Text>
            <Text variant="caption" color="textTertiary">
              Por hora
            </Text>
          </View>
        </View>

        <View style={styles.metaList}>
          <DetailRow
            icon={<CalendarBlank size={18} color={colors.primary} weight="fill" />}
            label={formatMatchTime(match.startsAt)}
            sub={`${match.durationMin} minutos`}
          />
          <DetailRow
            icon={<MapPin size={18} color={colors.primary} weight="fill" />}
            label={match.location.name}
            sub={match.location.address}
            trailing={
              <Text variant="smallMedium" color="primary">
                Ver en mapa
              </Text>
            }
          />
          <DetailRow
            icon={
              <Text style={{ fontSize: 16 }}>{typeMeta.emoji}</Text>
            }
            label="Tipo de partida"
            trailing={<MatchTypeBadge type={match.type} />}
          />
          <DetailRow
            icon={<Trophy size={18} color={colors.primary} weight="fill" />}
            label="Nivel requerido"
            trailing={
              <View style={styles.levelRow}>
                <Stars level={match.skillLevel} size={14} />
                <Text variant="smallMedium" color="textSecondary">
                  {labelSkill(match.skillLevel)}
                </Text>
              </View>
            }
          />
        </View>

        <Section title="Posiciones que faltan">
          <View style={styles.chips}>
            {match.missingPositions.map((p) => (
              <Chip key={p} label={labelPosition(p)} selected />
            ))}
          </View>
        </Section>

        <Section title="Métodos de pago">
          <View style={styles.iconRow}>
            <CreditCard size={18} color={colors.textSecondary} weight="regular" />
            <Text variant="body" color="textSecondary" style={{ flex: 1 }}>
              {match.paymentMethods.map(labelPayment).join(' · ')}
            </Text>
          </View>
        </Section>

        {match.requirements.length > 0 ? (
          <Section title="Sobre la partida">
            {match.requirements.map((r) => (
              <View key={r} style={styles.reqRow}>
                <ShieldCheck size={18} color={colors.primary} weight="fill" />
                <Text variant="body" color="textPrimary">
                  {r}
                </Text>
              </View>
            ))}
          </Section>
        ) : null}

        <Section title="Organizador">
          <Card onPress={() => router.push(`/perfil/${match.organizer.id}`)}>
            <View style={styles.organizerRow}>
              <Avatar name={match.organizer.name} size={48} />
              <View style={{ flex: 1 }}>
                <View style={styles.orgNameRow}>
                  <Text variant="bodySemibold" color="textPrimary">
                    {match.organizer.name}
                  </Text>
                  {match.organizer.verified ? (
                    <CheckCircle size={14} color={colors.primary} weight="fill" />
                  ) : null}
                </View>
                <View style={styles.repRow}>
                  <Stars
                    level={Math.round(match.organizer.reputation ?? 0) as 1 | 2 | 3 | 4 | 5}
                    size={12}
                  />
                  <Text variant="small" color="textSecondary">
                    {match.organizer.reputation?.toFixed(1) ?? '—'}
                  </Text>
                </View>
              </View>
              <IconCircle size={40} bg={colors.primarySoft} border={colors.primary}>
                <WhatsappLogo size={20} color={colors.primary} weight="fill" />
              </IconCircle>
            </View>
          </Card>
        </Section>

        <Divider />

        <View style={styles.joinedRow}>
          <Text variant="caption" color="textSecondary">
            Jugadores ya unidos
          </Text>
          <View style={styles.avatarsRow}>
            {match.joinedPlayers.map((p) => (
              <PressableScale key={p.id} scaleTo={0.9} onPress={() => router.push(`/perfil/${p.id}`)}>
                <Avatar name={p.name} size={36} />
              </PressableScale>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Quiero unirme" onPress={() => router.push(`/unirse/${match.id}`)} />
        <Text variant="small" color="textTertiary" style={styles.footerNote}>
          El pago se realiza al unirte a la partida
        </Text>
      </View>
    </Screen>
  );
}

function DetailRow({
  icon,
  label,
  sub,
  trailing,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <View style={styles.detailRow}>
      <IconCircle size={40} bg={colors.surface} border={colors.border}>
        {icon}
      </IconCircle>
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
      {trailing}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="caption" color="textSecondary">
        {title}
      </Text>
      {children}
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
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headRow: { flexDirection: 'row' },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  priceCol: { alignItems: 'flex-end' },
  metaList: { gap: spacing.md },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  section: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  orgNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  repRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  joinedRow: { gap: spacing.sm },
  avatarsRow: { flexDirection: 'row', gap: spacing.sm },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
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
    gap: spacing.xs,
  },
  footerNote: { textAlign: 'center' },
});
