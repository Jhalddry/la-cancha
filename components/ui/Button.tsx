import type { ReactNode } from 'react';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useColors } from '@/hooks/useColors';
import { radius, spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  leading,
  trailing,
  fullWidth = true,
  style,
}: Props) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const base = styles.base;
  const variantStyle = styles.variants[variant];
  const sizeStyle = styles.sizes[size];
  const labelColor: keyof ColorPalette =
    variant === 'primary' ? 'textOnPrimary' : variant === 'ghost' ? 'primary' : 'textPrimary';

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={[
        base,
        variantStyle,
        sizeStyle,
        fullWidth ? styles.full : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator color={variant === 'primary' ? c.textOnPrimary : c.primary} />
        ) : (
          <>
            {leading}
            <Text variant="button" color={labelColor}>
              {label}
            </Text>
            {trailing}
          </>
        )}
      </View>
    </PressableScale>
  );
}

function makeStyles(c: ColorPalette) {
  return {
    base: {
      borderRadius: radius.md,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    row: StyleSheet.create({
      row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
      },
    }).row,
    full: { alignSelf: 'stretch' as const },
    disabled: { opacity: 0.4 },
    variants: StyleSheet.create({
      primary: {
        backgroundColor: c.primaryBg,
        shadowColor: c.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 8,
        elevation: 5,
      },
      secondary: { backgroundColor: c.surfaceElevated, borderWidth: 1, borderColor: c.border },
      ghost: { backgroundColor: 'transparent' },
      outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: c.primary },
    }),
    sizes: StyleSheet.create({
      sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, minHeight: 36 },
      md: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl, minHeight: 48 },
      lg: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xxl, minHeight: 56 },
    }),
  };
}
