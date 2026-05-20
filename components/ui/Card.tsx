import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { PressableScale } from './PressableScale';

interface Props {
  children: ReactNode;
  onPress?: () => void;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  bordered?: boolean;
}

export function Card({ children, onPress, padded = true, bordered = true, style }: Props) {
  const composed: StyleProp<ViewStyle> = [
    styles.base,
    padded && styles.padded,
    bordered && styles.bordered,
    style,
  ];
  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={composed} scaleTo={0.985}>
        {children}
      </PressableScale>
    );
  }
  return <View style={composed}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  padded: { padding: spacing.lg },
  bordered: { borderWidth: 1, borderColor: colors.border },
});
