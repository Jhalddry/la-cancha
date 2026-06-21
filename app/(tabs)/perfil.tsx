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
import { Divider } from '@/components/ui/Divider';
import { IconCircle } from '@/components/ui/IconCircle';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useColors } from '@/hooks/useColors';
import { useProfile, useRequestVerification } from '@/hooks/useProfiles';
import { useSession } from '@/store/session';
import { radius, spacing } from '@/theme';
import { darkPalette } from '@/theme/palettes';
import type { ColorPalette } from '@/theme/palettes';
import type { SkillLevel, Sport } from '@/types/domain';

const VERIFIED_BLUE = '#1D9BF0';

const LEVEL_COLOR: Record<SkillLevel, string> = {
  1: '#FF3B30', 2: '#FF6B00', 3: '#FF9500', 4: '#ADDE2F', 5: '#7BFF00',
};
const LEVEL_LABEL: Record<SkillLevel, string> = {
  1: 'Principiante', 2: 'Básico', 3: 'Intermedio', 4: 'Avanzado', 5: 'Elite',
};

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
  const c = useColors();
  const isDark = c.bg === darkPalette.bg;
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
      <View style={[metallicBadgeStyle.outer, { borderColor: isDark ? `${color}55` : `${color}99` }]}>
        <LinearGradient
          colors={isDark ? [`${color}30`, `${color}14`] : [`${color}55`, `${color}28`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={metallicBadgeStyle.gradient}
        >
          <Animated.View style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderRadius: 999 }]} pointerEvents="none">
            <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, width: 80 }, shimStyle]}>
              <LinearGradient
                colors={['transparent', isDark ? `${color}55` : `${color}88`, 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flex: 1 }}
              />
            </Animated.View>
          </Animated.View>
          {icon(16)}
          <Text style={{ fontSize: 13, fontWeight: '600', color }}>{label}</Text>
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
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 9,
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

const SPORT_CONFIG: Record<Sport, { color: string; lightColor: string; emoji: string; label: string }> = {
  futbol:      { color: '#4ade80', lightColor: '#15803d', emoji: '⚽', label: 'Fútbol' },
  basket:      { color: '#fb923c', lightColor: '#c2410c', emoji: '🏀', label: 'Basket' },
  tenis:       { color: '#38bdf8', lightColor: '#0369a1', emoji: '🎾', label: 'Tenis' },
  padel:       { color: '#a78bfa', lightColor: '#6d28d9', emoji: '🏓', label: 'Pádel' },
  beachTennis: { color: '#fbbf24', lightColor: '#b45309', emoji: '🏖️', label: 'Beach Tennis' },
};

