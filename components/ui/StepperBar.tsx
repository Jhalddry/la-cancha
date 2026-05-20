import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { Text } from './Text';

interface Props {
  total: number;
  current: number;
}

export function StepperBar({ total, current }: Props) {
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

const SIZE = 26;

const styles = StyleSheet.create({
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
  dotActive: { backgroundColor: colors.primary },
  dotDone: { backgroundColor: colors.primaryDim },
  dotPending: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  line: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    minWidth: 12,
  },
  lineDone: { backgroundColor: colors.primaryDim },
  linePending: { backgroundColor: colors.border },
});
