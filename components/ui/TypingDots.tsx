import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export function TypingDots({ color }: { color: string }) {
  const d1 = useSharedValue(0);
  const d2 = useSharedValue(0);
  const d3 = useSharedValue(0);

  useEffect(() => {
    const bounce = (sv: SharedValue<number>, delay: number) => {
      sv.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(-5, { duration: 280 }),
            withTiming(0, { duration: 280 }),
          ),
          -1,
          false,
        ),
      );
    };
    bounce(d1, 0);
    bounce(d2, 140);
    bounce(d3, 280);
    return () => {
      cancelAnimation(d1);
      cancelAnimation(d2);
      cancelAnimation(d3);
    };
  }, [d1, d2, d3]);

  const s1 = useAnimatedStyle(() => ({ transform: [{ translateY: d1.value }] }));
  const s2 = useAnimatedStyle(() => ({ transform: [{ translateY: d2.value }] }));
  const s3 = useAnimatedStyle(() => ({ transform: [{ translateY: d3.value }] }));

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <Animated.View style={[dot, { backgroundColor: color }, s1]} />
      <Animated.View style={[dot, { backgroundColor: color }, s2]} />
      <Animated.View style={[dot, { backgroundColor: color }, s3]} />
    </View>
  );
}

const dot = { width: 5, height: 5, borderRadius: 2.5 };
