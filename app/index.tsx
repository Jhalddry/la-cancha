import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';

import { Text } from '@/components/ui/Text';
import { useColors } from '@/hooks/useColors';
import { useSession } from '@/store/session';
import { spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 220;
const RADIUS = 70;
const CENTER = 100;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const STROKE_WIDTH = 10;

export default function SplashRoute() {
  const router = useRouter();
  const isAuthed = useSession((s) => s.isAuthed);
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const dotScale       = useSharedValue(0);
  const dotOpacity     = useSharedValue(0);
  const circleProgress = useSharedValue(CIRCUMFERENCE);
  const armScale       = useSharedValue(0);
  const wordmarkOpacity = useSharedValue(0);
  const wordmarkY      = useSharedValue(16);
  const wordmarkScale  = useSharedValue(0.86);
  const glowOpacity    = useSharedValue(0);
  const glowScale      = useSharedValue(1);
  const logoRotate     = useSharedValue(0);

  useEffect(() => {
    // 1. Dot materializes
    dotOpacity.value = withTiming(1, { duration: 250 });
    dotScale.value   = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });

    // 2. Circle draws
    circleProgress.value = withDelay(
      450,
      withTiming(0, { duration: 700, easing: Easing.inOut(Easing.cubic) }),
    );

    // 3. Arms spring in with slight overshoot
    armScale.value = withDelay(1100, withSpring(1, { damping: 10, stiffness: 120 }));

    // 4. Micro-wobble after arms land
    logoRotate.value = withDelay(
      1360,
      withSequence(
        withTiming(-3,  { duration: 80 }),
        withTiming(3,   { duration: 100 }),
        withTiming(-1,  { duration: 80 }),
        withTiming(0,   { duration: 80 }),
      ),
    );

    // 5. Wordmark slides + springs in
    wordmarkOpacity.value = withDelay(1460, withTiming(1, { duration: 320 }));
    wordmarkY.value       = withDelay(1460, withTiming(0, { duration: 480, easing: Easing.out(Easing.cubic) }));
    wordmarkScale.value   = withDelay(1460, withSpring(1, { damping: 14, stiffness: 100 }));

    // 6. Glow triple-pulse
    glowOpacity.value = withDelay(
      1760,
      withSequence(
        withTiming(1,    { duration: 220 }),
        withTiming(0.4,  { duration: 200 }),
        withTiming(0.85, { duration: 180 }),
        withTiming(0.25, { duration: 180 }),
        withTiming(0.55, { duration: 140 }),
        withTiming(0,    { duration: 400 }),
      ),
    );
    glowScale.value = withDelay(
      1760,
      withSequence(
        withTiming(1.18, { duration: 220 }),
        withTiming(1,    { duration: 200 }),
        withTiming(1.10, { duration: 180 }),
        withTiming(1,    { duration: 180 }),
        withTiming(1.06, { duration: 140 }),
        withTiming(1,    { duration: 400 }),
      ),
    );

    const t = setTimeout(() => {
      router.replace(isAuthed ? '/(tabs)' : '/login');
    }, 2700);
    return () => clearTimeout(t);
  }, [
    armScale, circleProgress, dotOpacity, dotScale, glowOpacity, glowScale,
    isAuthed, logoRotate, router, wordmarkOpacity, wordmarkScale, wordmarkY,
  ]);

  const dotAnimatedProps = useAnimatedProps(() => ({
    r: 5 + dotScale.value * 2,
    opacity: dotOpacity.value,
  }));

  const circleAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circleProgress.value,
  }));

  const armStyle = useAnimatedStyle(() => ({
    opacity: armScale.value > 0 ? 1 : 0,
    transform: [
      { scale: 0.6 + armScale.value * 0.4 },
      { rotate: `${logoRotate.value}deg` },
    ],
  }));

  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmarkOpacity.value,
    transform: [
      { translateY: wordmarkY.value },
      { scale: wordmarkScale.value },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value * 0.65,
    transform: [{ scale: glowScale.value }],
  }));

  return (
    <View style={s.root}>
      <View style={s.center}>
        <View style={s.svgWrap}>
          <Animated.View style={[StyleSheet.absoluteFill, s.glow, glowStyle]} />
          <Svg width={SIZE} height={SIZE} viewBox="0 0 200 200">
            <AnimatedCircle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              stroke={c.primary}
              strokeWidth={STROKE_WIDTH}
              fill="none"
              strokeDasharray={CIRCUMFERENCE}
              animatedProps={circleAnimatedProps}
              strokeLinecap="round"
              transform={`rotate(-90 ${CENTER} ${CENTER})`}
            />
            <AnimatedCircle
              cx={CENTER}
              cy={CENTER}
              fill={c.primary}
              animatedProps={dotAnimatedProps}
            />
          </Svg>
          <Animated.View style={[StyleSheet.absoluteFill, s.arms, armStyle]}>
            <Svg width={SIZE} height={SIZE} viewBox="0 0 200 200">
              <Line x1={4}   y1={CENTER} x2={28}  y2={CENTER} stroke={c.primary} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
              <Line x1={172} y1={CENTER} x2={196} y2={CENTER} stroke={c.primary} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
              <Line x1={CENTER} y1={4}   x2={CENTER} y2={28}  stroke={c.primary} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
              <Line x1={CENTER} y1={172} x2={CENTER} y2={196} stroke={c.primary} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
              <Circle cx={CENTER} cy={CENTER} r={11} stroke={c.primary} strokeWidth={STROKE_WIDTH - 3} fill="none" />
            </Svg>
          </Animated.View>
        </View>

        <Animated.View style={[s.wordmark, wordmarkStyle]}>
          <Text variant="display" color="textPrimary">LA{' '}</Text>
          <Text variant="display" color="primary">CANCHA</Text>
        </Animated.View>
        <Animated.View style={wordmarkStyle}>
          <Text variant="caption" color="textSecondary" style={s.tagline}>
            Arma tu partida en segundos
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' },
    center: { alignItems: 'center', gap: spacing.xxl },
    svgWrap: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
    arms: { alignItems: 'center', justifyContent: 'center' },
    glow: {
      backgroundColor: c.primary,
      borderRadius: SIZE / 2,
      opacity: 0,
      margin: SIZE * 0.2,
    },
    wordmark: { flexDirection: 'row', alignItems: 'baseline' },
    tagline: { marginTop: spacing.xs, textAlign: 'center' },
  });
}
