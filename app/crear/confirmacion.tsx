import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useEffect } from 'react';
import { ActivityIndicator, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useMatch } from '@/hooks/useMatches';
import { useColors } from '@/hooks/useColors';
import { formatMatchTime, formatPrice, labelModality, labelSport } from '@/lib/format';
import type { ColorPalette } from '@/theme/palettes';
import { radius, spacing } from '@/theme';
import type { Sport } from '@/types/domain';

const SPORT_EMOJI: Record<Sport, string> = {
  futbol: '⚽', basket: '🏀', tenis: '🎾', padel: '🏓', beachTennis: '🏖️',
};

// ─── Confetti system ─────────────────────────────────────────────────────────

const CONFETTI_COLORS = [
  '#7BFF00', '#FFD700', '#FF4D4D', '#00BFFF', '#FF69B4', '#FF8C00', '#B04FFF', '#ADFF2F',
];

interface ParticleSpec {
  color: string;
  w: number;
  h: number;
  startX: number;
  startY: number;
  vx: number;
  vy: number; // initial upward velocity (negative = up in screen coords)
  rotSpeed: number; // full rotations per unit progress
  rotXSpeed: number;
  delay: number; // 0–0.35 stagger
}

function generateParticles(count: number, screenWidth: number): ParticleSpec[] {
  // Seeded pseudo-random for deterministic layout
  let seed = 42;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    return ((seed >>> 16) & 0xffff) / 0xffff;
  };

  return Array.from({ length: count }, () => {
    const color = CONFETTI_COLORS[Math.floor(rand() * CONFETTI_COLORS.length)];
    const isRibbon = rand() > 0.5;
    const w = isRibbon ? 4 + rand() * 4 : 6 + rand() * 6;
    const h = isRibbon ? 12 + rand() * 10 : w;
    return {
      color,
      w,
      h,
      startX: screenWidth * 0.15 + rand() * screenWidth * 0.7,
      startY: 0,
      vx: (rand() - 0.5) * screenWidth * 0.8,
      vy: -(400 + rand() * 500), // strong upward burst
      rotSpeed: (rand() > 0.5 ? 1 : -1) * (1 + rand() * 3),
      rotXSpeed: (rand() > 0.5 ? 1 : -1) * (0.5 + rand() * 2),
      delay: rand() * 0.35,
    };
  });
}

