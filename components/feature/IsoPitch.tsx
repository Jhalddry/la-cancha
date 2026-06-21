import { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';

import { useColors } from '@/hooks/useColors';

interface IsoPitchProps {
  size?: number;
  color?: string;
  animate?: boolean;
  opacity?: number;
}

export function IsoPitch({ size = 260, color, animate = true, opacity = 1 }: IsoPitchProps) {
  const c = useColors();
  const accent = color ?? c.primary;
  const h = Math.round(size * 0.66);

  const ty = useSharedValue(0);
  const tx = useSharedValue(0);
  const rot = useSharedValue(0);

  useEffect(() => {
    if (!animate) return;
    ty.value = withRepeat(
      withSequence(
        withTiming(-7, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    tx.value = withRepeat(
      withSequence(
        withTiming(3, { duration: 3500, easing: Easing.inOut(Easing.sin) }),
        withTiming(-3, { duration: 3500, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    rot.value = withRepeat(
      withSequence(
        withTiming(1.5, { duration: 4200, easing: Easing.inOut(Easing.sin) }),
        withTiming(-1.5, { duration: 4200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(ty);
      cancelAnimation(tx);
      cancelAnimation(rot);
    };
  }, [animate, ty, tx, rot]);

  const aStyle = useAnimatedStyle(() => ({
    opacity,
    transform: [
      { translateY: ty.value },
      { translateX: tx.value },
      { rotate: `${rot.value}deg` },
    ],
  }));

  return (
    <Animated.View style={aStyle}>
      <Svg width={size} height={h} viewBox="0 0 320 212">
        {/* Ground glow */}
        <Ellipse cx={160} cy={202} rx={88} ry={9} fill={accent} opacity={0.22} />

        {/* Isometric transform: scale Y → perspective illusion */}
        <G transform="translate(160, 98) rotate(-5) scale(1, 0.54)">
          {/* Field fill */}
          <Rect x={-138} y={-92} width={276} height={184} rx={8}
            fill={`${accent}10`} stroke={accent} strokeWidth={2.5} />

          {/* Halfway line */}
          <Line x1={0} y1={-92} x2={0} y2={92}
            stroke={accent} strokeWidth={1.5} opacity={0.55} />

          {/* Center circle — smaller so it doesn't dominate */}
          <Circle cx={0} cy={0} r={24}
            fill="none" stroke={accent} strokeWidth={1.5} opacity={0.55} />

          {/* Center dot */}
          <Circle cx={0} cy={0} r={3.5} fill={accent} opacity={0.85} />

          {/* Left penalty area — correct football proportions */}
          <Rect x={-138} y={-40} width={42} height={80} rx={2}
            fill="none" stroke={accent} strokeWidth={1.5} opacity={0.50} />

          {/* Right penalty area */}
          <Rect x={96} y={-40} width={42} height={80} rx={2}
            fill="none" stroke={accent} strokeWidth={1.5} opacity={0.50} />

          {/* Left 6-yard box */}
          <Rect x={-138} y={-17} width={16} height={34} rx={1}
            fill="none" stroke={accent} strokeWidth={1.5} opacity={0.32} />

          {/* Right 6-yard box */}
          <Rect x={122} y={-17} width={16} height={34} rx={1}
            fill="none" stroke={accent} strokeWidth={1.5} opacity={0.32} />

          {/* Penalty spots (dots only, no arcs — arcs caused basketball look) */}
          <Circle cx={-98} cy={0} r={3.5} fill={accent} opacity={0.70} />
          <Circle cx={98} cy={0} r={3.5} fill={accent} opacity={0.70} />

          {/* Corner arcs */}
          <Path d="M -138 -83 A 9 9 0 0 1 -129 -92"
            fill="none" stroke={accent} strokeWidth={1.5} opacity={0.40} />
          <Path d="M 129 -92 A 9 9 0 0 1 138 -83"
            fill="none" stroke={accent} strokeWidth={1.5} opacity={0.40} />
          <Path d="M -138 83 A 9 9 0 0 0 -129 92"
            fill="none" stroke={accent} strokeWidth={1.5} opacity={0.40} />
          <Path d="M 129 92 A 9 9 0 0 0 138 83"
            fill="none" stroke={accent} strokeWidth={1.5} opacity={0.40} />
        </G>
      </Svg>
    </Animated.View>
  );
}
