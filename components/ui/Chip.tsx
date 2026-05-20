import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  leading?: ReactNode;
  tone?: 'default' | 'primary' | 'accent' | 'alert';
  style?: StyleProp<ViewStyle>;
}

export function Chip({ label, selected, onPress, leading, tone = 'default', style }: Props) {
  const palette = palettes[tone];
  const bg = selected ? palette.selectedBg : colors.surfaceElevated;
  const border = selected ? palette.selectedBorder : colors.border;
  const color: keyof typeof colors = selected ? palette.selectedText : 'textPrimary';

  const content = (
    <View style={styles.row}>
      {leading}
      <Text variant="smallMedium" color={color} numberOfLines={1} style={styles.label}>
        {label}
      </Text>
    </View>
  );

  const baseStyle: ViewStyle = {
    ...styles.base,
    backgroundColor: bg,
    borderColor: border,
  };

  if (onPress) {
    return (
      <PressableScale onPress={onPress} scaleTo={0.94} style={[baseStyle, style]}>
        {content}
      </PressableScale>
    );
  }
  return <View style={[baseStyle, style]}>{content}</View>;
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    minHeight: 38,
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
    flexShrink: 0,
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 0 },
  label: { flexShrink: 0, lineHeight: 20 },
});

const palettes = {
  default: {
    selectedBg: colors.primarySoft,
    selectedBorder: colors.primary,
    selectedText: 'primary' as const,
  },
  primary: {
    selectedBg: colors.primarySoft,
    selectedBorder: colors.primary,
    selectedText: 'primary' as const,
  },
  accent: {
    selectedBg: colors.accentSoft,
    selectedBorder: colors.accent,
    selectedText: 'accent' as const,
  },
  alert: {
    selectedBg: colors.alertSoft,
    selectedBorder: colors.alert,
    selectedText: 'alert' as const,
  },
};
