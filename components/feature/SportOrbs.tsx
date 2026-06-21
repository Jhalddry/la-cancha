import { useCallback, useEffect, useRef, useState } from 'react';
import { Text as RNText, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

// ── Layout constants (unscaled) ───────────────────────────────────────────────

const BASE_H = 168;
const BASE_W = 130;
const BALL_D = 54;
const TRAVEL = 92;
const GROUND = TRAVEL + BALL_D;

const SHADOW_W = 48;
const SHADOW_H = 11;
const RING_W   = 64;
const RING_H   = 22;
const GLOW_W   = 92;
const GLOW_H   = 18;

// ── Bounce cycle (total = 1200ms) ─────────────────────────────────────────────

const T_DROP  = 400;
const T_HOLD  = 60;
const T_RISE  = 560;
const T_PAUSE = 180;
const CYCLE   = T_DROP + T_HOLD + T_RISE + T_PAUSE;

const T_RING = 420;
const T_REST = T_HOLD + T_RISE + T_PAUSE - T_RING;

const FADE_OUT = 100;
const FADE_IN  = 150;

// ── Sports ────────────────────────────────────────────────────────────────────

const SPORTS = [
  { color: '#4ade80', emoji: '⚽' },
  { color: '#fb923c', emoji: '🏀' },
  { color: '#38bdf8', emoji: '🎾' },
  { color: '#fbbf24', emoji: '🏖️' },
  { color: '#a78bfa', emoji: '🏓' },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────

export function SportOrbs({ size = BASE_H }: { size?: number }) {
  const [sportIdx, setSportIdx] = useState(0);
  const sport = SPORTS[sportIdx];

  const y      = useSharedValue(0);
  const scX    = useSharedValue(1);
  const scY    = useSharedValue(1);
  const shScX  = useSharedValue(0.35);
  const shOp   = useSharedValue(0.1);
  const rScale = useSharedValue(1);
  const rOp    = useSharedValue(0);
  const rot    = useSharedValue(0);
  const ballOp = useSharedValue(1);

  const sc      = size / BASE_H;
  const travelY = TRAVEL * sc;

  // Sport index tracked in ref so the worklet callback can read it
  const idxRef = useRef(0);

  // Called from UI thread via runOnJS after fade-out completes
  const onFadedOut = useCallback(() => {
    idxRef.current = (idxRef.current + 1) % SPORTS.length;
    setSportIdx(idxRef.current);
    ballOp.value = withTiming(1, { duration: FADE_IN, easing: Easing.out(Easing.quad) });
  }, [ballOp]);


  // Trail — visible during fast fall
  const trailOp = useDerivedValue(() =>
    Math.max(0, y.value / travelY - 0.15) * 0.22,
  );

  const trail1Style = useAnimatedStyle(() => ({
    opacity: trailOp.value * 0.75,
    transform: [{ translateY: Math.max(0, y.value - 16 * sc) }],
  }));

  const trail2Style = useAnimatedStyle(() => ({
    opacity: trailOp.value * 0.35,
    transform: [{ translateY: Math.max(0, y.value - 34 * sc) }],
  }));

  // Sport transition: fade out → swap → fade in
  useEffect(() => {
    const id = setInterval(() => {
      ballOp.value = withTiming(0, { duration: FADE_OUT, easing: Easing.in(Easing.quad) }, (done) => {
        'worklet';
        if (done) runOnJS(onFadedOut)();
      });
    }, CYCLE);
    return () => clearInterval(id);
  }, [ballOp, onFadedOut]);

  // Physics
  useEffect(() => {
    const scVal = size / BASE_H;
    const tY    = TRAVEL * scVal;

    y.value = withRepeat(withSequence(
      withTiming(tY,   { duration: T_DROP,  easing: Easing.in(Easing.quad) }),
      withTiming(tY,   { duration: T_HOLD }),
      withTiming(0,    { duration: T_RISE,  easing: Easing.out(Easing.quad) }),
      withTiming(0,    { duration: T_PAUSE }),
    ), -1, false);

    scX.value = withRepeat(withSequence(
      withTiming(1.32, { duration: T_DROP,  easing: Easing.in(Easing.quad) }),
      withTiming(0.90, { duration: T_HOLD }),
      withTiming(1,    { duration: T_RISE,  easing: Easing.out(Easing.quad) }),
      withTiming(1,    { duration: T_PAUSE }),
    ), -1, false);

    scY.value = withRepeat(withSequence(
      withTiming(0.72, { duration: T_DROP,  easing: Easing.in(Easing.quad) }),
      withTiming(1.16, { duration: T_HOLD }),
      withTiming(1,    { duration: T_RISE,  easing: Easing.out(Easing.quad) }),
      withTiming(1,    { duration: T_PAUSE }),
    ), -1, false);

    shScX.value = withRepeat(withSequence(
      withTiming(1,    { duration: T_DROP,  easing: Easing.in(Easing.quad) }),
      withTiming(1,    { duration: T_HOLD }),
      withTiming(0.28, { duration: T_RISE,  easing: Easing.out(Easing.quad) }),
      withTiming(0.28, { duration: T_PAUSE }),
    ), -1, false);

    shOp.value = withRepeat(withSequence(
      withTiming(0.42, { duration: T_DROP,  easing: Easing.in(Easing.quad) }),
      withTiming(0.42, { duration: T_HOLD }),
      withTiming(0.08, { duration: T_RISE,  easing: Easing.out(Easing.quad) }),
      withTiming(0.08, { duration: T_PAUSE }),
    ), -1, false);

    rScale.value = withRepeat(withSequence(
      withTiming(1,   { duration: T_DROP }),
      withTiming(2.8, { duration: T_RING, easing: Easing.out(Easing.quad) }),
      withTiming(1,   { duration: 0 }),
      withTiming(1,   { duration: T_REST }),
    ), -1, false);

    rOp.value = withRepeat(withSequence(
      withTiming(0,    { duration: T_DROP }),
      withTiming(0.55, { duration: 0 }),
      withTiming(0,    { duration: T_RING, easing: Easing.out(Easing.quad) }),
      withTiming(0,    { duration: T_REST }),
    ), -1, false);

    rot.value = withRepeat(withSequence(
      withTiming(10,  { duration: T_DROP,  easing: Easing.in(Easing.quad) }),
      withTiming(8,   { duration: T_HOLD }),
      withTiming(-10, { duration: T_RISE,  easing: Easing.out(Easing.quad) }),
      withTiming(0,   { duration: T_PAUSE, easing: Easing.out(Easing.quad) }),
    ), -1, false);

    return () => {
      cancelAnimation(y);
      cancelAnimation(scX);
      cancelAnimation(scY);
      cancelAnimation(shScX);
      cancelAnimation(shOp);
      cancelAnimation(rScale);
      cancelAnimation(rOp);
      cancelAnimation(rot);
    };
  }, [y, scX, scY, shScX, shOp, rScale, rOp, rot, size]);

  // ── Animated styles ───────────────────────────────────────────────────────

  const ballStyle = useAnimatedStyle(() => ({
    opacity: ballOp.value,
    transform: [
      { translateY: y.value },
      { scaleX: scX.value },
      { scaleY: scY.value },
    ],
  }));

  const emojiStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot.value}deg` }],
  }));

  const shadowStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: shScX.value }],
    opacity: shOp.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: shScX.value * 1.85 }],
    opacity: shOp.value * 0.28,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rScale.value }],
    opacity: rOp.value,
  }));

  // ── Scaled dimensions ─────────────────────────────────────────────────────

  const ballD      = BALL_D   * sc;
  const shadowW    = SHADOW_W * sc;
  const shadowH    = SHADOW_H * sc;
  const ringW      = RING_W   * sc;
  const ringH      = RING_H   * sc;
  const glowW      = GLOW_W   * sc;
  const glowH      = GLOW_H   * sc;
  const groundY    = GROUND   * sc;
  const containerW = BASE_W   * sc;

  return (
    <View style={{ width: containerW, alignItems: 'center' }}>
      <View style={{ width: containerW, height: size }}>

        {/* Trail 2 */}
        <Animated.View style={[
          {
            position: 'absolute',
            left: (containerW - ballD) / 2,
            width: ballD,
            height: ballD,
            borderRadius: ballD / 2,
            backgroundColor: sport.color + '40',
          },
          trail2Style,
        ]} />

        {/* Trail 1 */}
        <Animated.View style={[
          {
            position: 'absolute',
            left: (containerW - ballD) / 2,
            width: ballD,
            height: ballD,
            borderRadius: ballD / 2,
            backgroundColor: sport.color + '60',
          },
          trail1Style,
        ]} />

        {/* Floor glow */}
        <Animated.View style={[
          {
            position: 'absolute',
            top: groundY - glowH / 2,
            left: (containerW - glowW) / 2,
            width: glowW,
            height: glowH,
            borderRadius: glowW,
            backgroundColor: sport.color,
          },
          glowStyle,
        ]} />

        {/* Impact ring */}
        <Animated.View style={[
          {
            position: 'absolute',
            top: groundY - ringH / 2,
            left: (containerW - ringW) / 2,
            width: ringW,
            height: ringH,
            borderRadius: ringW,
            borderWidth: Math.max(1.5, 2 * sc),
            borderColor: sport.color,
          },
          ringStyle,
        ]} />

        {/* Shadow */}
        <Animated.View style={[
          {
            position: 'absolute',
            top: groundY - shadowH / 2,
            left: (containerW - shadowW) / 2,
            width: shadowW,
            height: shadowH,
            borderRadius: shadowH / 2,
            backgroundColor: sport.color,
          },
          shadowStyle,
        ]} />

        {/* Ball */}
        <Animated.View style={[
          {
            position: 'absolute',
            left: (containerW - ballD) / 2,
            width: ballD,
            height: ballD,
            borderRadius: ballD / 2,
            backgroundColor: sport.color + '28',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          },
          ballStyle,
        ]}>
          <Animated.View style={emojiStyle}>
            <RNText style={{ fontSize: ballD * 0.88, lineHeight: ballD }}>
              {sport.emoji}
            </RNText>
          </Animated.View>
        </Animated.View>

      </View>
    </View>
  );
}
