import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  CalendarCheck,
  CaretRight,
  CheckCircle,
  Crown,
  FileText,
  Flag,
  Gear,
  Lock,
  PencilSimple,
  SealCheck,
  Shield,
  ShieldStar,
  SignOut,
  SoccerBall,
  Star,
  Trophy,
} from 'phosphor-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
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
import { Card } from '@/components/ui/Card';
import { Sheet } from '@/components/ui/Sheet';
import { PlayerPositions } from '@/components/feature/PlayerPositions';
import { Stars } from '@/components/ui/Stars';
import { Divider } from '@/components/ui/Divider';
import { IconCircle } from '@/components/ui/IconCircle';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useColors } from '@/hooks/useColors';
import { useProfile, useRequestVerification } from '@/hooks/useProfiles';
import { labelSkill, labelSport } from '@/lib/format';
import { useSession } from '@/store/session';
import { radius, spacing } from '@/theme';
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

function MetallicBadge({ label, onPress }: { label: string; onPress: () => void }) {
  const meta = BADGE_META[label] ?? {
    color: '#7BFF00',
    icon: (n: number) => <Star size={n} color="#7BFF00" weight="fill" />,
    description: '',
    requirement: '',
  };
  const { color, icon } = meta;
  const shimX = useSharedValue(-80);

  useEffect(() => {
    const run = () => {
      shimX.value = -80;
      shimX.value = withTiming(220, { duration: 900 });
    };
    run();
    const id = setInterval(run, 3500);
    return () => { clearInterval(id); cancelAnimation(shimX); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimX.value }],
  }));

  return (
    <PressableScale onPress={onPress} scaleTo={0.93}>
      <View style={[metallicBadgeStyle.outer, { borderColor: `${color}80` }]}>
        <LinearGradient
          colors={[`${color}22`, `${color}50`, `${color}22`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={metallicBadgeStyle.gradient}
        >
          <Animated.View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
            <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, width: 70 }, shimStyle]}>
              <LinearGradient
                colors={['transparent', `${color}65`, 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flex: 1 }}
              />
            </Animated.View>
          </Animated.View>
          {icon(14)}
          <Text variant="smallMedium" style={{ color }}>{label}</Text>
        </LinearGradient>
      </View>
    </PressableScale>
  );
}

function BadgeInfoSheet({ label, onClose }: { label: string | null; onClose: () => void }) {
  if (!label) return null;
  const meta = BADGE_META[label] ?? {
    color: '#7BFF00',
    icon: (n: number) => <Star size={n} color="#7BFF00" weight="fill" />,
    description: '',
    requirement: '',
  };
  const { color, icon, description, requirement } = meta;
  return (
    <Sheet visible={!!label} onClose={onClose} title="Insignia">
      <View style={{ gap: spacing.lg, paddingBottom: spacing.md, alignItems: 'center' }}>
        <View style={{
          width: 80, height: 80, borderRadius: 40,
          backgroundColor: `${color}18`,
          borderWidth: 1.5, borderColor: `${color}70`,
          alignItems: 'center', justifyContent: 'center',
        }}>
          {icon(40)}
        </View>
        <Text variant="h3" color="textPrimary" style={{ textAlign: 'center' }}>{label}</Text>
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
      </View>
    </Sheet>
  );
}

