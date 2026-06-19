import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useColors } from '@/hooks/useColors';
import { radius, spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
}

export function SegmentedTabs<T extends string>({ options, value, onChange }: Props<T>) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const activeIndex = options.findIndex((o) => o.value === value);
  const [containerWidth, setContainerWidth] = useState(0);

  const segWidth = containerWidth > 0 ? (containerWidth - 8) / options.length : 0;
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (segWidth > 0) {
      translateX.value = withSpring(activeIndex * segWidth, { damping: 22, stiffness: 280, mass: 0.8 });
    }
  }, [activeIndex, segWidth, translateX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      style={styles.wrap}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {segWidth > 0 ? (
        <Animated.View
          style={[styles.indicator, { width: segWidth }, indicatorStyle]}
          pointerEvents="none"
        />
      ) : null}
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <PressableScale
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={styles.item}
            scaleTo={0.96}
          >
            <Text variant="smallMedium" color={active ? 'bg' : 'textSecondary'}>
              {opt.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderRadius: radius.full,
      padding: 4,
      borderWidth: 1,
      borderColor: c.border,
      position: 'relative',
    },
    indicator: {
      position: 'absolute',
      top: 4,
      left: 4,
      bottom: 4,
      borderRadius: radius.full,
      backgroundColor: c.primary,
      zIndex: 0,
    },
    item: {
      flex: 1,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
    },
  });
}