function ParticleView({
  spec,
  progress,
}: {
  spec: ParticleSpec;
  progress: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const raw = progress.value;
    if (raw <= spec.delay) return { opacity: 0 };
    // Normalized 0→1 after delay
    const t = Math.min((raw - spec.delay) / (1 - spec.delay), 1);
    const g = 1400; // gravity px/unit²
    const x = spec.startX + spec.vx * t;
    const y = spec.startY + spec.vy * t + g * t * t;
    const rotZ = spec.rotSpeed * t * 360;
    const rotX = spec.rotXSpeed * t * 360;
    const opacity = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
    return {
      opacity: Math.max(0, opacity),
      transform: [
        { translateX: x },
        { translateY: y },
        { perspective: 600 },
        { rotateZ: `${rotZ}deg` },
        { rotateX: `${rotX}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          width: spec.w,
          height: spec.h,
          backgroundColor: spec.color,
          borderRadius: spec.w < 7 && spec.w === spec.h ? spec.w / 2 : 2,
        },
        style,
      ]}
      pointerEvents="none"
    />
  );
}

function Confetti({ screenWidth }: { screenWidth: number }) {
  const particles = useMemo(() => generateParticles(90, screenWidth), [screenWidth]);
  const progress = useSharedValue(0);

  useEffect(() => {
    // Burst then repeat twice with reduced intensity (only first burst matters visually)
    progress.value = 0;
    progress.value = withTiming(1, { duration: 3800, easing: Easing.out(Easing.quad) });
    return () => cancelAnimation(progress);
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((spec, i) => (
        <ParticleView key={i} spec={spec} progress={progress} />
      ))}
    </View>
  );
}

// ─── Check icon (animated) ────────────────────────────────────────────────────

function AnimatedCheck({ color }: { color: string }) {
  const scale = useSharedValue(0);
  const rotate = useSharedValue(-30);

  useEffect(() => {
    scale.value = withDelay(
      200,
      withSpring(1, { damping: 12, stiffness: 200, mass: 0.8 }),
    );
    rotate.value = withDelay(
      200,
      withSpring(0, { damping: 14, stiffness: 180 }),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  return (
    <Animated.View style={style}>
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: `${color}20`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 44, lineHeight: 52 }}>✓</Text>
      </View>
    </Animated.View>
  );
}

// ─── Pulse ring ───────────────────────────────────────────────────────────────

function PulseRing({ color }: { color: string }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(1.8, { duration: 900, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 0 }),
        ),
        -1,
        false,
      ),
    );
    opacity.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(0, { duration: 900, easing: Easing.out(Easing.ease) }),
          withTiming(0.6, { duration: 0 }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 80,
          height: 80,
          borderRadius: 40,
          borderWidth: 2,
          borderColor: color,
        },
        style,
      ]}
      pointerEvents="none"
    />
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ConfirmacionScreen() {
  const router = useRouter();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { data: match, isLoading } = useMatch(matchId);
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const { width: screenWidth } = useWindowDimensions();

  // 3D flip reveal when match data arrives
  const cardFlip = useSharedValue(90);
  useEffect(() => {
    if (match) {
      cardFlip.value = withSpring(0, { damping: 14, stiffness: 120, mass: 0.9 });
    }
  }, [match]);
  const cardFlipStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 900 }, { rotateY: `${cardFlip.value}deg` }],
  }));

  return (
    <Screen>
      {/* 3D Confetti overlay */}
      <Confetti screenWidth={screenWidth} />

      <View style={s.wrap}>
        {/* Animated check */}
        <View style={s.iconWrap}>
          <PulseRing color={c.primary} />
          <AnimatedCheck color={c.primary} />
        </View>

        <Text variant="h1" color="textPrimary" style={s.center}>
          ¡Tu partida ha sido creada!
        </Text>
        <Text variant="body" color="textSecondary" style={s.center}>
          Ahora los jugadores podrán unirse.
        </Text>

        {isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xl }} />
        ) : match ? (
          <Animated.View style={[{ width: '100%' }, cardFlipStyle]}>
            <Card style={s.summary}>
              <View style={s.row}>
                <Text style={s.emoji}>{SPORT_EMOJI[match.sport]}</Text>
                <Text variant="bodySemibold">
                  {labelSport(match.sport)} · {labelModality(match.modality)}
                </Text>
                <Text variant="small" color="textSecondary" style={{ textTransform: 'capitalize' }}>
                  {match.type}
                </Text>
              </View>
              <View style={s.divider} />
              <Text variant="small" color="textSecondary">
                {match.location.name} · {formatMatchTime(match.startsAt)}
              </Text>
              <Text variant="bodySemibold" color="primary">
                {formatPrice(match.pricePerHour, match.currency)} · {match.durationMin} min
              </Text>
            </Card>
          </Animated.View>
        ) : null}
      </View>

      <View style={s.footer}>
        <Button
          label="Ver mi partida"
          onPress={() =>
            match
              ? router.replace(`/match/${match.id}`)
              : router.replace('/(tabs)/mis-partidas')
          }
        />
        <Button
          label="Ir al inicio"
          variant="secondary"
          onPress={() => router.replace('/(tabs)')}
        />
      </View>
    </Screen>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    wrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xxl,
      gap: spacing.md,
    },
    iconWrap: {
      width: 120,
      height: 120,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    center: { textAlign: 'center' },
    summary: { width: '100%', marginTop: spacing.xl, gap: spacing.sm },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    emoji: { fontSize: 22, lineHeight: 28, width: 28, textAlign: 'center' },
    divider: { height: 1, backgroundColor: c.border, marginVertical: spacing.sm },
    footer: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
  });
}