const metallicBadgeStyle = StyleSheet.create({
  outer: {
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});

function AvatarRing() {
  const c = useColors();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.18, { duration: 1200 }), withTiming(1, { duration: 1200 })),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withSequence(withTiming(0.15, { duration: 1200 }), withTiming(0.55, { duration: 1200 })),
      -1,
      false,
    );
    return () => { cancelAnimation(scale); cancelAnimation(opacity); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  return (
    <Animated.View
      style={[ringStyle, {
        position: 'absolute',
        width: 88,
        height: 88,
        borderRadius: 44,
        borderWidth: 2.5,
        borderColor: c.primary,
      }]}
      pointerEvents="none"
    />
  );
}

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
  const [verifySheetOpen, setVerifySheetOpen] = useState(false);
  const [verifyDoneOpen, setVerifyDoneOpen] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null);
  const { mutate: sendVerifyRequest } = useRequestVerification();
  const { data: liveProfile } = useProfile(u?.id ?? '');
  const ownBadges = liveProfile?.badges ?? [];

  if (!u) {
    return (
      <Screen>
        <View style={s.empty}>
          <Text variant="h3" style={{ marginBottom: spacing.lg }}>
            Cargando perfil…
          </Text>
          <PressableScale
            scaleTo={0.96}
            onPress={async () => {
              await signOut();
              router.replace('/login');
            }}
          >
            <Text variant="bodyMedium" color="alert">
              Cerrar sesión
            </Text>
          </PressableScale>
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
          <View style={{ position: 'relative' }}>
            <AvatarRing />
            <Avatar name={u.name} uri={u.avatarUrl} size={88} />
            {u.verified ? (
              <View style={s.avatarVerifiedBadge}>
                <SealCheck size={20} color={VERIFIED_BLUE} weight="fill" />
              </View>
            ) : null}
          </View>
          <View style={s.headInfo}>
            <Text variant="h2">{u.name}</Text>
            {u.username ? (
              <Text variant="small" color="textSecondary">
                @{u.username}
              </Text>
            ) : null}
            <Text variant="small" color="textSecondary">
              {labelSkill(u.skillLevel)}
            </Text>
            {u.verified ? (
              <View style={s.verified}>
                <SealCheck size={16} color={VERIFIED_BLUE} weight="fill" />
                <Text variant="smallMedium" style={{ color: VERIFIED_BLUE }}>
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

        {ownBadges.length > 0 ? (
          <View style={s.badgesWrap}>
            {ownBadges.map((b) => <MetallicBadge key={b} label={b} onPress={() => setSelectedBadge(b)} />)}
          </View>
        ) : null}

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

        {u.sports.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            <Text variant="caption" color="textSecondary">Posiciones</Text>
            <PlayerPositions sports={u.sports} positions={u.positions} />
          </View>
        ) : null}

        <Card padded={false}>
          {u.isAdmin ? (
            <>
              <SettingsRow
                icon={<ShieldStar size={20} color={c.primary} weight="fill" />}
                label="Verificaciones pendientes"
                onPress={() => router.push('/admin/verificaciones')}
                c={c}
                s={s}
              />
              <Divider inset />
            </>
          ) : null}
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
          {!u.verified ? (
            <>
              <Divider inset />
              <SettingsRow
                icon={<SealCheck size={20} color={c.primary} weight="fill" />}
                label="Solicitar verificación"
                onPress={() => setVerifySheetOpen(true)}
                c={c}
                s={s}
              />
            </>
          ) : null}
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

      <Sheet visible={verifySheetOpen} onClose={() => setVerifySheetOpen(false)} title="Verificación de jugador">
        <View style={{ gap: spacing.lg, paddingBottom: spacing.md }}>
          <View style={{ alignItems: 'center', gap: spacing.md }}>
            <View style={{
              width: 72, height: 72, borderRadius: 36,
              backgroundColor: c.primarySoft,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <SealCheck size={40} color={c.primary} weight="fill" />
            </View>
            <Text variant="body" color="textSecondary" style={{ textAlign: 'center', lineHeight: 22 }}>
              La insignia verificada confirma que eres un jugador de confianza en La Cancha.
              Revisaremos tu perfil y actividades en un plazo de 24–48 horas.
            </Text>
          </View>
          <View style={{ gap: spacing.sm }}>
            {[
              'Perfil completo con foto y bio',
              'Al menos 5 partidas jugadas',
              'Sin reportes de comportamiento',
            ].map((req) => (
              <View key={req} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <SealCheck size={14} color={c.primary} weight="fill" />
                <Text variant="small" color="textSecondary">{req}</Text>
              </View>
            ))}
          </View>
          <Button
            label="Enviar solicitud"
            onPress={() => {
              if (u?.id) sendVerifyRequest(u.id);
              setVerifySheetOpen(false);
              setTimeout(() => setVerifyDoneOpen(true), 300);
            }}
          />
        </View>
      </Sheet>

      <BadgeInfoSheet label={selectedBadge} onClose={() => setSelectedBadge(null)} />

      <Sheet visible={verifyDoneOpen} onClose={() => setVerifyDoneOpen(false)}>
        <View style={{ alignItems: 'center', gap: spacing.md, paddingBottom: spacing.md }}>
          <View style={{
            width: 72, height: 72, borderRadius: 36,
            backgroundColor: c.primarySoft,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <SealCheck size={40} color={c.primary} weight="fill" />
          </View>
          <Text variant="h3" color="textPrimary">Solicitud enviada</Text>
          <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
            Revisaremos tu perfil en las próximas 24–48 horas. Te notificaremos cuando sea aprobado.
          </Text>
          <Button label="Entendido" onPress={() => setVerifyDoneOpen(false)} />
        </View>
      </Sheet>
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
    avatarVerifiedBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: c.bg,
      borderRadius: radius.full,
      padding: 2,
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
    badgesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
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
