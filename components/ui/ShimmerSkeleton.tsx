import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { type DimensionValue, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useColors } from '@/hooks/useColors';

interface Props {
  width: DimensionValue;
  height: number;
  borderRadius?: number;
}

export function ShimmerSkeleton({ width, height, borderRadius = 8 }: Props) {
  const c = useColors();
  const translateX = useSharedValue(-300);

  useEffect(() => {
    translateX.value = withRepeat(withTiming(300, { duration: 1400 }), -1, false);
    return () => cancelAnimation(translateX);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={[styles.base, { width, height, borderRadius, backgroundColor: c.surface, borderColor: c.border }]}>
      <Animated.View style={[StyleSheet.absoluteFill, shimmerStyle]} pointerEvents="none">
        <LinearGradient
          colors={['transparent', `${c.textPrimary}10`, 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    borderWidth: 1,
  },
});
