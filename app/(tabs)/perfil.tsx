import { useRouter } from 'expo-router';
import {
  CaretRight,
  CheckCircle,
  FileText,
  Gear,
  Lock,
  PencilSimple,
  Shield,
  SignOut,
  Sparkle,
  Trophy,
} from 'phosphor-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Divider } from '@/components/ui/Divider';
import { IconCircle } from '@/components/ui/IconCircle';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Stars } from '@/components/ui/Stars';
import { Text } from '@/components/ui/Text';
import { labelPosition, labelSkill, labelSport } from '@/lib/format';
import type { Sport } from '@/types/domain';

const SPORT_EMOJIS: Record<Sport, string> = {
  futbol: '⚽',
  tenis: '🎾',
  padel: '🏓',
  beachTennis: '🏖️',
  basket: '🏀',
};
import { useSession } from '@/store/session';
import { colors, radius, spacing } from '@/theme';

export default function PerfilScreen() {
  const router = useRouter();
  const u = useSession((s) => s.user);
  const signOut = useSession((s) => s.signOut);

  if (!u) {
    return (
      <Screen>
        <View style={styles.empty}>
          <Text variant="h3">Sin sesión activa</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.head}>
          <Avatar name={u.name} size={88} />
          <View style={styles.headInfo}>
            <Text variant="h2">{u.name}</Text>
            <View style={styles.repRow}>
              <Stars level={Math.round(u.reputation ?? 0) as 1 | 2 | 3 | 4 | 5} />
              <Text variant="smallMedium" color="textSecondary">
                {u.reputation?.toFixed(1) ?? '—'}
              </Text>
            </View>
            <Text variant="small" color="textSecondary">
              {labelSkill(u.skillLevel)}
            </Text>
            {u.verified ? (
              <View style={styles.verified}>
                <CheckCircle size={16} color={colors.primary} weight="fill" />
                <Text variant="smallMedium" color="primary">
                  Jugador verificado
                </Text>
              </View>
            ) : null}
          </View>
          <PressableScale
            onPress={() => router.push('/perfil/editar')}
            style={styles.editBtn}
            scaleTo={0.9}
          >
            <PencilSimple size={18} color={colors.primary} weight="bold" />
          </PressableScale>
        </View>

        {u.bio ? (
          <Card>
            <Text variant="caption" color="textSecondary">
              Sobre mí
            </Text>
            <Text variant="body" color="textPrimary" style={styles.bio}>
              {u.bio}
            </Text>
          </Card>
        ) : null}

        <View>
          <Text variant="caption" color="textSecondary">
            Deportes
          </Text>
          <View style={styles.sportsRow}>
            {u.sports.map((s) => (
              <View key={s} style={styles.sportItem}>
                <View style={styles.sportIconWrap}>
                  <Text style={styles.sportEmoji}>{SPORT_EMOJIS[s]}</Text>
                </View>
                <Text variant="small" color="textPrimary">
                  {labelSport(s)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View>
          <Text variant="caption" color="textSecondary">
            Nivel de juego
          </Text>
          <Card style={styles.levelCard}>
            <Stars level={u.skillLevel} size={22} />
            <Text variant="bodySemibold" color="textPrimary">
              {labelSkill(u.skillLevel)}
            </Text>
          </Card>
        </View>

        <View>
          <Text variant="caption" color="textSecondary">
            Posiciones
          </Text>
          <View style={styles.chips}>
            {u.positions.map((p) => (
              <Chip key={p} label={labelPosition(p)} selected />
            ))}
          </View>
        </View>

        <Card padded={false}>
          <SettingsRow
            icon={<Trophy size={20} color={colors.primary} weight="fill" />}
            label="Historial de partidas"
            onPress={() => router.push('/historial')}
          />
          <Divider inset />
          <SettingsRow
            icon={<Shield size={20} color={colors.primary} weight="fill" />}
            label="Mi reputación"
            onPress={() => router.push('/reputacion')}
          />
          <Divider inset />
          <SettingsRow
            icon={<Sparkle size={20} color={colors.primary} weight="fill" />}
            label="Ver onboarding"
            onPress={() => router.push('/onboarding')}
          />
          <Divider inset />
          <SettingsRow
            icon={<Gear size={20} color={colors.primary} weight="fill" />}
            label="Ajustes"
            onPress={() => router.push('/ajustes')}
          />
          <Divider inset />
          <SettingsRow
            icon={<FileText size={20} color={colors.textTertiary} weight="regular" />}
            label="Términos de servicio"
            onPress={() => router.push('/terminos')}
          />
          <Divider inset />
          <SettingsRow
            icon={<Lock size={20} color={colors.textTertiary} weight="regular" />}
            label="Política de privacidad"
            onPress={() => router.push('/privacidad')}
          />
          <Divider inset />
          <SettingsRow
            icon={<SignOut size={20} color={colors.alert} weight="bold" />}
            label="Cerrar sesión"
            danger
            onPress={() => {
              signOut();
              router.replace('/login');
            }}
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}

function SettingsRow({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <PressableScale onPress={onPress} style={styles.settingRow} scaleTo={0.98}>
      <IconCircle size={40} bg={colors.surfaceElevated} border={colors.border}>
        {icon}
      </IconCircle>
      <Text
        variant="bodyMedium"
        color={danger ? 'alert' : 'textPrimary'}
        style={{ flex: 1 }}
      >
        {label}
      </Text>
      <CaretRight size={16} color={colors.textTertiary} weight="bold" />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 120,
    gap: spacing.xl,
  },
  head: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center' },
  headInfo: { flex: 1, gap: spacing.xs },
  repRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  verified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bio: { marginTop: spacing.xs },
  sportsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
  sportItem: { alignItems: 'center', gap: spacing.xs, width: 64 },
  sportEmoji: { fontSize: 28, lineHeight: 36 },
  sportIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
