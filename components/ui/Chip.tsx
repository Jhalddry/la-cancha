import { useMemo, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { radius, spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';

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
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const palette = makePalettes(c)[tone];
  const bg = selected ? palette.selectedBg : c.surfaceElevated;
  const border = selected ? palette.selectedBorder : c.border;
  const color: keyof ColorPalette = selected ? palette.selectedText : 'textPrimary';

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

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
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
}

function makePalettes(c: ColorPalette) {
  return {
    default: {
      selectedBg: c.primarySoft,
      selectedBorder: c.primary,
      selectedText: 'primary' as const,
    },
    primary: {
      selectedBg: c.primarySoft,
      selectedBorder: c.primary,
      selectedText: 'primary' as const,
    },
    accent: {
      selectedBg: c.accentSoft,
      selectedBorder: c.accent,
      selectedText: 'accent' as const,
    },
    alert: {
      selectedBg: c.alertSoft,
      selectedBorder: c.alert,
      selectedText: 'alert' as const,
    },
  };
}
