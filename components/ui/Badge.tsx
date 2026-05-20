import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { Text } from './Text';

type Tone = 'primary' | 'accent' | 'alert' | 'neutral';

interface Props {
  label: string;
  tone?: Tone;
}

const palette: Record<Tone, { bg: string; border: string; text: keyof typeof colors }> = {
  primary: { bg: colors.primarySoft, border: colors.primary, text: 'primary' },
  accent: { bg: colors.accentSoft, border: colors.accent, text: 'accent' },
  alert: { bg: colors.alertSoft, border: colors.alert, text: 'alert' },
  neutral: { bg: colors.surfaceElevated, border: colors.border, text: 'textSecondary' },
};

export function Badge({ label, tone = 'neutral' }: Props) {
  const p = palette[tone];
  return (
    <View style={[styles.base, { backgroundColor: p.bg, borderColor: p.border }]}>
      <Text variant="caption" color={p.text}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
});
