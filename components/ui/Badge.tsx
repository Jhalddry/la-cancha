import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { radius, spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';

import { Text } from './Text';

type Tone = 'primary' | 'accent' | 'alert' | 'neutral';

interface Props {
  label: string;
  tone?: Tone;
}

function makePalette(c: ColorPalette): Record<Tone, { bg: string; border: string; text: keyof ColorPalette }> {
  return {
    primary: { bg: c.primarySoft, border: c.primary, text: 'primary' },
    accent: { bg: c.accentSoft, border: c.accent, text: 'accent' },
    alert: { bg: c.alertSoft, border: c.alert, text: 'alert' },
    neutral: { bg: c.surfaceElevated, border: c.border, text: 'textSecondary' },
  };
}

export function Badge({ label, tone = 'neutral' }: Props) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const p = makePalette(c)[tone];
  return (
    <View style={[styles.base, { backgroundColor: p.bg, borderColor: p.border }]}>
      <Text variant="caption" color={p.text}>
        {label}
      </Text>
    </View>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    base: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radius.sm,
      borderWidth: 1,
      alignSelf: 'flex-start',
    },
  });
}
