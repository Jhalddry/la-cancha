import { useEffect } from 'react';
import { Text as RNText, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface Props {
  emoji: string;
  color: string;
  size?: number;
  speed?: number; // radians per frame at 60fps
}

export function SportBall3D({ emoji, color, size = 44, speed = 0.022 }: Props) {
  // Drives the 3D-perspective-spin illusion via scaleX oscillation
  const phase = useSharedValue(0);

  useEffect(() => {
    const durationMs = Math.round((2 * Math.PI / speed) * (1000 / 60));
    phase.value = withRepeat(
      withTiming(2 * Math.PI, { duration: durationMs, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(phase);
  }, [phase, speed]);

  // |cos| oscillates 1→0→1: full width → edge-on → full width  → looks like 3D spin
  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: Math.abs(Math.cos(phase.value)) * 0.45 + 0.55 }],
  }));

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color + '28',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View style={spinStyle}>
        <RNText
          style={{ fontSize: size * 0.72, lineHeight: size * 0.86, textAlign: 'center' }}
        >
          {emoji}
        </RNText>
      </Animated.View>
    </View>
  );
}
