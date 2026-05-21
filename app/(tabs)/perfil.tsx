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
import { useMemo } from 'react';
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
import { useColors } from '@/hooks/useColors';
import { labelPosition, labelSkill, labelSport } from '@/lib/format';
import { useSession } from '@/store/session';
import { radius, spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';
import type { Sport } from '@/types/domain';

const SPORT_EMOJIS: Record<Sport, string> = {
  futbol: '⚽',
  tenis: '🎾',
  padel: '🏓',
  beachTennis: '🏖️',
  basket: '🏀',
};

export default function PerfilScreen() {
  const router = useRouter();
  const u = useSession((s) => s.user);
  const signOut = useSession((s) => s.signOut);
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);

  if (!u) {
    return (
      <Screen>
        <View style={s.empty}>
          <Text variant="h3">Sin sesión activa</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.head}>
          <Avatar name={u.name} size={88} />
          <View style={s.headInfo}>
            <Text variant="h2">{u.name}</Text>
            <View style={s.repRow}>
              <Stars level={Math.round(u.reputation ?? 0) as 1 | 2 | 3 | 4 | 5} />
              <Text variant="smallMedium" color="textSecondary">
                {u.reputation?.toFixed(1) ?? '—'}
              </Text>
            </View>
            <Text variant="small" color="textSecondary">
              {labelSkill(u.skillLevel)}
            </Text>
            {u.verified ? (
              <View style={s.verified}>
                <CheckCircle size={16} color={c.primary} weight="fill" />
                <Text variant="smallMedium" color="primary">
                  Jugador verificado
                </Text>
              </View>
            ) : null}
          </View>
          <PressableScale
            onPress={() => router.push('/perfil/editar')}
            style={s.editBtn}
            scaleTo={0.9}
          >
            <PencilSimple size={18} color={c.primary} weight="bold" />
          </PressableScale>
        </View>

        {u.bio ? (
          <Card>
            <Text variant="caption" color="textSecondary">
              Sobre mí
            </Text>
            <Text variant="body" color="textPrimary" style={s.bio}>
              {u.bio}
            </Text>
          </Card>
        ) : null}

        <View>
          <Text variant="caption" color="textSecondary">
            Deportes
          </Text>
          <View style={s.sportsRow}>
            {u.sports.map((sport) => (
              <View key={sport} style={s.sportItem}>
                <View style={s.sportIconWrap}>
                  <Text style={s.sportEmoji}>{SPORT_EMOJIS[sport]}</Text>
                </View>
                <Text variant="small" color="textPrimary">
                  {labelSport(sport)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View>
          <Text variant="caption" color="textSecondary">
            Nivel de juego
          </Text>
          <Card style={s.levelCard}>
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
          <View style={s.chips}>
            {u.positions.map((p) => (
              <Chip key={p} label={labelPosition(p)} selected />
            ))}
          </View>
        </View>

        <Card padded={false}>
          <SettingsRow
            icon={<Trophy size={20} color={c.primary} weight="fill" />}
            label="Historial de partidas"
            onPress={() => router.push('/historial')}
            c={c}
            s={s}
          />
          <Divider inset />
          <SettingsRow
            icon={<Shield size={20} color={c.primary} weight="fill" />}
            label="Mi reputación"
            onPress={() => router.push('/reputacion')}
            c={c}
            s={s}
          />
          <Divider inset />
          <SettingsRow
            icon={<Sparkle size={20} color={c.primary} weight="fill" />}
            label="Ver onboarding"
            onPress={() => router.push('/onboarding')}
            c={c}
            s={s}
          />
          <Divider inset />
          <SettingsRow
            icon={<Gear size={20} color={c.primary} weight="fill" />}
            label="Ajustes"
            onPress={() => router.push('/ajustes')}
            c={c}
            s={s}
          />
          <Divider inset />
          <SettingsRow
            icon={<FileText size={20} color={c.textTertiary} weight="regular" />}
            label="Términos de servicio"
            onPress={() => router.push('/terminos')}
            c={c}
            s={s}
          />
          <Divider inset />
          <SettingsRow
            icon={<Lock size={20} color={c.textTertiary} weight="regular" />}
            label="Política de privacidad"
            onPress={() => router.push('/privacidad')}
            c={c}
            s={s}
          />
          <Divider inset />
          <SettingsRow
            icon={<SignOut size={20} color={c.alert} weight="bold" />}
            label="Cerrar sesión"
            danger
            onPress={() => {
              signOut();
              router.replace('/login');
            }}
            c={c}
            s={s}
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
  c,
  s,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  danger?: boolean;
  c: ColorPalette;
  s: ReturnType<typeof makeStyles>;
}) {
  return (
    <PressableScale onPress={onPress} style={s.settingRow} scaleTo={0.98}>
      <IconCircle size={40} bg={c.surfaceElevated} border={c.border}>
        {icon}
      </IconCircle>
      <Text
        variant="bodyMedium"
        color={danger ? 'alert' : 'textPrimary'}
        style={{ flex: 1 }}
      >
        {label}
      </Text>
      <CaretRight size={16} color={c.textTertiary} weight="bold" />
    </PressableScale>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
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
      backgroundColor: c.primarySoft,
      borderWidth: 1,
      borderColor: c.primary,
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
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
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
}
