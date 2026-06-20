import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { radius, spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';

import { PressableScale } from './PressableScale';

interface Props {
  children: ReactNode;
  onPress?: () => void;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  bordered?: boolean;
}

export function Card({ children, onPress, padded = true, bordered = true, style }: Props) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
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

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    base: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      overflow: 'hidden',
      shadowColor: c.border,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.5,
      shadowRadius: 4,
      elevation: 2,
    },
    padded: { padding: spacing.lg },
    bordered: { borderWidth: 1, borderColor: c.border },
  });
}