export default function PerfilScreen() {
  const router = useRouter();
  const u = useSession((s) => s.user);
  const signOut = useSession((s) => s.signOut);
  const c = useColors();
  const isDark = c.bg === darkPalette.bg;
  const s = useMemo(() => makeStyles(c), [c]);
  const [verifySheetOpen, setVerifySheetOpen] = useState(false);
  const [verifyDoneOpen, setVerifyDoneOpen] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null);
  const [verifiedTooltipOpen, setVerifiedTooltipOpen] = useState(false);
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
        <View style={s.hero}>
          <View style={{ alignSelf: 'center', position: 'relative' }}>
            <Avatar name={u.name} uri={u.avatarUrl} size={100} />
            {u.verified ? (
              <PressableScale onPress={() => setVerifiedTooltipOpen(true)} scaleTo={0.9} style={s.avatarVerifiedBadge}>
                <SealCheck size={22} color={VERIFIED_BLUE} weight="fill" />
              </PressableScale>
            ) : null}
          </View>

          <View style={{ alignItems: 'center', gap: spacing.xs }}>
            <Text variant="h2">{u.name}</Text>
            {u.username ? (
              <Text variant="small" color="textSecondary">@{u.username}</Text>
            ) : null}
          </View>

          <PressableScale
            onPress={() => router.push('/perfil/editar')}
            style={s.editBtn}
            scaleTo={0.95}
          >
            <PencilSimple size={14} color={c.textSecondary} weight="regular" />
            <Text variant="small" color="textSecondary">Editar perfil</Text>
          </PressableScale>
        </View>

        {ownBadges.length > 0 ? (
          <View style={s.badgesWrap}>
            {ownBadges.map((b) => (
              <MetallicBadge key={b} label={b} onPress={() => setSelectedBadge(b)} />
            ))}
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

        {u.sports.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            <Text variant="caption" color="textSecondary">Mis deportes</Text>
            <View style={{ gap: spacing.sm }}>
              {u.sports.map((sp) => {
                const cfg = SPORT_CONFIG[sp];
                const lvl = u.sportLevels?.[sp];
                return (
                  <LinearGradient
                    key={sp}
                    colors={isDark ? [`${cfg.color}22`, `${cfg.color}08`] : [`${cfg.color}44`, `${cfg.color}18`]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[s.sportCard, { borderColor: isDark ? c.border : `${cfg.color}66`, shadowColor: cfg.color }]}
                  >
                    <Text style={s.sportCardEmoji}>{cfg.emoji}</Text>
                    <Text variant="bodyMedium" style={{ color: isDark ? cfg.color : cfg.lightColor, flex: 1 }}>{cfg.label}</Text>
                    {lvl ? (
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <View style={{ flexDirection: 'row', gap: 5 }}>
                          {([1, 2, 3, 4, 5] as const).map((n) => (
                            <View key={n} style={{
                              width: 9, height: 9, borderRadius: 4.5,
                              backgroundColor: n <= lvl
                                ? LEVEL_COLOR[lvl as SkillLevel]
                                : `${LEVEL_COLOR[lvl as SkillLevel]}${isDark ? '28' : '50'}`,
                            }} />
                          ))}
                        </View>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: LEVEL_COLOR[lvl as SkillLevel] }}>
                          {LEVEL_LABEL[lvl as SkillLevel]}
                        </Text>
                      </View>
                    ) : null}
                  </LinearGradient>
                );
              })}
            </View>
          </View>
        ) : null}

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

      <Sheet visible={verifiedTooltipOpen} onClose={() => setVerifiedTooltipOpen(false)}>
        <View style={{ alignItems: 'center', gap: spacing.md, paddingBottom: spacing.md }}>
          <View style={{
            width: 72, height: 72, borderRadius: 36,
            backgroundColor: `${VERIFIED_BLUE}18`,
            borderWidth: 1.5, borderColor: `${VERIFIED_BLUE}50`,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <SealCheck size={40} color={VERIFIED_BLUE} weight="fill" />
          </View>
          <Text variant="h3" color="textPrimary">Jugador verificado</Text>
          <Text variant="body" color="textSecondary" style={{ textAlign: 'center', lineHeight: 22 }}>
            Este jugador fue revisado y confirmado por el equipo de La Cancha. Perfil auténtico, historial confiable.
          </Text>
          <Button label="Entendido" onPress={() => setVerifiedTooltipOpen(false)} />
        </View>
      </Sheet>

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
    hero: {
      alignItems: 'center',
      gap: spacing.lg,
      paddingTop: spacing.sm,
    },
    editBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    verifiedChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
      backgroundColor: `${VERIFIED_BLUE}18`,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: `${VERIFIED_BLUE}40`,
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
    sportCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radius.lg,
      borderWidth: 1,
      overflow: 'hidden',
      paddingVertical: spacing.md,
      paddingRight: spacing.lg,
      gap: spacing.md,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 4,
    },
    sportCardBar: { width: 4, alignSelf: 'stretch' },
    sportCardEmoji: { fontSize: 22, lineHeight: 28, paddingLeft: spacing.md },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
    badgesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
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
