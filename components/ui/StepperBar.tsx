import { Fragment, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { radius, spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';

import { Text } from './Text';

interface Props {
  total: number;
  current: number;
}

const SIZE = 26;

export function StepperBar({ total, current }: Props) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === current;
        const isDone = stepNum < current;
        const dotStyle = isActive ? styles.dotActive : isDone ? styles.dotDone : styles.dotPending;
        const txtColor = isActive || isDone ? 'bg' : 'textTertiary';
        return (
          <Fragment key={i}>
            <View style={[styles.dot, dotStyle]}>
              <Text variant="caption" color={txtColor}>
                {stepNum}
              </Text>
            </View>
            {i < total - 1 ? (
              <View
                style={[
                  styles.line,
                  isDone ? styles.lineDone : styles.linePending,
                ]}
              />
            ) : null}
          </Fragment>
        );
      })}
    </View>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    dot: {
      width: SIZE,
      height: SIZE,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    dotActive: { backgroundColor: c.primary },
    dotDone: { backgroundColor: c.primaryDim },
    dotPending: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    line: {
      flex: 1,
      height: 2,
      borderRadius: 1,
      minWidth: 12,
    },
    lineDone: { backgroundColor: c.primaryDim },
    linePending: { backgroundColor: c.border },
  });
}
