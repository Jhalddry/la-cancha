import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

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

  return (
    <View style={styles.wrap}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <PressableScale
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.item, active && styles.active]}
            scaleTo={0.96}
          >
            <Text
              variant="smallMedium"
              color={active ? 'bg' : 'textSecondary'}
            >
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
    },
    item: {
      flex: 1,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    active: {
      backgroundColor: c.primary,
    },
  });
}
