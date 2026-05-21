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
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';

import { Text } from '@/components/ui/Text';
import { useColors } from '@/hooks/useColors';
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
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const dotScale = useSharedValue(0);
  const dotOpacity = useSharedValue(0);
  const circleProgress = useSharedValue(CIRCUMFERENCE);
  const armScale = useSharedValue(0);
  const wordmarkOpacity = useSharedValue(0);
  const wordmarkY = useSharedValue(12);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    dotOpacity.value = withTiming(1, { duration: 250 });
    dotScale.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });

    circleProgress.value = withDelay(
      450,
      withTiming(0, { duration: 700, easing: Easing.inOut(Easing.cubic) }),
    );

    armScale.value = withDelay(
      1100,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }),
    );

    wordmarkOpacity.value = withDelay(1400, withTiming(1, { duration: 350 }));
    wordmarkY.value = withDelay(1400, withTiming(0, { duration: 450, easing: Easing.out(Easing.cubic) }));

    glowOpacity.value = withDelay(
      1700,
      withSequence(
        withTiming(1, { duration: 300 }),
        withTiming(0.6, { duration: 300 }),
      ),
    );

    const t = setTimeout(() => {
      router.replace('/(tabs)');
    }, 2400);
    return () => clearTimeout(t);
  }, [
    armScale,
    circleProgress,
    dotOpacity,
    dotScale,
    glowOpacity,
    router,
    wordmarkOpacity,
    wordmarkY,
  ]);

  const dotAnimatedProps = useAnimatedProps(() => ({
    r: 5 + dotScale.value * 2,
    opacity: dotOpacity.value,
  }));

  const circleAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circleProgress.value,
  }));

  const armStyle = useAnimatedStyle(() => ({
    opacity: armScale.value,
    transform: [{ scale: 0.6 + armScale.value * 0.4 }],
  }));

  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmarkOpacity.value,
    transform: [{ translateY: wordmarkY.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value * 0.7,
    transform: [{ scale: 1 + glowOpacity.value * 0.15 }],
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
              <Line
                x1={4}
                y1={CENTER}
                x2={28}
                y2={CENTER}
                stroke={c.primary}
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
              />
              <Line
                x1={172}
                y1={CENTER}
                x2={196}
                y2={CENTER}
                stroke={c.primary}
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
              />
              <Line
                x1={CENTER}
                y1={4}
                x2={CENTER}
                y2={28}
                stroke={c.primary}
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
              />
              <Line
                x1={CENTER}
                y1={172}
                x2={CENTER}
                y2={196}
                stroke={c.primary}
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
              />
              <Circle
                cx={CENTER}
                cy={CENTER}
                r={11}
                stroke={c.primary}
                strokeWidth={STROKE_WIDTH - 3}
                fill="none"
              />
            </Svg>
          </Animated.View>
        </View>

        <Animated.View style={[s.wordmark, wordmarkStyle]}>
          <Text variant="display" color="textPrimary">
            LA{' '}
          </Text>
          <Text variant="display" color="primary">
            CANCHA
          </Text>
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
