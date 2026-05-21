import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';

interface Props {
  total: number;
  current: number;
}

export function ProgressDots({ total, current }: Props) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, i) => {
        const active = i === current;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              active ? styles.active : null,
            ]}
          />
        );
      })}
    </View>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.border,
    },
    active: {
      width: 22,
      backgroundColor: c.primary,
    },
  });
}
